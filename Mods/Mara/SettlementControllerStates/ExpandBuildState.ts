import { MaraResourceType } from "../MaraResourceMap";
import { MaraSettlementCluster } from "../MaraSettlementController";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraPoint } from "../Utils/Common";
import { MaraUtils } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class ExpandBuildState extends MaraSettlementControllerState {
    private expandCluster: MaraSettlementCluster;
    
    public OnEntry(): void {
        if (!this.fillExpandCluster()) {
            this.settlementController.State = SettlementControllerStateFactory.MakeIdleState(this.settlementController);
            return;
        }

        let targetExpand = this.settlementController.TargetExpand!;

        if (
            targetExpand.ResourceType.findIndex(
                (value) => {return value == MaraResourceType.Gold || value == MaraResourceType.Metal}
            ) >= 0
        ) {
            this.orderMiningProduction();
        }

        if (
            targetExpand.ResourceType.findIndex(
                (value) => {return value == MaraResourceType.Wood}
            ) >= 0
        ) {
            this.orderWoodcuttingProduction();
        }

        if (
            targetExpand.ResourceType.findIndex(
                (value) => {return value == MaraResourceType.People}
            ) >= 0
        ) {
            this.orderHousingProduction();
        }
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
        
    }

    private fillExpandCluster(): boolean {
        let targetResourceCluster = this.settlementController.TargetExpand!.Cluster;
        let expandCenter: MaraPoint;

        if (targetResourceCluster) {
            expandCenter = targetResourceCluster.Center;
        }
        else {
            let settlementLocation = this.settlementController.GetSettlementLocation();

            if (settlementLocation) {
                expandCenter = settlementLocation.Center;
            }
            else { //all is lost
                return false;
            }
        }

        for (let cluster of this.settlementController.SettlementClusters) {
            if (
                MaraUtils.ChebyshevDistance(cluster.Center, expandCenter!) < 
                this.settlementController.Settings.ControllerStates.SettlementClustersRadius
            ) {
                this.expandCluster = cluster;
                break;
            }
        }

        if (!this.expandCluster) {
            this.expandCluster = new MaraSettlementCluster();
            this.expandCluster.Center = expandCenter;
            this.settlementController.SettlementClusters.push(this.expandCluster);
        }

        return true;
    }

    private orderMiningProduction(): void {

    }

    private orderWoodcuttingProduction(): void {

    }

    private orderHousingProduction() {

    }
}