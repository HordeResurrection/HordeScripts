import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { MaraResourceType } from "../MaraResourceMap";
import { MaraSettlementCluster } from "../MaraSettlementController";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraPoint, MaraProductionRequest } from "../Utils/Common";
import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class ExpandBuildState extends MaraSettlementControllerState {
    private expandSettlementCluster: MaraSettlementCluster;
    private positionedRequests: Array<MaraProductionRequest>;
    private positionlessRequests: Array<MaraProductionRequest>;
    private targetComposition: UnitComposition;
    
    public OnEntry(): void {
        if (!this.fillExpandCluster()) {
            this.settlementController.State = SettlementControllerStateFactory.MakeIdleState(this.settlementController);
            return;
        }

        this.positionedRequests = [];
        this.positionlessRequests = [];
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

        this.targetComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();

        for (let request of this.positionlessRequests) {
            MaraUtils.IncrementMapItem(this.targetComposition, request.ConfigId);
        }
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
        if (tickNumber % 10 != 0) {
            return;
        }

        if (this.isAllRequestsCompleted()) {
            this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
        }
        else {
            this.updateProductionLists();
        }
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
                this.expandSettlementCluster = cluster;
                break;
            }
        }

        if (!this.expandSettlementCluster) {
            this.expandSettlementCluster = new MaraSettlementCluster();
            this.expandSettlementCluster.Center = expandCenter;
            this.expandSettlementCluster.SettlementController = this.settlementController;
            this.settlementController.SettlementClusters.push(this.expandSettlementCluster);
        }
        
        if (targetResourceCluster) {
            this.expandSettlementCluster.ResourceClusters.push(targetResourceCluster);
        }

        return true;
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

        this.orderProducion(cfgId, minePosition, null);

        let harvesterConfigs = MaraUtils.GetAllHarvesterConfigs(this.settlementController.Settlement);
        cfgId = this.selectConfigId(harvesterConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order mine production: no harvester config available`);
            return;
        }

        for (let i = 0; i < 3; i++) { //TODO: add this 3 into settings
            this.orderProducion(cfgId, null, null);
        }
    }

    private orderMiningProduction(): void {
        let targetExpand = this.settlementController.TargetExpand!;

        if (targetExpand.ResourceType.findIndex((value) => {return value == MaraResourceType.Gold}) >= 0) {
            this.orderMineProduction(targetExpand.Cluster!.GoldCells);
        }

        if (targetExpand.ResourceType.findIndex((value) => {return value == MaraResourceType.Metal}) >= 0) {
            this.orderMineProduction(targetExpand.Cluster!.MetalCells);
        }

        let expandClusterBuildings = this.expandSettlementCluster.Buildings;
        let isMetalStockPresent = false;

        for (let building of expandClusterBuildings) {
            if (MaraUtils.IsMetalStockConfig(building.Cfg)) {
                isMetalStockPresent = true;
                break;
            }
        }

        if (!isMetalStockPresent) {
            let metalStockConfigs = MaraUtils.GetAllMetalStockConfigs(this.settlementController.Settlement);
            let cfgId = this.selectConfigId(metalStockConfigs);

            if (cfgId == null) {
                this.settlementController.Debug(`Unable to order mining production: no metal stock config available`);
                return;
            }

            this.orderProducion(cfgId, this.expandSettlementCluster.Center, null);
        }
    }
    
    private orderWoodcuttingProduction(): void {
        let expandClusterBuildings = this.expandSettlementCluster.Buildings;
        let isSawmillPresent = false;

        for (let building of expandClusterBuildings) {
            if (MaraUtils.IsSawmillConfig(building.Cfg)) {
                isSawmillPresent = true;
                break;
            }
        }
        
        if (!isSawmillPresent) {
            let sawmillConfigs = MaraUtils.GetAllSawmillConfigs(this.settlementController.Settlement);
            let cfgId = this.selectConfigId(sawmillConfigs);

            if (cfgId == null) {
                this.settlementController.Debug(`Unable to order woodcutting production: no sawmill config available`);
                return;
            }

            this.orderProducion(cfgId, this.expandSettlementCluster.Center, null);
        }

        let harvesterConfigs = MaraUtils.GetAllHarvesterConfigs(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(harvesterConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order woodcutting production: no harvester config available`);
            return;
        }

        for (let i = 0; i < 5; i++) { //TODO: add this 5 into settings
            this.orderProducion(cfgId, null, null);
        }
    }

    private orderHousingProduction() {
        let housingConfigs = MaraUtils.GetAllHousingConfigs(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(housingConfigs);
        
        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order housing production: no housing config available`);
            return;
        }

        for (let i = 0; i < 5; i++) { //TODO: add this 5 into settings
            this.orderProducion(cfgId, null, null);
        }
    }

    private orderProducion(configId: string, point: MaraPoint | null, precision: number | null): void {
        let productionRequest = new MaraProductionRequest(configId, point, precision);
        this.settlementController.ProductionController.RequestProduction(productionRequest);

        if (point) {
            this.positionedRequests.push(productionRequest);
        }
        else {
            this.positionlessRequests.push(productionRequest);
        }
    }

    private isPositionedRequestSatisfied(request: MaraProductionRequest): boolean {
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
        for (let request of this.positionedRequests) {
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

        for (let request of [...this.positionedRequests, ...this.positionlessRequests]) {
            let orderedRequest = orderedRequests.find((value) => {return value.EqualsTo(request)});
            
            if (!orderedRequest) {
                unorderedRequests.push(request);
            }
        }

        let unpositionedComposition: UnitComposition = new Map<string, number>();

        for (let request of unorderedRequests) {
            if (request.Point) {
                if (!this.isPositionedRequestSatisfied(request)) {
                    this.settlementController.ProductionController.RequestProduction(request);
                }
            }
            else {
                MaraUtils.IncrementMapItem(unpositionedComposition, request.ConfigId);
            }
        }

        let developedComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();
        let compositionToRequest = MaraUtils.SubstractCompositionLists(unpositionedComposition, developedComposition);

        compositionToRequest.forEach(
            (val, key) => {
                for (let i = 0; i < val; i++) {
                    this.settlementController.ProductionController.RequestCfgIdProduction(key);
                }
            }
        );
    }
}