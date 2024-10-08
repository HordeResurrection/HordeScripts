import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { MaraUtils } from "../MaraUtils";
import { UnitComposition } from "../Common/UnitComposition";
import { EconomySnapshotItem } from "../Common/Settlement/EconomySnapshotItem";
import { MaraProductionRequest } from "../Common/MaraProductionRequest";
import { MaraPoint } from "../Common/MaraPoint";

export class RebuildState extends ProductionState {
    protected getProductionRequests(): Array<MaraProductionRequest> {
        let requiredEconomy = this.settlementController.TargetEconomySnapshot;

        if (!requiredEconomy) {
            return [];
        }

        this.settlementController.СleanupExpands();

        let requiredBuildings: Array<EconomySnapshotItem> = [];
        let requiredHarvesters: UnitComposition = new Map<string, number>();
        let maxHarvesterCount = this.settlementController.MiningController.GetOptimalHarvesterCount();
        let initialHarvesterCount = 0;

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
                        if (settlementLocation.BoundingRect.IsPointInside(item.Position)) {
                            requiredBuildings.push(item);
                        }
                    }
                }
            }
            else if (MaraUtils.IsHarvesterConfigId(item.ConfigId)) {
                if (initialHarvesterCount < maxHarvesterCount) {
                    MaraUtils.IncrementMapItem(requiredHarvesters, item.ConfigId);
                    initialHarvesterCount++;
                }
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
                if (MaraUtils.IsMineConfigId(building.ConfigId)) {
                    let config = MaraUtils.GetUnitConfig(building.ConfigId);
                    let bottomRight = new MaraPoint(
                        building.Position!.X + config.Size.Width - 1, 
                        building.Position!.Y + config.Size.Height - 1
                    );

                    let minerals = this.settlementController.MiningController.GetRectResources(building.Position!, bottomRight);

                    if (minerals.Gold == 0 && minerals.Metal == 0) {
                        continue;
                    }
                }
                
                result.push(this.makeProductionRequest(building.ConfigId, building.Position!, 0));
            }
        }

        let harvestersToProduce = MaraUtils.SubstractCompositionLists(requiredHarvesters, existingHarvesters);
        let orderedHarvestersCount = 0;

        harvestersToProduce.forEach(
            (value, key) => {
                for (let i = 0; i < value; i++) {
                    if (orderedHarvestersCount >= this.settlementController.Settings.ControllerStates.MaxHarvesterProductionBatch) {
                        break;
                    }
                    
                    result.push(this.makeProductionRequest(key, null, null));
                    orderedHarvestersCount ++;
                }
            }
        );

        if (
            initialHarvesterCount < maxHarvesterCount &&
            orderedHarvestersCount < this.settlementController.Settings.ControllerStates.MaxHarvesterProductionBatch
        ) {
            let harvesterConfigIds = MaraUtils.GetAllHarvesterConfigIds(this.settlementController.Settlement);
            let cfgId = MaraUtils.RandomSelect<string>(this.settlementController.MasterMind, harvesterConfigIds);

            if (cfgId != null) {
                for (let i = 0; i < maxHarvesterCount - initialHarvesterCount; i++) {
                    result.push(this.makeProductionRequest(cfgId, null, null));
                    orderedHarvestersCount ++;

                    if (orderedHarvestersCount >= this.settlementController.Settings.ControllerStates.MaxHarvesterProductionBatch) {
                        break;
                    }
                }
            }
        }

        return result;
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
    }
}