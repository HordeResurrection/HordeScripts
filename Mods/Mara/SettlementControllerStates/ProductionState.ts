import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraPoint, MaraResources } from "../Utils/Common";
import { MaraResourceType, MaraResourceCluster, MaraResourceMap } from "../MaraResourceMap";
import { TargetExpandData } from "../MaraSettlementController";

export abstract class ProductionState extends MaraSettlementControllerState {
    private targetUnitsComposition: UnitComposition = new Map<string, number>();

    protected abstract getTargetUnitsComposition(): UnitComposition;
    protected abstract onTargetCompositionReached(): void;

    private timeoutTick: number | null;
    
    OnEntry(): void {
        this.settlementController.ProductionController.CancelAllProduction();
        this.targetUnitsComposition = this.getTargetUnitsComposition();
        let insufficientResources = this.getInsufficientResources();

        if (
            insufficientResources.Gold > 0 ||
            insufficientResources.Metal > 0 ||
            insufficientResources.Wood > 0 ||
            insufficientResources.People > 0
        ) {
            this.settlementController.Debug(`Not enough resources to produce target composition`);
            if (!this.onInsufficientResources(insufficientResources)) {
                return;
            }
        }

        this.refreshTargetProductionLists();
        this.timeoutTick = null;
    }

    OnExit(): void {
        //do nothing
    }

    Tick(tickNumber: number): void {
        let timeout = this.getProductionTimeout();
        
        if (timeout != null) {
            if (this.timeoutTick == null) {
                this.settlementController.Debug(`Set production timeout to ${timeout} ticks`);
                this.timeoutTick = tickNumber + timeout;
            }
            else if (tickNumber > this.timeoutTick) {
                this.settlementController.Debug(`Production is too long-drawn, discontinuing`);
                this.onTargetCompositionReached();
                return;
            }
        }
        
        if (tickNumber % 10 != 0) {
            return;
        }

        if (tickNumber % 50 == 0) {
            if (this.settlementController.StrategyController.IsUnderAttack()) {
                this.settlementController.State = SettlementControllerStateFactory.MakeDefendingState(this.settlementController);
                return;
            }
        }

        this.refreshTargetProductionLists();

        let composition = this.settlementController.GetCurrentDevelopedEconomyComposition();

        if (MaraUtils.SetContains(composition, this.targetUnitsComposition)) {
            this.onTargetCompositionReached();
            return;
        }
    }

    protected getProductionTimeout(): number | null {
        return null;
    }

    protected onInsufficientResources(insufficientResources: MaraResources): boolean {
        return true;
    }

    protected fillExpandData(requiredResources: MaraResources): void {
        //let needProducePeople = requiredResources.People > 0;

        //if (!needProducePeople) {
            let optimalCluster = this.selectOptimalResourceCluster(requiredResources);

            if (optimalCluster) {
                this.settlementController.Debug(`Selected resource cluster ${optimalCluster.Center.ToString()} for expand`);
                let requiredResourceTypes: MaraResourceType[] = [];

                if (requiredResources.Gold > 0 && optimalCluster.GoldAmount > 0) {
                    this.settlementController.Debug(`Gold production is scheduled`);
                    requiredResourceTypes.push(MaraResourceType.Gold);
                }

                if (requiredResources.Metal > 0 && optimalCluster.MetalAmount > 0) {
                    this.settlementController.Debug(`Metal production is scheduled`);
                    requiredResourceTypes.push(MaraResourceType.Metal);
                }

                if (requiredResources.Wood > 0 && optimalCluster.WoodAmount > 0) {
                    this.settlementController.Debug(`Wood production is scheduled`);
                    requiredResourceTypes.push(MaraResourceType.Wood);
                }
                
                this.settlementController.TargetExpand = new TargetExpandData(
                    optimalCluster,
                    requiredResourceTypes
                );
            }
            else {
                this.settlementController.Debug(`Unable to find suitable resource cluster for mining`);
                
                this.settlementController.TargetExpand = new TargetExpandData( //when in doubt - build more izbas!!
                    null,
                    [MaraResourceType.People]
                );
            }
        // }
        // else {
        //     this.settlementController.TargetExpand = new TargetExpandData(
        //         null,
        //         [MaraResourceType.People]
        //     );
        // }
    }

