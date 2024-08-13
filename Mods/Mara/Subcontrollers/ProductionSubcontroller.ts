
import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraProductionRequest } from "Mara/Utils/Common";
import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { enumerate, eNext } from "library/dotnet/dotnet-utils";

export class ProductionSubcontroller extends MaraSubcontroller {
    private queuedRequests: Array<MaraProductionRequest> = [];
    private executingRequests: Array<MaraProductionRequest> = [];
    private productionIndex: Map<string, Array<any>> | null = null;

    constructor (parent: MaraSettlementController) {
        super(parent);
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

        this.productionIndex = null;
        let addedRequests: Array<MaraProductionRequest> = [];

        for (let request of this.queuedRequests) {
            let freeProducer = this.getProducer(request.ConfigId);

            if (freeProducer) {
                request.Executor = freeProducer;
                
                if (MaraUtils.RequestMasterMindProduction(request, this.settlementController.MasterMind)) {
                    this.settlementController.Debug(`Added ${request.ConfigId} to MM queue, producer: ${request.Executor.ToString()}`);
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
                }
                else {
                    filteredRequests.push(request);
                }
            }

            this.executingRequests = filteredRequests;
        }

        this.cleanupUnfinishedBuildings(tickNumber);
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
                    estimation.set(key, config.ProductionTime * value);
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
                cfgIds.add(producer.Cfg.Uid);
            }

            return Array.from(cfgIds);
        }
        else {
            return [];
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
            existingCfgIds.add(unit.Cfg.Uid);
        }

        for (let cfg of requiredConfigs) {
            if (!existingCfgIds.has(cfg.Uid) && !this.productionCfgIdList.find((value) => {return value == cfg.Uid})) {
                this.requestCfgIdProduction(cfg.Uid);
            }
        }
    }

    private cleanupUnfinishedBuildings(tickNumber: number) {
        let allUnits = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        let unfinishedBuildings = allUnits.filter((u) => MaraUtils.IsBuildingConfig(u.Cfg) && u.EffectsMind.BuildingInProgress);
        
        for (let building of unfinishedBuildings) {
            // 2 is needed since units are processed every second tick in the core logic
            let lastBuildingTick = building.OrdersMind.ActiveMotion.LastBuildTick * 2;

            if (lastBuildingTick) {
                if (tickNumber - lastBuildingTick > this.settlementController.Settings.Timeouts.UnfinishedConstructionThreshold) {
                    MaraUtils.IssueSelfDestructCommand([building], this.settlementController.Player);
                }
            }
        }
    }

    private getProducer(configId: string): any {
        if (!this.productionIndex) {
            this.updateProductionIndex();
        }

        let producers = this.productionIndex!.get(configId);

        if (producers) {
            for (let producer of producers) {
                if (
                    producer.OrdersMind.OrdersCount == 0 &&
                    !this.settlementController.ReservedUnitsData.IsUnitReserved(producer)
                ) {
                    return producer;
                }
            }

            for (let i = 0; i < this.settlementController.ReservedUnitsData.ReservableUnits.length; i++) {
                for (let producer of producers) {
                    if (this.settlementController.ReservedUnitsData.ReservableUnits[i].has(producer.Id)) {
                        return producer;
                    }
                }
            }
        }

        return null;
    }

    private updateProductionIndex(): void {
        this.productionIndex = new Map<string, Array<any>>();

        let cfgCache = new Map<string, Array<string>>();

        let units = enumerate(this.settlementController.Settlement.Units);
        let unit;
        
        while ((unit = eNext(units)) !== undefined) {
            let unitCfgId = unit.Cfg.Uid;
            
            if (!cfgCache.has(unitCfgId)) {
                let producerParams = unit.Cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer, true);
                let producedCfgIds:Array<string> = [];
            
                if (producerParams) {
                    if (!unit.IsAlive || unit.EffectsMind.BuildingInProgress) {
                        continue;
                    }
                    
                    let produceList = enumerate(producerParams.CanProduceList);
                    let produceListItem;

                    while ((produceListItem = eNext(produceList)) !== undefined) {
                        if (!this.configProductionRequirementsMet(produceListItem)) {
                            continue;
                        }
                        
                        producedCfgIds.push(produceListItem.Uid);
                    }
                }

                cfgCache.set(unitCfgId, producedCfgIds);
            }

            let produceableCfgIds = cfgCache.get(unitCfgId);

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