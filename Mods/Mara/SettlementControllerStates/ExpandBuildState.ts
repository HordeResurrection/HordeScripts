import { MaraResourceCluster, MaraResourceType } from "../MaraResourceMap";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraPoint, MaraProductionRequest } from "../Utils/Common";
import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class ExpandBuildState extends MaraSettlementControllerState {
    private requests: Array<MaraProductionRequest>;
    private targetComposition: UnitComposition;
    private expandCenter: MaraPoint;
    private harvestersToOrder: UnitComposition;

    private timeoutTick: number | null;
    
    public OnEntry(): void {
        let center = this.calculateExpandCenter();
        
        if (!center) {
            this.settlementController.State = SettlementControllerStateFactory.MakeIdleState(this.settlementController);
            return;
        }
        else {
            this.expandCenter = center;
            this.settlementController.TargetExpand!.BuildCenter = center;
        }

        this.requests = [];
        let targetExpand = this.settlementController.TargetExpand!;
        this.harvestersToOrder = new Map<string, number>();

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

        this.orderHarvestersProduction();

        if (this.isRemoteExpand(this.expandCenter)) {
            this.orderGuardProduction();
        }

        this.targetComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();

        for (let request of this.requests) {
            MaraUtils.IncrementMapItem(this.targetComposition, request.ConfigId);
        }

        this.timeoutTick = null;
    }

    public OnExit(): void {
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

    public Tick(tickNumber: number): void {
        if (this.timeoutTick == null) {
            let timeout = this.settlementController.Settings.Timeouts.ExpandBuildTimeout;
            this.settlementController.Debug(`Set timeout to ${timeout} ticks`);
            this.timeoutTick = tickNumber + timeout;
        }
        else if (tickNumber > this.timeoutTick) {
            this.settlementController.Debug(`Expand build is too long-drawn, discontinuing`);
            this.settlementController.State = SettlementControllerStateFactory.MakeRoutingState(this.settlementController);
            return;
        }
        
        if (tickNumber % 10 != 0) {
            return;
        }

        if (tickNumber % 50 == 0) {
            if (this.settlementController.StrategyController.IsUnderAttack()) {
                this.settlementController.State = SettlementControllerStateFactory.MakeDefendingState(this.settlementController);
                return;
            }
        }

        for (let request of this.requests) {
            request.Track();
        }

        let requestsToReorder = this.getRequestsToReorder();
        
        if (requestsToReorder.length == 0) {
            let isAllRequestsCompleted = true;

            for (let request of this.requests) {
                if (!request.IsCompleted) {
                    isAllRequestsCompleted = false;
                    break;
                }
            }
            
            if (isAllRequestsCompleted) {
                this.settlementController.State = SettlementControllerStateFactory.MakeRoutingState(this.settlementController);
                return;
            }
        }
        else {
            for (let request of requestsToReorder) {
                request.WipeResults();
                this.settlementController.ProductionController.RequestProduction(request);
            }
        }
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
        let index = 0; 
        
        if (configIds.length == 0) {
            return null;
        } 
        else if (configIds.length > 1) {
            index = MaraUtils.Random(this.settlementController.MasterMind, configIds.length - 1);
        }

        return configIds[index];
    }

    private orderMineProduction(cluster: MaraResourceCluster, resourceType: MaraResourceType): void {
        let mineConfigs = MaraUtils.GetAllMineConfigs(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(mineConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order mine production: no mine config available`);
            return;
        }

        let minePosition: MaraPoint | null = this.settlementController.MiningController.FindMinePosition(
            cluster, 
            MaraUtils.GetUnitConfig(cfgId),
            resourceType
        );

        if (!minePosition) {
            this.settlementController.Debug(`Unable to order mine production: no suitable place for mine found`);
            return;
        }

        this.orderProducion(cfgId, minePosition, 0);

        let harvesterConfigs = MaraUtils.GetAllHarvesterConfigs(this.settlementController.Settlement);
        cfgId = this.selectConfigId(harvesterConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order mine production: no harvester config available`);
            return;
        }

        MaraUtils.AddToMapItem(this.harvestersToOrder, cfgId, this.settlementController.Settings.ResourceMining.MinMinersPerMine);
    }

    private orderMiningProduction(): void {
        let targetExpand = this.settlementController.TargetExpand!;

        if (targetExpand.ResourceType.findIndex((value) => {return value == MaraResourceType.Gold}) >= 0) {
            this.orderMineProduction(targetExpand.Cluster!, MaraResourceType.Gold);
        }

        if (targetExpand.ResourceType.findIndex((value) => {return value == MaraResourceType.Metal}) >= 0) {
            this.orderMineProduction(targetExpand.Cluster!, MaraResourceType.Metal);
        }
        
        let metalStocks = MaraUtils.GetSettlementUnitsInArea(
            this.expandCenter, 
            this.settlementController.Settings.ResourceMining.MiningRadius,
            [this.settlementController.Settlement],
            (unit) => {return MaraUtils.IsMetalStockConfig(unit.Cfg) && unit.IsAlive}
        );

        if (metalStocks.length == 0) {
            let metalStockConfigs = MaraUtils.GetAllMetalStockConfigs(this.settlementController.Settlement);
            let cfgId = this.selectConfigId(metalStockConfigs);

            if (cfgId == null) {
                this.settlementController.Debug(`Unable to order mining production: no metal stock config available`);
                return;
            }

            this.orderProducion(cfgId, this.expandCenter, null);
        }
    }
    
    private orderWoodcuttingProduction(): void {
        let sawmills = MaraUtils.GetSettlementUnitsInArea(
            this.expandCenter, 
            this.settlementController.Settings.ResourceMining.WoodcuttingRadius,
            [this.settlementController.Settlement],
            (unit) => {return MaraUtils.IsSawmillConfig(unit.Cfg) && unit.IsAlive}
        );
        
        let targetResourceCluster = this.settlementController.TargetExpand!.Cluster!;

        if (sawmills.length == 0) {
            let sawmillConfigs = MaraUtils.GetAllSawmillConfigs(this.settlementController.Settlement);
            let cfgId = this.selectConfigId(sawmillConfigs);

            if (cfgId == null) {
                this.settlementController.Debug(`Unable to order woodcutting production: no sawmill config available`);
                return;
            }

            this.orderProducion(cfgId, targetResourceCluster.Center, null);
        }

        let harvesterConfigs = MaraUtils.GetAllHarvesterConfigs(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(harvesterConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order woodcutting production: no harvester config available`);
            return;
        }

        MaraUtils.AddToMapItem(this.harvestersToOrder, cfgId, this.settlementController.Settings.ResourceMining.WoodcutterBatchSize);
    }

    private orderHousingProduction(): void {
        let housingConfigs = MaraUtils.GetAllHousingConfigs(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(housingConfigs);
        
        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order housing production: no housing config available`);
            return;
        }

        for (let i = 0; i < this.settlementController.Settings.ResourceMining.HousingBatchSize; i++) {
            this.orderProducion(cfgId, null, null);
        }
    }

    private orderGuardProduction(): void {
        let guardComposition = this.settlementController.StrategyController.GetExpandGuardArmyComposition(this.expandCenter);

        guardComposition.forEach(
            (value, key) => {
                for (let i = 0; i < value; i++) {
                    this.orderProducion(key, this.expandCenter, null);
                }
            }
        );
    }

    private orderHarvestersProduction(): void {
        let freeHarvesters = this.settlementController.MiningController.GetFreeHarvesters();
        let freeHarvestersCount = freeHarvesters.length;

        this.harvestersToOrder.forEach(
            (value, key) => {
                let harvesterCount = Math.max(value - freeHarvestersCount, 0);

                for (let i = 0; i < harvesterCount; i++) {
                    this.orderProducion(key, null, null);
                }

                freeHarvestersCount = Math.max(freeHarvestersCount - value, 0);
            }
        );
    }

    private orderProducion(configId: string, point: MaraPoint | null, precision: number | null): void {
        let productionRequest = new MaraProductionRequest(configId, point, precision, true);
        this.settlementController.ProductionController.RequestProduction(productionRequest);
        this.requests.push(productionRequest);
    }

    private getRequestsToReorder(): Array<MaraProductionRequest> {
        let completedRequests = this.requests.filter((value) => {return value.IsCompleted});
        let orderedRequests = this.requests.filter((value) => {return !value.IsCompleted});

        let developedComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();
        let compositionToRequest = MaraUtils.SubstractCompositionLists(this.targetComposition, developedComposition);

        for (let request of orderedRequests) {
            MaraUtils.DecrementMapItem(compositionToRequest, request.ConfigId);
        }

        let requestsToReorder: Array<MaraProductionRequest> = [];
        let unknownRequests: Array<MaraProductionRequest> = [];
        
        for (let request of completedRequests) {
            if (request.IsSuccess) {
                if (request.ProducedUnit) {
                    if (!request.ProducedUnit.IsAlive) {
                        requestsToReorder.push(request);
                        MaraUtils.DecrementMapItem(compositionToRequest, request.ConfigId);
                    }
                }
                else {
                    unknownRequests.push(request);
                }
            }
            else {
                requestsToReorder.push(request);
                MaraUtils.DecrementMapItem(compositionToRequest, request.ConfigId);
            }
        }

        compositionToRequest.forEach(
            (value, key) => {
                let requestCount = value;
                
                for (let request of unknownRequests) {
                    if (requestCount == 0) {
                        break;
                    }
                    
                    if (request.ConfigId == key) {
                        requestsToReorder.push(request);
                        requestCount --;
                    }
                }
            }
        );

        return requestsToReorder;
    }
}