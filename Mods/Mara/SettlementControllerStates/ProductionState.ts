import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraResources } from "../Utils/Common";

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
}