    private getRemainingProductionList(): UnitComposition {
        let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
        
        for (let productionListItem of this.settlementController.ProductionController.ProductionList) {
            MaraUtils.IncrementMapItem(currentEconomy, productionListItem);
        }

        return MaraUtils.SubstractCompositionLists(this.targetUnitsComposition, currentEconomy);
    }

    private refreshTargetProductionLists(): void {
        let trainingList = this.getRemainingProductionList();
        
        trainingList.forEach(
            (val, key, map) => {
                for (let i = 0; i < val; i++) {
                    this.settlementController.ProductionController.RequestCfgIdProduction(key);
                }
            }
        );
    }

    private getInsufficientResources(): MaraResources {
        let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
        
        let compositionToProduce = MaraUtils.SubstractCompositionLists(this.targetUnitsComposition, currentEconomy);

        this.settlementController.Debug(`Current unit composition to produce:`);
        MaraUtils.PrintMap(compositionToProduce);

        let compositionCost = this.calculateCompositionCost(compositionToProduce);
        
        let currentResources = this.settlementController.MiningController.GetTotalResources();
        let requiredResources = new MaraResources(
            Math.max(compositionCost.Wood - currentResources.Wood, 0), 
            Math.max(compositionCost.Metal - currentResources.Metal, 0), 
            Math.max(compositionCost.Gold - currentResources.Gold, 0), 
            Math.max(compositionCost.People - currentResources.People, 0)
        );

        return requiredResources;
    }

    private calculateCompositionCost(composition: UnitComposition): MaraResources {
        let result = new MaraResources(0, 0, 0, 0);

        composition.forEach((value, key) => {
            let config = MaraUtils.GetUnitConfig(key);
            let cost = config.CostResources;

            result.Gold += cost.Gold * value;
            result.Metal += cost.Metal * value;
            result.Wood += cost.Lumber * value;
            result.People += cost.People * value;
        });

        return result;
    }

    private selectOptimalResourceCluster(requiredResources: MaraResources): MaraResourceCluster | null {
        let candidates: Array<MaraResourceCluster> = [];
        
        let requiredGold = requiredResources.Gold;
        let requiredMetal = requiredResources.Metal;
        let requiredWood = requiredResources.Wood;

        MaraResourceMap.ResourceClusters.forEach((value) => {
            if (requiredGold > 0) {
                let freeGold = this.getUnoccupiedMinerals(value.GoldCells);
                
                if (freeGold > requiredGold) {
                    candidates.push(value);
                }
            }
            else if (requiredMetal > 0) {
                let freeMetal = this.getUnoccupiedMinerals(value.MetalCells);
                
                if (freeMetal > requiredMetal) {
                    candidates.push(value);
                }
            }
            else if (requiredWood > 0 && value.WoodAmount >= requiredWood) {
                candidates.push(value);
            }
        });

        this.settlementController.Debug(`Candidate resource clusters:`);
        for (let cluster of candidates) {
            this.settlementController.Debug(`(${cluster.Center.ToString()})`);
        }

        if (candidates.length > 0) {
            return this.settlementController.StrategyController.SelectOptimalResourceCluster(candidates);
        }
        else {
            return null;
        }
    }

    private getUnoccupiedMinerals(cells: Array<MaraPoint>): number {
        let freeMinerals = 0;

        for (let cell of cells) {
            let unit = MaraUtils.GetUnit(cell);

            if (unit?.Owner == this.settlementController.Settlement) {
                continue;
            }
            else {
                freeMinerals += MaraUtils.GetCellMineralsAmount(cell.X, cell.Y);
            }
        }

        return freeMinerals;
    }
}