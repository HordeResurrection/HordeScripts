import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { MaraResourceType } from "../MaraResourceMap";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraPoint, MaraProductionRequest } from "../Utils/Common";
import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class ExpandBuildState extends MaraSettlementControllerState {
    private strictPositionRequests: Array<MaraProductionRequest>;
    private positionlessRequests: Array<MaraProductionRequest>;
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
        }

        this.strictPositionRequests = [];
        this.positionlessRequests = [];
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

        let settlementLocation = this.settlementController.GetSettlementLocation();

        if (settlementLocation) {
            let distance = MaraUtils.ChebyshevDistance(this.expandCenter, settlementLocation.Center);

            if (distance > settlementLocation.Radius) {
                this.orderGuardProduction();
            }
        }

        this.targetComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();

        for (let request of this.positionlessRequests) {
            MaraUtils.IncrementMapItem(this.targetComposition, request.ConfigId);
        }

        this.timeoutTick = null;
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
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

        if (this.isAllRequestsCompleted()) {
            this.settlementController.State = SettlementControllerStateFactory.MakeRoutingState(this.settlementController);
            return;
        }
        else {
            this.updateProductionLists();
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

    private orderMineProduction(cells: Array<MaraPoint>): void {
        let mineConfigs = MaraUtils.GetAllMineConfigs(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(mineConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order mine production: no mine config available`);
            return;
        }

        let minePosition: MaraPoint | null = null;

        for (let cell of cells) {
            if (unitCanBePlacedByRealMap(MaraUtils.GetUnitConfig(cfgId), cell.X, cell.Y)) {
                minePosition = cell;
                break;
            }
        }

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

        MaraUtils.AddToMapItem(this.harvestersToOrder, cfgId, this.settlementController.Settings.ResourceMining.MinersPerMine);
    }

    private orderMiningProduction(): void {
        let targetExpand = this.settlementController.TargetExpand!;

        if (targetExpand.ResourceType.findIndex((value) => {return value == MaraResourceType.Gold}) >= 0) {
            this.orderMineProduction(targetExpand.Cluster!.GoldCells);
        }

        if (targetExpand.ResourceType.findIndex((value) => {return value == MaraResourceType.Metal}) >= 0) {
            this.orderMineProduction(targetExpand.Cluster!.MetalCells);
        }
        
        let metalStocks = MaraUtils.GetUnitsInArea(
            this.expandCenter, 
            this.settlementController.Settings.ResourceMining.MiningRadius,
            (unit) => {return MaraUtils.IsMetalStockConfig(unit.Cfg)}
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
        let sawmills = MaraUtils.GetUnitsInArea(
            this.expandCenter, 
            this.settlementController.Settings.ResourceMining.WoodcuttingRadius,
            (unit) => {return MaraUtils.IsSawmillConfig(unit.Cfg)}
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

        if (point && precision == 0) {
            this.strictPositionRequests.push(productionRequest);
        }
        else {
            this.positionlessRequests.push(productionRequest);
        }
    }

    private isStrictPositionRequestSatisfied(request: MaraProductionRequest): boolean {
        let unit = MaraUtils.GetUnit(request.Point);
            
        if (unit) {
            return (
                unit.Cfg.Uid == request.ConfigId &&
                unit.Cell.X == request.Point!.X &&
                unit.Cell.Y == request.Point!.Y &&
                !unit.EffectsMind.BuildingInProgress && 
                !unit.IsNearDeath
            );
        }
        else {
            return false;
        }
    }

    private isAllRequestsCompleted(): boolean {
        for (let request of this.strictPositionRequests) {
            let unit = MaraUtils.GetUnit(request.Point);
            
            if (unit) {
                if (
                    unit.Cfg.Uid == request.ConfigId &&
                    unit.Cell.X == request.Point!.X &&
                    unit.Cell.Y == request.Point!.Y &&
                    !unit.EffectsMind.BuildingInProgress && 
                    !unit.IsNearDeath
                ) {
                    continue;
                }
                else {
                    return false;
                }
            }
        }

        let developedComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();

        return MaraUtils.SetContains(developedComposition, this.targetComposition);
    }

    private updateProductionLists(): void {
        let orderedRequests = this.settlementController.ProductionController.ProductionRequests;
        let unorderedRequests: Array<MaraProductionRequest> = [];

        let developedComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();
        let compositionToRequest = MaraUtils.SubstractCompositionLists(this.targetComposition, developedComposition);

        for (let request of [...this.strictPositionRequests, ...this.positionlessRequests]) {
            let orderedRequest = orderedRequests.find((value) => {return value.EqualsTo(request)});
            
            if (!orderedRequest) {
                unorderedRequests.push(request);
            }
            else {
                MaraUtils.AddToMapItem(compositionToRequest, request.ConfigId, -1);
            }
        }

        for (let request of unorderedRequests) {
            if (request.Point && request.Precision == 0) {
                if (!this.isStrictPositionRequestSatisfied(request)) {
                    this.settlementController.ProductionController.RequestProduction(request);
                }

                MaraUtils.AddToMapItem(compositionToRequest, request.ConfigId, -1);
            }
        }

        compositionToRequest.forEach(
            (val, key) => {
                for (let i = 0; i < val; i++) {
                    this.settlementController.ProductionController.RequestCfgIdProduction(key);
                }
            }
        );
    }
}