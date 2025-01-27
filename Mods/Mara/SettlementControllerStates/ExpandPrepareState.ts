
import { MaraProductionRequest } from "../Common/MaraProductionRequest";
import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { ProductionState } from "./ProductionState";

export class ExpandPrepareState extends ProductionState {
    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeExpandSecureState(this.settlementController);
    }
    
    protected getProductionRequests(): Array<MaraProductionRequest> {
        if (this.settlementController.TargetExpand?.Cluster) {
            let armyToProduce = this.settlementController.StrategyController.GetExpandAttackArmyComposition(this.settlementController.TargetExpand!.Cluster!.Center!);

            let result = new Array<MaraProductionRequest>();

            armyToProduce.forEach(
                (value, key) => {
                    for (let i = 0; i < value; i++) {
                        result.push(this.makeProductionRequest(key, null, null));
                    }
                }
            );

            let settlementLocation = this.settlementController.GetSettlementLocation();

            if (settlementLocation) {
                let bridgeRequest = this.makeBridgeProductionRequest(
                    settlementLocation.Center, 
                    this.settlementController.TargetExpand?.Cluster.Center
                );

                if (bridgeRequest) {
                    result.push(bridgeRequest);
                }
            }
            
            return result;
        }
        else {
            return [];
        }
    }

    protected getProductionTimeout(): number | null {
        return this.settlementController.Settings.Timeouts.ExpandPrepare;
    }
}