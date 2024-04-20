import { MaraSettlementController } from "./MaraSettlementController";
import { BuildingUpState } from "./SettlementControllerStates/BuildingUpState";
import { DefendingState } from "./SettlementControllerStates/DefendingState";
import { DevelopingState } from "./SettlementControllerStates/DevelopingState";
import { ExterminatingState } from "./SettlementControllerStates/ExterminatingState";
import { IdleState } from "./SettlementControllerStates/IdleState";
import { RebuildState } from "./SettlementControllerStates/RebuildState";

export class SettlementControllerStateFactory {
    static MakeBuildingUpState(settlementController: MaraSettlementController): BuildingUpState {
        return new BuildingUpState(settlementController);
    }

    static MakeDefendingState(settlementController: MaraSettlementController): DefendingState {
        return new DefendingState(settlementController);
    }

    static MakeDevelopingState(settlementController: MaraSettlementController): DevelopingState {
        return new DevelopingState(settlementController);
    }

    static MakeExterminatingState(settlementController: MaraSettlementController): ExterminatingState {
        return new ExterminatingState(settlementController);
    }

    static MakeIdleState(settlementController: MaraSettlementController): IdleState {
        return new IdleState(settlementController);
    }

    static MakeRebuildState(settlementController: MaraSettlementController): RebuildState {
        return new RebuildState(settlementController);
    }
}