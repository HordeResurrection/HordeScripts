import { UnitComposition } from "Mara/Utils/MaraUtils";
import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";

export class DevelopingState extends ProductionState {
    protected getTargetUnitsComposition(): UnitComposition {
        return this.settlementController.TargetUnitsComposition!;
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
    }
}