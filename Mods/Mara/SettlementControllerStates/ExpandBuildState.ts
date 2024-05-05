import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { MaraResourceType } from "../MaraResourceMap";
import { MaraSettlementCluster } from "../MaraSettlementController";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraPoint, MaraProductionRequest } from "../Utils/Common";
import { MaraUtils } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class ExpandBuildState extends MaraSettlementControllerState {
    private expandSettlementCluster: MaraSettlementCluster;
    
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
        //TODO: add checking if some requests need to be re-requested
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

        let productionRequest = new MaraProductionRequest(cfgId, minePosition, null);
        this.settlementController.ProductionController.RequestProduction(productionRequest);

        let harvesterConfigs = MaraUtils.GetAllHarvesterConfigs(this.settlementController.Settlement);
        cfgId = this.selectConfigId(harvesterConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order mine production: no harvester config available`);
            return;
        }

        for (let i = 0; i < 3; i++) { //TODO: add this 3 into settings
            let productionRequest = new MaraProductionRequest(cfgId, null, null);
            this.settlementController.ProductionController.RequestProduction(productionRequest);
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

            let productionRequest = new MaraProductionRequest(cfgId, this.expandSettlementCluster.Center, null);
            this.settlementController.ProductionController.RequestProduction(productionRequest);
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

            let productionRequest = new MaraProductionRequest(cfgId, this.expandSettlementCluster.Center, null);
            this.settlementController.ProductionController.RequestProduction(productionRequest);
        }

        let harvesterConfigs = MaraUtils.GetAllHarvesterConfigs(this.settlementController.Settlement);
        let cfgId = this.selectConfigId(harvesterConfigs);

        if (cfgId == null) {
            this.settlementController.Debug(`Unable to order woodcutting production: no harvester config available`);
            return;
        }

        for (let i = 0; i < 5; i++) { //TODO: add this 5 into settings
            let productionRequest = new MaraProductionRequest(cfgId, null, null);
            this.settlementController.ProductionController.RequestProduction(productionRequest);
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
            let productionRequest = new MaraProductionRequest(cfgId, null, null);
            this.settlementController.ProductionController.RequestProduction(productionRequest);
        }
    }
}