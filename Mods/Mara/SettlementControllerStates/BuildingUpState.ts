import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraResources } from "../Utils/Common";

export class BuildingUpState extends ProductionState {
    protected getProductionTimeout(): number | null {
        return MaraUtils.Random(
            this.settlementController.MasterMind,
            this.settlementController.Settings.Timeouts.MaxBuildUpProductionTimeout,
            this.settlementController.Settings.Timeouts.MinBuildUpProductionTimeout
        );
    }
    
    protected getTargetUnitsComposition(): UnitComposition {
        let enemy = this.settlementController.StrategyController.CurrentEnemy
        
        if (!enemy) {
            enemy = this.settlementController.StrategyController.SelectEnemy();
            this.settlementController.Debug(`Selected '${enemy.TownName}' as an enemy.`);
        }

        if (enemy) {
            this.settlementController.Debug(`Proceeding to build-up against '${enemy.TownName}'.`);
            let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
            let armyToProduce = this.settlementController.StrategyController.GetSettlementAttackArmyComposition();
            
            return MaraUtils.AddCompositionLists(currentEconomy, armyToProduce);
        }
        else {
            return new Map<string, number>();
        }
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeExterminatingState(this.settlementController);
    }

    protected onInsufficientResources(insufficientResources: MaraResources): boolean {
        this.settlementController.Debug(`Preparing expand`);
        
        this.fillExpandData(insufficientResources);
        this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
        return false;
    }
}