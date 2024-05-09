import { MaraResourceCluster, MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
import { TargetExpandData } from "../MaraSettlementController";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraPoint, MaraResources } from "../Utils/Common";
import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class RoutingState extends MaraSettlementControllerState {
    OnEntry(): void {
        this.settlementController.TargetUnitsComposition = this.getDevelopmentUnitsComposition();
        let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
        
        let compositionToProduce = MaraUtils.SubstractCompositionLists(this.settlementController.TargetUnitsComposition!, currentEconomy);

        this.settlementController.Debug(`Current unit composition to produce:`);
        MaraUtils.PrintMap(compositionToProduce!);

        let compositionCost = this.calculateCompositionCost(compositionToProduce);
        
        let currentResources = this.settlementController.MiningController.GetTotalResources();
        let requiredResources = new MaraResources(
            Math.max(currentResources.Wood - compositionCost.Wood, 0), 
            Math.max(currentResources.Metal - compositionCost.Metal, 0), 
            Math.max(currentResources.Gold - compositionCost.Gold, 0), 
            Math.max(currentResources.People - compositionCost.People, 0)
        );

        if (
            requiredResources.Gold > 0 ||
            requiredResources.Metal > 0 ||
            requiredResources.Wood > 0 ||
            requiredResources.People > 0
        ) {
            this.settlementController.Debug(`Not enough resources, building expand`);
            this.fillExpandData(requiredResources);
            this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
            return;
        }
        else {
            this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
        }
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
        
    }

    protected getDevelopmentUnitsComposition(): UnitComposition {
        var targetCompostion = new Map<string, number>();

        let economyComposition = this.settlementController.GetCurrentEconomyComposition();
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
        let absentProducers: string[] = [];
        let absentTech: string[] = [];

        for (let cfgId of produceableCfgIds) {
            if (economyComposition.has(cfgId)) {
                continue;
            }

            let config = MaraUtils.GetUnitConfig(cfgId);
            let unitLimit = this.settlementController.Settlement.RulesOverseer.GetCurrentLimitForUnit(config) ?? Infinity;

            if (unitLimit > 0) {
                if (MaraUtils.IsProducerConfig(config)) {
                    absentProducers.push(cfgId);
                }
                else if (MaraUtils.IsTechConfig(config)) {
                    absentTech.push(cfgId);
                }
            }
        }

        if (absentProducers.length > 0 || absentTech.length > 0) {
            let selectedCfgIds: Array<string>;

            if (absentProducers.length > 0 && absentTech.length > 0) {
                let pick = MaraUtils.Random(this.settlementController.MasterMind, 100, 1);
                
                if (pick > this.settlementController.Settings.ControllerStates.ProducerProductionProbability) {
                    selectedCfgIds = absentTech;
                }
                else {
                    selectedCfgIds = absentProducers;
                }
            }
            else if (absentProducers.length > 0) {
                selectedCfgIds = absentProducers;
            }
            else {
                selectedCfgIds = absentTech;
            }
            
            let index = MaraUtils.Random(this.settlementController.MasterMind, selectedCfgIds.length - 1);
            MaraUtils.IncrementMapItem(targetCompostion, selectedCfgIds[index]);
        }

        let combatComposition = this.settlementController.StrategyController.GetSettlementAttackArmyComposition();
        let estimation = this.settlementController.ProductionController.EstimateProductionTime(combatComposition);

        estimation.forEach((value, key) => {
            if (value > this.settlementController.Settings.Timeouts.UnitProductionEstimationThreshold / 2) {
                let producingCfgIds = this.settlementController.ProductionController.GetProducingCfgIds(key);

                if (producingCfgIds.length > 0) {
                    let index = MaraUtils.Random(this.settlementController.MasterMind, producingCfgIds.length - 1);
                    let producerCfgId = producingCfgIds[index];

                    if (!targetCompostion.has(producerCfgId)) {
                        targetCompostion.set(producerCfgId, 1);
                    }
                }
            }
        });

        economyComposition.forEach((value, key) => {
            MaraUtils.AddToMapItem(targetCompostion, key, value);
        });

        return targetCompostion;
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

    private fillExpandData(requiredResources: MaraResources): void {
        let needProducePeople = requiredResources.People > 0;

        if (!needProducePeople) {
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
        }
        else {
            this.settlementController.TargetExpand = new TargetExpandData(
                null,
                [MaraResourceType.People]
            );
        }
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