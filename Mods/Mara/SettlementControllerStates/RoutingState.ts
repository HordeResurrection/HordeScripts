// import { MaraResourceCluster, MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
// import { TargetExpandData } from "../MaraSettlementController";
import { MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraResources } from "../Utils/Common";
// import { MaraPoint, MaraResources } from "../Utils/Common";
// import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class RoutingState extends MaraSettlementControllerState {
    OnEntry(): void {
        let leftResources = new Set<MaraResourceType>();
        
        MaraResourceMap.ResourceClusters.forEach((value) => {
            if (value.GoldAmount > 0) {
                leftResources.add(MaraResourceType.Gold);
            }

            if (value.MetalAmount > 0) {
                leftResources.add(MaraResourceType.Metal);
            }

            if (value.WoodAmount > 0) {
                leftResources.add(MaraResourceType.Wood);
            }
        });
                
        let resources = this.settlementController.MiningController.GetTotalResources();
        let needExpand = false;
        let resourcesToMine = new MaraResources(0, 0, 0, 0);

        if (resources.Gold < 200 && leftResources.has(MaraResourceType.Gold)) {
            needExpand = true;
            resourcesToMine.Gold = 1;
        }
        
        if (resources.Metal < 200 && leftResources.has(MaraResourceType.Metal)) {
            needExpand = true;
            resourcesToMine.Metal = 1;
        }

        if (resources.Wood < 200 && leftResources.has(MaraResourceType.Wood)) {
            needExpand = true;
            resourcesToMine.Wood = 1;
        }

        if (needExpand) {
            this.fillExpandData(resourcesToMine);
            this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
            return;
        }
        else {
            this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
            return;
        }
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
        
    }
}