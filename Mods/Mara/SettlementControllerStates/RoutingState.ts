// import { MaraResourceCluster, MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
// import { TargetExpandData } from "../MaraSettlementController";
import { MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraResources } from "../Utils/Common";
import { MaraUtils } from "../Utils/MaraUtils";
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
        this.settlementController.Debug(`Total resources: ${resources.ToString()}`);

        let needExpand = false;
        let resourcesToMine = new MaraResources(0, 0, 0, 0);

        if (resources.People < 10) {
            this.settlementController.Debug
            needExpand = true;
            resourcesToMine.People = 1;
        }
        
        if (resources.Gold < 1000 && leftResources.has(MaraResourceType.Gold)) {
            needExpand = true;
            resourcesToMine.Gold = 1;
        }
        
        if (resources.Metal < 1000 && leftResources.has(MaraResourceType.Metal)) {
            needExpand = true;
            resourcesToMine.Metal = 1;
        }

        if (resources.Wood < 1000 && leftResources.has(MaraResourceType.Wood)) {
            needExpand = true;
            resourcesToMine.Wood = 1;
        }

        if (needExpand) {
            this.fillExpandData(resourcesToMine);
            this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
            return;
        }
        else {
            let pick = MaraUtils.Random(this.settlementController.MasterMind, 100);

            if (pick < 75) {
                this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
            }
            else {
                this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
            }
            
            return;
        }
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
        
    }
}