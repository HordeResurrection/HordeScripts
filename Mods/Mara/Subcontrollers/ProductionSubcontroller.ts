
import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraProductionRequest } from "../Common/MaraProductionRequest";
import { MaraUtils } from "Mara/MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { enumerate, eNext } from "library/dotnet/dotnet-utils";
import { UnitComposition } from "../Common/UnitComposition";
import { MaraUnitCacheItem } from "../Common/Cache/MaraUnitCacheItem";
import { MaraRepairRequest } from "../Common/MaraRepairRequest";
import { SettlementClusterLocation } from "../Common/Settlement/SettlementClusterLocation";
import { MaraRect } from "../Common/MaraRect";
import { MaraUnitConfigCache } from "../Common/Cache/MaraUnitConfigCache";
import { MaraResources } from "../Common/MapAnalysis/MaraResources";
import { MaraUnitCache } from "../Common/Cache/MaraUnitCache";

export class ProductionSubcontroller extends MaraSubcontroller {
    private queuedRequests: Array<MaraProductionRequest> = [];
    private executingRequests: Array<MaraProductionRequest> = [];
    private repairRequests: Array<MaraRepairRequest> = [];
    private productionIndex: Map<string, Array<MaraUnitCacheItem>> | null = null;
    private producers: Array<MaraUnitCacheItem> = [];

    constructor (parent: MaraSettlementController) {
        super(parent);

        parent.Settlement.Units.UnitsListChanged.connect(
            (sender, UnitsListChangedEventArgs) => {
                this.onUnitListChanged(UnitsListChangedEventArgs);
            }
        );

        let allUnits = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);

