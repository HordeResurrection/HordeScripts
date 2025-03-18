import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraTaskableSubcontroller } from "./MaraTaskableSubcontroller";
import { SettlementSubcontrollerTask } from "../SettlementSubcontrollerTasks/SettlementSubcontrollerTask";
import { MaraUtils } from "../MaraUtils";
import { UnitComposition } from "../Common/UnitComposition";
import { DevelopSettlementTask } from "../SettlementSubcontrollerTasks/DevelopmentSubcontroller/DevelopSettlementTask/DevelopSettlementTask";

export class DevelopmentSubcontroller extends MaraTaskableSubcontroller {
    constructor (parent: MaraSettlementController) {
        super(parent);
    }

    protected doRoutines(tickNumber: number): void {
        //do nothing
    }

    protected makeSelfTask(): SettlementSubcontrollerTask | null {
        let economyComposition = this.settlementController.GetCurrentEconomyComposition();
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();

        let shortestUnavailableChain = this.getShortestUnavailableChain(economyComposition, produceableCfgIds);

        let reinforcementProducers: Array<string> = this.getReinforcementProducers(economyComposition);
        this.settlementController.Debug(`Reinforcements producers: ${reinforcementProducers.join(", ")}`);

        let economyBoosters: Array<string> = this.getEconomyBoosters(economyComposition);
        this.settlementController.Debug(`Economy boosters & chain: ${economyBoosters.join(", ")}`);

        let healers: Array<string> = this.getHealers(economyComposition);
        this.settlementController.Debug(`Healers & chain: ${healers.join(", ")}`);

        let selectedCfgIds: Array<string> | null = null;
    
        if (shortestUnavailableChain) {
            selectedCfgIds = shortestUnavailableChain;
        }
        else if (
            reinforcementProducers.length > 0 || 
            economyBoosters.length > 0 ||
            healers.length > 0
        ) {
            let cfgIdSet = [reinforcementProducers, economyBoosters, healers];
            cfgIdSet.filter((item) => item.length > 0);
            
            selectedCfgIds = MaraUtils.RandomSelect(this.settlementController.MasterMind, cfgIdSet);
        }

        if (selectedCfgIds) {
            return new DevelopSettlementTask(1, selectedCfgIds, this.settlementController, this.settlementController);
        }
        else {
            return null;
        }
    }

    private getShortestUnavailableChain(economyComposition: UnitComposition, produceableCfgIds: Array<string>): Array<string> | null {
        let globalStrategy = this.settlementController.StrategyController.GlobalStrategy;
        let allRequiredCfgIdItems = [...globalStrategy.DefensiveBuildingsCfgIds, ...globalStrategy.OffensiveCfgIds];
        
        let unavailableCfgIdItems = allRequiredCfgIdItems.filter(
            (value) => {
                return produceableCfgIds.findIndex((item) => item == value.CfgId) < 0
            }
        )

        let shortestUnavailableChain: Array<string> | null = null;
        
        for (let item of unavailableCfgIdItems) {
            let unavailableChain: Array<string> = [];
            
            for (let cfgId of item.ProductionChain) {
                if (!economyComposition.has(cfgId)) {
                    unavailableChain.push(cfgId);
                }
            }

            if (
                !shortestUnavailableChain || 
                unavailableChain.length < shortestUnavailableChain.length
            ) {
                shortestUnavailableChain = unavailableChain;
            }
        }

        return shortestUnavailableChain;
    }

    private getReinforcementProducers(economyComposition: UnitComposition): Array<string> {
        let reinforcementProducers: Array<string> = [];
        
        let combatComposition = this.settlementController.StrategyController.GetSettlementAttackArmyComposition();
        let estimation = this.settlementController.ProductionController.EstimateProductionTime(combatComposition);

        estimation.forEach((value, key) => {
            if (value > this.settlementController.Settings.Timeouts.UnitProductionEstimationThreshold / 2) {
                let producingCfgIds = this.settlementController.ProductionController.GetProducingCfgIds(key);

                if (producingCfgIds.length > 0) {
                    let totalProducerCount = 0;

                    for (let cfgId of producingCfgIds) {
                        if (economyComposition.has(cfgId)) {
                            totalProducerCount += economyComposition.get(cfgId)!;
                        }
                    }

                    if (totalProducerCount < this.settlementController.Settings.ControllerStates.MaxSameCfgIdProducerCount) {
                        let producerCfgId = MaraUtils.RandomSelect(this.settlementController.MasterMind, producingCfgIds);
                        reinforcementProducers.push(producerCfgId!);
                    }
                }
            }
        });

        return reinforcementProducers;
    }

    private getEconomyBoosters(economyComposition: UnitComposition) {
        let developmentBoosterCount = 0;

        economyComposition.forEach((value, key) => {
            if (MaraUtils.IsEconomyBoosterConfigId(key)) {
                developmentBoosterCount += value;
            }
        });

        let censusModel = MaraUtils.GetSettlementCensusModel(this.settlementController.Settlement);
        let peopleLevels = censusModel.PeopleIncomeLevels;
        let maxDevelopmentBoosters = peopleLevels.Item(peopleLevels.Count - 1).GrowthBuildings;

        if (developmentBoosterCount < maxDevelopmentBoosters) {
            let possibleEconomyBoosters = MaraUtils.GetAllEconomyBoosterConfigIds(this.settlementController.Settlement);
            let economyBooster = MaraUtils.RandomSelect(this.settlementController.MasterMind, possibleEconomyBoosters);

            if (economyBooster) {
                return this.addTechChain(economyBooster, economyComposition);
            }
        }

        return [];
    }

    private getHealers(economyComposition: UnitComposition): Array<string> {
        let atLeastOneHealerPresent = false;
        
        economyComposition.forEach((value, key) => {
            if (MaraUtils.IsHealerConfigId(key) && MaraUtils.IsBuildingConfigId(key)) {
                atLeastOneHealerPresent = true;
            }
        });

        if (atLeastOneHealerPresent) {
            return [];
        }

        let possbleHealers = MaraUtils.GetAllHealerConfigIds(this.settlementController.Settlement);

        if (possbleHealers.length > 0) {
            let cfgId = MaraUtils.RandomSelect(this.settlementController.MasterMind, possbleHealers)!
            
            return this.addTechChain(cfgId, economyComposition);
        }
        else {
            return [];
        }
    }

    private addTechChain(cfgId: string, economyComposition: UnitComposition): Array<string> {
        let result = [cfgId];
        
        let chain = MaraUtils.GetCfgIdProductionChain(cfgId, this.settlementController.Settlement);
        let chainCfgIds = chain.map((value) => value.Uid);

        for (let chainCfgId of chainCfgIds) {
            if (!economyComposition.has(chainCfgId)) {
                result.push(chainCfgId);
            }
        }

        return result;
    }
}