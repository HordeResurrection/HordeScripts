import { MaraResourceCluster, MaraResourceType } from "../MaraResourceMap";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraPoint, MaraProductionRequest } from "../Utils/Common";
import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { ProductionState } from "./ProductionState";

export class ExpandBuildState extends ProductionState {
    private expandCenter: MaraPoint;
    private harvestersToOrder: UnitComposition;
    private minedMinerals: Set<MaraResourceType> = new Set<MaraResourceType>();

    protected onEntry(): boolean {
        let center = this.calculateExpandCenter();
        
        if (!center) {
            this.settlementController.State = SettlementControllerStateFactory.MakeIdleState(this.settlementController);
            return false;
        }
        else {
            this.expandCenter = center;
            this.settlementController.TargetExpand!.BuildCenter = center;

            return true;
        }
    }

    protected onExit(): void {
        this.settlementController.TargetExpand = null;
        
        if (this.isRemoteExpand(this.expandCenter)) {
            if ( 
                !this.settlementController.Expands.find( 
                    (value) => {return value.EqualsTo(this.expandCenter)} 
                ) 
            ) {
                this.settlementController.Expands.push(this.expandCenter);
            }
        }
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeRoutingState(this.settlementController);
    }

    protected getProductionRequests(): Array<MaraProductionRequest> {
        let result = new Array<MaraProductionRequest>();
        
        let targetExpand = this.settlementController.TargetExpand!;
        this.harvestersToOrder = new Map<string, number>();

        if (
            targetExpand.ResourceType.findIndex(
                (value) => {return value == MaraResourceType.Gold || value == MaraResourceType.Metal}
            ) >= 0
        ) {
            result.push(...this.orderMiningProduction());
        }

        if (
            targetExpand.ResourceType.findIndex(
                (value) => {return value == MaraResourceType.Wood}
            ) >= 0
        ) {
            result.push(...this.orderWoodcuttingProduction());
        }

        if (
            targetExpand.ResourceType.findIndex(
                (value) => {return value == MaraResourceType.People}
            ) >= 0
        ) {
            result.push(...this.orderHousingProduction());
        }

        result.push(...this.orderHarvestersProduction());

        if (this.isRemoteExpand(this.expandCenter)) {
            result.push(...this.orderGuardProduction());
        }

        return result;
    }

    protected getProductionTimeout(): number | null {
        return this.settlementController.Settings.Timeouts.ExpandBuild;
    }

    private calculateExpandCenter(): MaraPoint | null {
        let targetResourceCluster = this.settlementController.TargetExpand!.Cluster;
        let expandCenter: MaraPoint;

        if (targetResourceCluster) {
            expandCenter = targetResourceCluster.Center;
        }
        else {
            let settlementLocation = this.settlementController.GetSettlementLocation();

            if (settlementLocation) {
                expandCenter = new MaraPoint(settlementLocation.Center.X, settlementLocation.Center.Y);
            }
            else { //all is lost
                return null;
            }
        }

        this.settlementController.Debug(`Expand center calculated: ${expandCenter.ToString()}`);
        return expandCenter;
    }

    private isRemoteExpand(expandCenter: MaraPoint): boolean {
        let settlementLocation = this.settlementController.GetSettlementLocation();

        if (settlementLocation) {
            let distance = MaraUtils.ChebyshevDistance(expandCenter, settlementLocation.Center);
            let radius = Math.max(
                settlementLocation.Radius,
                this.settlementController.Settings.ResourceMining.MiningRadius,
                this.settlementController.Settings.ResourceMining.WoodcuttingRadius
            );

            return distance > radius;
        }
        else {
            return false;
        }
    }

    private selectConfigId(configIds: Array<string>): string | null {
        return MaraUtils.RandomSelect<string>(this.settlementController.MasterMind, configIds);
    }

    private orderMineProduction(cluster: MaraResourceCluster, resourceType: MaraResourceType): Array<MaraProductionRequest> {
        if (this.minedMinerals.has(resourceType)) {
            this.settlementController.Debug(`Resource type '${resourceType}' mining is already ordered`);
            return [];
        }
        
        let mineConfigs = MaraUtils.GetAllMineConfigIds(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(mineConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order mine production: no mine config available`);
            return [];
        }
        
        let mineConfig = MaraUtils.GetUnitConfig(cfgId);
        
        let minePosition: MaraPoint | null = this.settlementController.MiningController.FindMinePosition(
            cluster, 
            mineConfig,
            resourceType
        );

        if (!minePosition) {
            this.settlementController.Debug(`Unable to order mine production: no suitable place for mine found`);
            return [];
        }

        let mineRequest = this.makeProductionRequest(cfgId, minePosition, 0, true);
        
        let mineResources = this.settlementController.MiningController.GetRectResources(
            minePosition,
            new MaraPoint(minePosition.X + mineConfig.Size.Width - 1, minePosition.Y + mineConfig.Size.Height - 1)
        );

        if (mineResources.Gold > 0) {
            this.minedMinerals.add(MaraResourceType.Gold);
        }

        if (mineResources.Metal > 0) {
            this.minedMinerals.add(MaraResourceType.Metal);
        }

        let harvesterConfigs = MaraUtils.GetAllHarvesterConfigIds(this.settlementController.Settlement);
        cfgId = this.selectConfigId(harvesterConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order mine production: no harvester config available`);
            return [];
        }

        MaraUtils.AddToMapItem(this.harvestersToOrder, cfgId, this.settlementController.Settings.ResourceMining.MinMinersPerMine);

        return [mineRequest];
    }