        for (let unit of allUnits) {
            if (MaraUtils.IsProducerConfigId(unit.UnitCfgId)) {
                this.producers.push(unit);
            }
        }
    }

    private get productionCfgIdList(): Array<string> {
        let list = [...this.queuedRequests].map((value) => value.ConfigId);

        let masterMind = this.settlementController.MasterMind;
        let requests = enumerate(masterMind.Requests);
        let request;

        while ((request = eNext(requests)) !== undefined) {
            if (request.RequestedCfg) {
                list.push(request.RequestedCfg.Uid);
            }
        }
        
        return list;
    }

    Tick(tickNumber: number): void {
        if (tickNumber % 10 != 0) {
            return;
        }

        if (tickNumber % 50 == 0) {
            this.cleanupUnfinishedBuildings(tickNumber);
            this.cleanupRepairRequests();
            this.repairUnits();
        }

        this.productionIndex = null;
        let addedRequests: Array<MaraProductionRequest> = [];

        for (let request of this.queuedRequests) {
            let freeProducer = this.getProducer(request.ConfigId);
            
            if (freeProducer) {
                request.Executor = freeProducer;
                
                if (MaraUtils.RequestMasterMindProduction(request, this.settlementController.MasterMind)) {
                    this.settlementController.Debug(`Added ${request.ConfigId} to MM queue, producer: ${request.Executor!.Unit.ToString()}`);
                    addedRequests.push(request);
                    this.settlementController.ReservedUnitsData.ReserveUnit(freeProducer);
                }
            }
        }

        if (addedRequests.length > 0) {
            this.settlementController.Debug(`Removed ${addedRequests.length} units from target production list`);

            for (let request of addedRequests) {
                let index = this.queuedRequests.indexOf(request);

                if (index > -1) {
                    this.queuedRequests.splice(index, 1);
                }
            }

            this.executingRequests.push(...addedRequests);
        }
        
        if (this.executingRequests.length > 0) {
            let filteredRequests: Array<MaraProductionRequest> = [];
            
            for (let request of this.executingRequests) {
                if (request.IsCompleted) {
                    if (request.Executor) {
                        this.settlementController.ReservedUnitsData.FreeUnit(request.Executor);
                    }

                    request.OnProductionFinished();
                    this.settlementController.Debug(`Request ${request.ToString()} is completed with result ${request.IsSuccess}`);
                }
                else {
                    filteredRequests.push(request);
                }
            }

            this.executingRequests = filteredRequests;
        }
    }

    RequestProduction(request: MaraProductionRequest): void {
        this.queuedRequests.push(request);
        this.settlementController.Debug(`Added ${request.ToString()} to target production list`);

        if (request.IsForce) {
            this.requestAbsentProductionChainItemsProduction(request.ConfigId);
        }
    }

    RequestSingleCfgIdProduction(configId: string): void {
        if (this.productionCfgIdList.indexOf(configId) < 0) {
            this.requestCfgIdProduction(configId);
        }
    }

    ForceRequestSingleCfgIdProduction(configId: string): void {
        if (!this.productionIndex) {
            this.updateProductionIndex();
        }
        
        let producers = this.productionIndex!.get(configId);
        
        let producersCount = 0;
        let orderedCfgIdsCount = 0;

        if (producers) {
            producersCount = producers.length;
            
            for (let orderedCfgId of this.productionCfgIdList) {
                if (orderedCfgId == configId) {
                    orderedCfgIdsCount ++;
                }
            }
        }
        else {
            producersCount = 1;
        }
        
        if (orderedCfgIdsCount >= producersCount) {
            return;
        }
        
        this.requestCfgIdProduction(configId);
        this.requestAbsentProductionChainItemsProduction(configId);
    }

    CancelAllProduction(): void {
        this.queuedRequests = [];
        this.settlementController.Debug(`Cleared target production list`);
    }

    GetProduceableCfgIds(): Array<string> {
        if (!this.productionIndex) {
            this.updateProductionIndex();
        }
        
        return Array.from(this.productionIndex!.keys());
    }

    EstimateProductionTime(unitComposition: UnitComposition, searchProducers: boolean = false): Map<string, number> {
        let estimation = new Map<string, number>();
        
        if (!this.productionIndex) {
            this.updateProductionIndex();
        }

        unitComposition.forEach((value, key) => {
            let producers = this.productionIndex!.get(key);

            if (!producers) {
                if (searchProducers) {
                    estimation.set(key, Infinity);
                }
                else {
                    let config = MaraUtils.GetUnitConfig(key);
                    estimation.set(key, config.ProductionTime * value); //!!
                }
            }
            else {
                let producersCount = Math.min(producers.length, value);
                let config = MaraUtils.GetUnitConfig(key);
                let productionTime = config.ProductionTime * value / producersCount;

                estimation.set(key, productionTime);
            }
        });

        return estimation;
    }

    GetProducingCfgIds(cfgId: string): Array<string> {
        if (!this.productionIndex) {
            this.updateProductionIndex();
        }
        
        let producers = this.productionIndex!.get(cfgId);

        if (producers) {
            let cfgIds = new Set<string>();
            
            for (let producer of producers) {
                cfgIds.add(producer.UnitCfgId);
            }

            return Array.from(cfgIds);
        }
        else {
            return [];
        }
    }

    private onUnitListChanged(UnitsListChangedEventArgs: any): void {
        let cacheItem = MaraUnitCache.GetUnitById(UnitsListChangedEventArgs.Unit.Id);

        if (!cacheItem) {
            return;
        }

        if (!MaraUtils.IsProducerConfigId(cacheItem.UnitCfgId)) {
            return;
        }
        
        if (UnitsListChangedEventArgs.IsAdded) {
            this.producers.push(cacheItem);
        }
        else {
            this.producers = this.producers.filter((p) => p.UnitId != cacheItem.UnitId);
        }
    }

    private requestCfgIdProduction(configId: string): void {
        let request = new MaraProductionRequest(configId, null, null);
        this.queuedRequests.push(request);
        this.settlementController.Debug(`Added ${configId} to target production list`);
    }

    private requestAbsentProductionChainItemsProduction(configId: string): void {
        let requiredConfigs = MaraUtils.GetCfgIdProductionChain(configId, this.settlementController.Settlement);
        
        let existingUnits = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        let existingCfgIds = new Set<string>();

        for (let unit of existingUnits) {
            existingCfgIds.add(unit.UnitCfgId);
        }

        for (let cfg of requiredConfigs) {
            if (!existingCfgIds.has(cfg.Uid) && !this.productionCfgIdList.find((value) => {return value == cfg.Uid})) {
                this.requestCfgIdProduction(cfg.Uid);
            }
        }
    }

    private cleanupUnfinishedBuildings(tickNumber: number): void {
        let allUnits = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        let unfinishedBuildings = allUnits.filter((u) => MaraUtils.IsBuildingConfigId(u.UnitCfgId) && u.Unit.EffectsMind.BuildingInProgress);
        
        for (let building of unfinishedBuildings) {
            // 2 is needed since units are processed every second tick in the core logic
            let lastBuildingTick = building.Unit.OrdersMind.ActiveMotion.LastBuildTick * 2;

            if (lastBuildingTick) {
                if (tickNumber - lastBuildingTick > this.settlementController.Settings.Timeouts.UnfinishedConstructionThreshold) {
                    MaraUtils.IssueSelfDestructCommand([building], this.settlementController.Player);
                }
            }
        }
    }

    private repairUnits(): void {
        let repairZones = this.getRepairZones();
        
        let unitsToRepair: Array<MaraUnitCacheItem> = this.getUnitsToRepair(repairZones);
        
        let availableResources = this.settlementController.MiningController.GetStashedResourses();
        
        for (let unit of unitsToRepair) {
            let maxHealth = MaraUtils.GetConfigIdMaxHealth(unit.UnitCfgId);
            let missingHealth = unit.UnitHealth - maxHealth;

            let repairPrice = MaraUnitConfigCache.GetConfigProperty(
                unit.UnitCfgId, 
                (cfg) => {
                    let cost = this.settlementController.Settlement.Production.GetOneRepairContributionCost(cfg, 1)
                    return new MaraResources(cost.Lumber, cost.Metal, cost.Gold, cost.People)
                },
                "configIdRepairPrice"
            ) as MaraResources;

            let repairCost = repairPrice.Multiply(missingHealth);

            if (availableResources.IsGreaterOrEquals(repairCost)) {
                let repairer = this.getRepairer();
                
                if (repairer) {
                    let repairRequest = new MaraRepairRequest(unit, repairer);
                    this.settlementController.ReservedUnitsData.ReserveUnit(repairer);
                    MaraUtils.IssueRepairCommand([repairer], this.settlementController.Player, unit.UnitCell);

                    this.repairRequests.push(repairRequest);
                    this.settlementController.Debug(`Created repair request: ${repairRequest.ToString()}`);
                }
            }
        }
    }

    private getRepairZones(): Array<SettlementClusterLocation> {
        let result: Array<SettlementClusterLocation> = [];

        let settlementLocation = this.settlementController.GetSettlementLocation();

        if (settlementLocation) {
            result.push(settlementLocation);
        }
        else {
            return [];
        }
        
        for (let expandPoint of this.settlementController.Expands) {
            let expandRect = MaraRect.CreateFromPoint(
                expandPoint, 
                this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
            );

            let expandLocation = new SettlementClusterLocation(
                expandPoint,
                expandRect
            );

            result.push(expandLocation);
        }

        return result;
    }

    private getUnitsToRepair(repairZones: Array<SettlementClusterLocation>): Array<MaraUnitCacheItem> {
        let result: Array<MaraUnitCacheItem> = [];

        for (let zone of repairZones) {
            let zoneReparableUnits = MaraUtils.GetSettlementUnitsInArea(
                zone.BoundingRect,
                [this.settlementController.Settlement],
                (unit) => {
                    return (
                        MaraUtils.IsReparableConfigId(unit.UnitCfgId) &&
                        !unit.Unit.EffectsMind.BuildingInProgress
                    )
                },
                false
            );

            for (let unit of zoneReparableUnits) {
                if (unit.UnitHealth < MaraUtils.GetConfigIdMaxHealth(unit.UnitCfgId)) {
                    result.push(unit);
                }
            }
        }

        result = result.filter(
            (u) => !this.repairRequests.find(
                (r) => r.Target.UnitId == u.UnitId
            )
        );

        return result;
    }

    private cleanupRepairRequests(): void {
        let filteredRequests: Array<MaraRepairRequest> = [];

        for (let request of this.repairRequests) {
            if (
                !request.Executor.UnitIsAlive ||
                !request.Target.UnitIsAlive ||
                request.Executor.Unit.OrdersMind.OrdersCount == 0
            ) {
                this.finalizeRepairRequest(request);
            }
            else {
                filteredRequests.push(request);
            }
        }

        this.repairRequests = filteredRequests;
    }

    private finalizeRepairRequest(request: MaraRepairRequest): void {
        this.settlementController.Debug(`Finalized repair request: ${request.ToString()}`);
        this.settlementController.ReservedUnitsData.FreeUnit(request.Executor);
    }

    private getProducer(configId: string): MaraUnitCacheItem | null {
        if (!this.productionIndex) {
            this.updateProductionIndex();
        }

        let producers = this.productionIndex!.get(configId);

        if (producers) {
            for (let producer of producers) {
                if (
                    producer.Unit.OrdersMind.OrdersCount == 0 &&
                    !this.settlementController.ReservedUnitsData.IsUnitReserved(producer)
                ) {
                    return producer;
                }
            }

            for (let i = 0; i < this.settlementController.ReservedUnitsData.ReservableUnits.length; i++) {
                for (let producer of producers) {
                    if (this.settlementController.ReservedUnitsData.ReservableUnits[i].has(producer.UnitId)) {
                        return producer;
                    }
                }
            }
        }

        return null;
    }

    private getRepairer(): MaraUnitCacheItem | null {
        let allUnits = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        let allRepairers = allUnits.filter((u) => MaraUtils.IsRepairerConfigId(u.UnitCfgId) && u.UnitIsAlive);

        for (let repairer of allRepairers) {
            if (
                repairer.Unit.OrdersMind.OrdersCount == 0 &&
                !this.settlementController.ReservedUnitsData.IsUnitReserved(repairer)
            ) {
                return repairer;
            }
        }

        for (let i = 0; i < this.settlementController.ReservedUnitsData.ReservableUnits.length; i++) {
            for (let repairer of allRepairers) {
                if (this.settlementController.ReservedUnitsData.ReservableUnits[i].has(repairer.UnitId)) {
                    return repairer;
                }
            }
        }

        return null;
    }

    private updateProductionIndex(): void {
        this.productionIndex = new Map<string, Array<MaraUnitCacheItem>>();
        
        let producers = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        producers = producers.filter((unit) => unit.UnitIsAlive && !unit.Unit.EffectsMind.BuildingInProgress);

        let requirementsCache = new Map<string, boolean>();
        
        for (let unit of producers) {
            let possibleProduceableCfgIds = MaraUtils.GetConfigIdProducedConfigIds(unit.UnitCfgId);

            let produceableCfgIds = possibleProduceableCfgIds.filter((cfgId) => {
                if (!requirementsCache.has(cfgId)) {
                    let unitConfig = MaraUtils.GetUnitConfig(cfgId);
                    let isCfgIdProduceable = this.configProductionRequirementsMet(unitConfig);

                    requirementsCache.set(cfgId, isCfgIdProduceable);
                    
                    return isCfgIdProduceable;
                }
                else {
                    return requirementsCache.get(cfgId);
                }
            });
            
            for (let cfgId of produceableCfgIds!) {
                if (this.productionIndex.has(cfgId)) {
                    let producers = this.productionIndex.get(cfgId);
                    producers!.push(unit);
                }
                else {
                    this.productionIndex.set(cfgId, [unit]);
                }
            }
        }
    }

    private configProductionRequirementsMet(config: any): boolean {
        return this.settlementController.Settlement.TechTree.HasUnmetRequirements(config);
    }
}