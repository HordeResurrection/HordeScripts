
//TODO: probably reorganize build list to a queue

import { MaraSettlementController } from "Mara/MaraSettlementController";
import { eNext, enumerate } from "Mara/Utils/Common";
import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { MaraSubcontroller } from "./MaraSubcontroller";

export class ProductionSubcontroller extends MaraSubcontroller {
    private productionList: Array<string> = [];
    private productionIndex: Map<string, Array<any>> | null = null;

    constructor (parent: MaraSettlementController) {
        super(parent);
    }
    
    Tick(tickNumber: number): void {
        if (tickNumber % 10 != 0) {
            return;
        }

        this.productionIndex = null;
        
        let mmProductionDepartament = this.parentController.MasterMind.ProductionDepartment;
        let orderedUnits: Array<string> = [];

        for (let unitConfigId of this.productionList) {
            let freeProducer = this.getProducer(unitConfigId);
            
            //!! most probably doesn't work as expected since producer is always free on this tick
            if (freeProducer) {
                if (MaraUtils.RequestMasterMindProduction(unitConfigId, mmProductionDepartament)) {
                    this.parentController.Debug(`Added ${unitConfigId} to the production list`);
                    orderedUnits.push(unitConfigId);
                }
            }
        }

        if (orderedUnits.length > 0) {
            this.parentController.Debug(`Removed ${orderedUnits.length} units from target production list`);

            for (let cfg of orderedUnits) {
                let index = this.productionList.indexOf(cfg);

                if (index > -1) {
                    this.productionList.splice(index, 1);
                }
            }
        }
    }

    public get ProductionList(): Array<string> {
        let list = [...this.productionList];

        let masterMind = this.parentController.MasterMind;
        let requests = enumerate(masterMind.Requests);
        let request;

        while ((request = eNext(requests)) !== undefined) {
            if (request.RequestedCfg) {
                list.push(request.RequestedCfg.Uid);
            }
        }
        
        return list;
    }

    RequestProduction(configId: string): void {
        this.productionList.push(configId);
        this.parentController.Debug(`Added ${configId} to target production list`);
    }

    RequestSingleProduction(configId: string): void {
        if (this.ProductionList.indexOf(configId) < 0) {
            this.RequestProduction(configId);
        }
    }

    ForceRequestSingleProduction(configId: string): void {
        let masterMind = this.parentController.MasterMind;
        let requests = enumerate(masterMind.Requests);
        let request;

        while ((request = eNext(requests)) !== undefined) {
            if (request.RequestedCfg) {
                if (request.RequestedCfg.Uid == configId)  {
                    return;
                }
            }
        }
        
        let mmProductionDepartament = this.parentController.MasterMind.ProductionDepartment;
        MaraUtils.RequestMasterMindProduction(configId, mmProductionDepartament);
    }

    CancelAllProduction(): void {
        this.productionList = [];
        this.parentController.Debug(`Cleared target production list`);
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

    private getProducer(configId: string): any {
        if (!this.productionIndex) {
            this.updateProductionIndex();
        }
        
        //TODO: implement engagement of workers that are busy gathering resources
        let producers = this.productionIndex!.get(configId);

        if (producers) {
            for (let producer of producers) {
                if (producer.OrdersMind.OrdersCount === 0) {
                    return producer;
                }
            }
        }

        return null;
    }

    private updateProductionIndex(): void {
        this.productionIndex = new Map<string, Array<any>>();

        let units = enumerate(this.parentController.Settlement.Units);
        let unit;
        
        while ((unit = eNext(units)) !== undefined) {
            let producerParams = unit.Cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer, true);
            
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
                    
                    if (this.productionIndex.has(produceListItem.Uid)) {
                        let producers = this.productionIndex.get(produceListItem.Uid);
                        producers!.push(unit);
                    }
                    else {
                        this.productionIndex.set(produceListItem.Uid, [unit]);
                    }
                }
            }
        }
    }

    private configProductionRequirementsMet(config: any): boolean {
        return this.parentController.Settlement.TechTree.AreRequirementsSatisfied(config);    
    }
}