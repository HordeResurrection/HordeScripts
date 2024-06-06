import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { EconomySnapshotItem } from "../MaraSettlementController";
import { MaraProductionRequest } from "../Utils/Common";

export class RebuildState extends ProductionState {
    protected getProductionRequests(): Array<MaraProductionRequest> {
        let requiredEconomy = this.settlementController.TargetEconomySnapshot;

        if (!requiredEconomy) {
            return [];
        }

        this.settlementController.СleanupExpands();

        let requiredBuildings: Array<EconomySnapshotItem> = [];
        let requiredHarvesters: UnitComposition = new Map<string, number>();

        for (let item of requiredEconomy) {
            if (MaraUtils.IsBuildingConfigId(item.ConfigId)) {
                let existingExpandIndex = this.settlementController.Expands.findIndex(
                    (expand) => {
                        return (
                            MaraUtils.ChebyshevDistance(expand, item.Position) < 
                                Math.max(this.settlementController.Settings.ResourceMining.WoodcuttingRadius, this.settlementController.Settings.ResourceMining.MiningRadius)
                        );
                    }
                );

                if (existingExpandIndex > 0) {
                    requiredBuildings.push(item);
                }
                else {
                    let settlementLocation = this.settlementController.GetSettlementLocation();

                    if (settlementLocation) {
                        if (MaraUtils.ChebyshevDistance(item.Position, settlementLocation.Center) < settlementLocation.Radius) {
                            requiredBuildings.push(item);
                        }
                    }
                }
            }
            else if (MaraUtils.IsHarvesterConfigId(item.ConfigId)) {
                MaraUtils.IncrementMapItem(requiredHarvesters, item.ConfigId);
            }
        }

        let currentEconomySnapshot = this.settlementController.GetCurrentEconomySnapshot();

        let existingBuildings: Array<EconomySnapshotItem> = [];
        let existingHarvesters: UnitComposition = new Map<string, number>();

        for (let item of currentEconomySnapshot) {
            if (MaraUtils.IsBuildingConfigId(item.ConfigId)) {
                existingBuildings.push(item);
            }
            else if (MaraUtils.IsHarvesterConfigId(item.ConfigId)) {
                MaraUtils.IncrementMapItem(existingHarvesters, item.ConfigId);
            }
        }

        let result: Array<MaraProductionRequest> = [];

        for (let building of requiredBuildings) {
            if (
                !existingBuildings.find(
                    (value) => {
                        return (
                            value.ConfigId == building.ConfigId && value.Position!.EqualsTo(building.Position!)
                        );
                    }
                )
            ) {
                result.push(this.makeProductionRequest(building.ConfigId, building.Position!, 0));
            }
        }

        let harvestersToProduce = MaraUtils.SubstractCompositionLists(requiredHarvesters, existingHarvesters);
        let maxHarvesters = this.settlementController.MiningController.GetMaxHarvesterCount();
        let harvestersCout = 0;

        harvestersToProduce.forEach(
            (value, key) => {
                if (harvestersCout >= maxHarvesters) {
                    return;
                }
                
                for (let i = 0; i < value; i++) {
                    result.push(this.makeProductionRequest(key, null, null));
                    harvestersCout ++;
                }
            }
        );

        return result;
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
    }
}