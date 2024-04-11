import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";

export class RebuildState extends ProductionState {
    protected getTargetUnitsComposition(): UnitComposition {
        let lastUnitsComposition = this.settlementController.TargetUnitsComposition;
        let unitsComposition = new Map<string, number>();

        if (lastUnitsComposition) {
            lastUnitsComposition.forEach((value, key, map) => {
                let config = MaraUtils.GetUnitConfig(key);

                if (
                    config.BuildingConfig != null ||
                    MaraUtils.IsProducerConfig(config)
                ) {
                    unitsComposition.set(key, value);
                }
            });
        }

        return unitsComposition;
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
    }
}