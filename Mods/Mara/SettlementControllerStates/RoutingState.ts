// import { MaraResourceCluster, MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
// import { TargetExpandData } from "../MaraSettlementController";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
// import { MaraPoint, MaraResources } from "../Utils/Common";
// import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class RoutingState extends MaraSettlementControllerState {
    OnEntry(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
        
    }
}