
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { ProductionState } from "./ProductionState";

export class ExpandPrepareState extends ProductionState {
    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeExpandSecureState(this.settlementController);
    }
    
    protected getTargetUnitsComposition(): UnitComposition {
        if (this.settlementController.TargetExpand?.Cluster) {
            let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
            let armyToProduce = this.settlementController.StrategyController.GetExpandAttackArmyComposition(this.settlementController.TargetExpand!.Cluster!.Center!);
            
            return MaraUtils.AddCompositionLists(currentEconomy, armyToProduce);
        }
        else {
            return this.settlementController.GetCurrentDevelopedEconomyComposition();
        }
    }
}