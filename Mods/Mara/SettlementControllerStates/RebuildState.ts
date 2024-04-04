import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { BuildingUpState } from "./BuildingUpState";
import { ProductionState } from "./ProductionState";

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
        this.settlementController.State = new BuildingUpState(this.settlementController);
    }
}