    private orderMiningProduction(): Array<MaraProductionRequest> {
        let result = new Array<MaraProductionRequest>();
        
        let targetExpand = this.settlementController.TargetExpand!;

        if (targetExpand.ResourceType.findIndex((value) => {return value == MaraResourceType.Gold}) >= 0) {
            result.push(...this.orderMineProduction(targetExpand.Cluster!, MaraResourceType.Gold));
        }

        if (targetExpand.ResourceType.findIndex((value) => {return value == MaraResourceType.Metal}) >= 0) {
            result.push(...this.orderMineProduction(targetExpand.Cluster!, MaraResourceType.Metal));
        }
        
        let metalStocks = MaraUtils.GetSettlementUnitsInArea(
            this.expandCenter, 
            this.settlementController.Settings.ResourceMining.MiningRadius,
            [this.settlementController.Settlement],
            (unit) => {return MaraUtils.IsMetalStockConfig(unit.Cfg) && unit.IsAlive}
        );

        if (metalStocks.length == 0) {
            let metalStockConfigs = MaraUtils.GetAllMetalStockConfigIds(this.settlementController.Settlement);
            let cfgId = this.selectConfigId(metalStockConfigs);

            if (cfgId == null) {
                this.settlementController.Debug(`Unable to order mining production: no metal stock config available`);
                return result;
            }

            result.push(this.makeProductionRequest(cfgId, this.expandCenter, null, true));
        }

        return result;
    }
    
    private orderWoodcuttingProduction(): Array<MaraProductionRequest> {
        let result = new Array<MaraProductionRequest>();
        
        let sawmills = MaraUtils.GetSettlementUnitsInArea(
            this.expandCenter, 
            this.settlementController.Settings.ResourceMining.WoodcuttingRadius,
            [this.settlementController.Settlement],
            (unit) => {return MaraUtils.IsSawmillConfig(unit.Cfg) && unit.IsAlive}
        );
        
        let targetResourceCluster = this.settlementController.TargetExpand!.Cluster!;

        if (sawmills.length == 0) {
            let sawmillConfigs = MaraUtils.GetAllSawmillConfigIds(this.settlementController.Settlement);
            let cfgId = this.selectConfigId(sawmillConfigs);

            if (cfgId == null) {
                this.settlementController.Debug(`Unable to order woodcutting production: no sawmill config available`);
                return [];
            }

            result.push(this.makeProductionRequest(cfgId, targetResourceCluster.Center, null, true));
        }

        let harvesterConfigs = MaraUtils.GetAllHarvesterConfigIds(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(harvesterConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order woodcutting production: no harvester config available`);
            return [];
        }

        MaraUtils.AddToMapItem(this.harvestersToOrder, cfgId, this.settlementController.Settings.ResourceMining.WoodcutterBatchSize);

        return result;
    }

    private orderHousingProduction(): Array<MaraProductionRequest> {
        let result = new Array<MaraProductionRequest>();
        
        let housingConfigs = MaraUtils.GetAllHousingConfigIds(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(housingConfigs);
        
        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order housing production: no housing config available`);
            return [];
        }

        for (let i = 0; i < this.settlementController.Settings.ResourceMining.HousingBatchSize; i++) {
            result.push(this.makeProductionRequest(cfgId, null, null, true));
        }

        return result;
    }

    private orderGuardProduction(): Array<MaraProductionRequest> {
        let result = new Array<MaraProductionRequest>();

        let guardComposition = this.settlementController.StrategyController.GetExpandGuardArmyComposition(this.expandCenter);

        guardComposition.forEach(
            (value, key) => {
                for (let i = 0; i < value; i++) {
                    result.push(this.makeProductionRequest(key, this.expandCenter, null, true));
                }
            }
        );

        return result;
    }

    private orderHarvestersProduction(): Array<MaraProductionRequest> {
        let result = new Array<MaraProductionRequest>();
        
        let freeHarvesters = this.settlementController.MiningController.GetFreeHarvesters();
        let freeHarvestersCount = freeHarvesters.length;

        this.harvestersToOrder.forEach(
            (value, key) => {
                let harvesterCount = Math.max(value - freeHarvestersCount, 0);

                for (let i = 0; i < harvesterCount; i++) {
                    result.push(this.makeProductionRequest(key, null, null, true));
                }

                freeHarvestersCount = Math.max(freeHarvestersCount - value, 0);
            }
        );

        return result;
    }
}