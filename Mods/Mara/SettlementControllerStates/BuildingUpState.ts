import { MaraUtils } from "Mara/Utils/MaraUtils";
import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraProductionRequest, MaraResources } from "../Utils/Common";

export class BuildingUpState extends ProductionState {
    protected getProductionTimeout(): number | null {
        return MaraUtils.Random(
            this.settlementController.MasterMind,
            this.settlementController.Settings.Timeouts.MaxBuildUpProduction,
            this.settlementController.Settings.Timeouts.MinBuildUpProduction
        );
    }
    
    protected getProductionRequests(): Array<MaraProductionRequest> {
        let enemy = this.settlementController.StrategyController.CurrentEnemy
        
        if (!enemy) {
            enemy = this.settlementController.StrategyController.SelectEnemy();
            this.settlementController.Debug(`Selected '${enemy.TownName}' as an enemy.`);
        }

        if (enemy) {
            this.settlementController.Debug(`Proceeding to build-up against '${enemy.TownName}'.`);
            let armyToProduce = this.settlementController.StrategyController.GetSettlementAttackArmyComposition();

            let result = new Array<MaraProductionRequest>();

            armyToProduce.forEach(
                (value, key) => {
                    for (let i = 0; i < value; i++) {
                        result.push(this.makeProductionRequest(key, null, null));
                    }
                }
            );
            
            return result;
        }
        else {
            return [];
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