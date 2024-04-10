import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { ProductionState } from "./ProductionState";
import { ExterminatingState } from "./ExterminatingState";

export class BuildingUpState extends ProductionState {
    protected readonly PRODUCTION_TIMEOUT: number | null = this.settlementController.Settings.Timeouts.BuildUpProductionTimeout;
    
    protected getTargetUnitsComposition(): UnitComposition {
        let enemy = this.settlementController.StrategyController.CurrentEnemy
        
        if (!enemy) {
            enemy = this.settlementController.StrategyController.SelectEnemy();
            this.settlementController.Debug(`Selected '${enemy.TownName}' as an enemy.`);
        }

        if (enemy) {
            this.settlementController.Debug(`Proceeding to build-up against '${enemy.TownName}'.`);
            let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
            let armyToProduce = this.settlementController.StrategyController.GetArmyComposition();
            
            return MaraUtils.AddCompositionLists(currentEconomy, armyToProduce);
        }
        else {
            return new Map<string, number>();
        }
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = new ExterminatingState(this.settlementController);
    }
}