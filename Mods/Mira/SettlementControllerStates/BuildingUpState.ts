import { UnitComposition } from "Mira/Utils/MiraUtils";
import { ProductionState } from "./ProductionState";
import { ExterminatingState } from "./ExterminatingState";

export class BuildingUpState extends ProductionState {
    protected readonly PRODUCTION_TIMEOUT: number | null = 3 * 60 * 50; //3 min
    
    protected getTargetUnitsComposition(): UnitComposition {
        let enemy = this.settlementController.StrategyController.CurrentEnemy
        
        if (!enemy) {
            enemy = this.settlementController.StrategyController.SelectEnemy();
            this.settlementController.Debug(`Selected '${enemy.TownName}' as an enemy.`);
        }

        if (enemy) {
            this.settlementController.Debug(`Proceeding to build-up against '${enemy.TownName}'.`);
            return this.settlementController.StrategyController.GetArmyComposition();
        }
        else {
            return new Map<string, number>();
        }
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = new ExterminatingState(this.settlementController);
    }
}