import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraTaskableSubcontroller } from "./MaraTaskableSubcontroller";
import { SettlementSubcontrollerTask } from "../SettlementSubcontrollerTasks/SettlementSubcontrollerTask";
import { MaraUtils } from "../MaraUtils";
import { UnitComposition } from "../Common/UnitComposition";
import { DevelopSettlementTask } from "../SettlementSubcontrollerTasks/DevelopmentSubcontroller/DevelopSettlementTask/DevelopSettlementTask";

export class DevelopmentSubcontroller extends MaraTaskableSubcontroller {
    protected onTaskSuccess(tickNumber: number): void {
        this.nextTaskAttemptTick = tickNumber + MaraUtils.Random(
            this.settlementController.MasterMind,
            this.settlementController.Settings.Timeouts.SettlementEnhanceMaxCooldown,
            this.settlementController.Settings.Timeouts.SettlementEnhanceMinCooldown
        );
    }

    protected onTaskFailure(tickNumber: number): void {
        this.nextTaskAttemptTick = tickNumber + MaraUtils.Random(
            this.settlementController.MasterMind,
            60 * 50
        );
    }

    constructor (parent: MaraSettlementController) {
        super(parent);
    }

    protected doRoutines(tickNumber: number): void {
        //do nothing
    }

    protected makeSelfTask(tickNumber: number): SettlementSubcontrollerTask | null {
        let economyComposition = this.settlementController.GetCurrentEconomyComposition();
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();

        let shortestUnavailableChain = this.getShortestUnavailableChain(economyComposition, produceableCfgIds);

        let selectedCfgIds: Array<string> | null = null;
    
        if (shortestUnavailableChain) {
            selectedCfgIds = shortestUnavailableChain;
        }
        else {
            this.Debug(`All strategy production chains are unlocked, proceeding to enhance settlement`);
            
            let economyBoosterChain: Array<string> = this.getEconomyBoosterAndChain(economyComposition);
            this.Debug(`Economy boosters & chain: ${economyBoosterChain.join(", ")}`);

            let healerChain: Array<string> = this.getHealerAndChain(economyComposition);
            this.Debug(`Healers & chain: ${healerChain.join(", ")}`);

            let reinforcementProducer: Array<string> = this.getReinforcementProducer(economyComposition);
            this.Debug(`Reinforcements producers: ${reinforcementProducer.join(", ")}`);
            
            let cfgIdSet = [economyBoosterChain, healerChain, reinforcementProducer];
            cfgIdSet.filter((item) => item.length > 0);

            selectedCfgIds = MaraUtils.RandomSelect(this.settlementController.MasterMind, cfgIdSet);
        }

        if (selectedCfgIds) {
            return new DevelopSettlementTask(selectedCfgIds, this.settlementController, this);
        }
        else {
            this.nextTaskAttemptTick = tickNumber + MaraUtils.Random(
                this.settlementController.MasterMind,
                this.settlementController.Settings.Timeouts.DefaultTaskReattemptMaxCooldown
            );

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
            let atLeastOneItemProduceable = false;
            
            for (let cfgId of item.ProductionChain) {
                if (!economyComposition.has(cfgId)) {
                    unavailableChain.push(cfgId);

                    let index = produceableCfgIds.findIndex((v) => v == cfgId);

                    if (index >= 0) {
                        atLeastOneItemProduceable = true;
                    }
                }
            }

            if (
                atLeastOneItemProduceable && 
                (
                    !shortestUnavailableChain || 
                    unavailableChain.length < shortestUnavailableChain.length
                )    
            ) {
                shortestUnavailableChain = unavailableChain;
            }
        }

        return shortestUnavailableChain;
    }

    private getEconomyBoosterAndChain(economyComposition: UnitComposition) {
        let developmentBoosterCount = 0;

        economyComposition.forEach((value, key) => {
            if (MaraUtils.IsEconomyBoosterConfigId(key)) {
                developmentBoosterCount += value;
            }
        });

        let censusModel = MaraUtils.GetSettlementCensusModel(this.settlementController.Settlement);
        let peopleLevels = censusModel.PeopleIncomeLevels;
        let maxDevelopmentBoosters = peopleLevels.Item.get(peopleLevels.Count - 1)!.GrowthBuildings;

        if (developmentBoosterCount < maxDevelopmentBoosters) {
            let possibleEconomyBoosters = MaraUtils.GetAllEconomyBoosterConfigIds(this.settlementController.Settlement);
            let economyBooster = MaraUtils.RandomSelect(this.settlementController.MasterMind, possibleEconomyBoosters);

            if (economyBooster) {
                return this.addTechChain(economyBooster, economyComposition);
            }
        }

        return [];
    }

    private getHealerAndChain(economyComposition: UnitComposition): Array<string> {
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

    private getReinforcementProducer(economyComposition: UnitComposition): Array<string> {
        let reinforcementProducers: Array<string> = [];
        
        let globalStrategy = this.settlementController.StrategyController.GlobalStrategy;
        let combatCfgIds = [...globalStrategy.OffensiveCfgIds, ...globalStrategy.DefensiveBuildingsCfgIds];

        let minProducerCount = Infinity;
        let slowestProduceCfgId: string | null = null;
        
        for (let selectionItem of combatCfgIds) {
            let producingCfgIds = this.settlementController.ProductionController.GetProducingCfgIds(selectionItem.CfgId);

            if (producingCfgIds.length > 0) {
                let totalProducerCount = 0;

                for (let cfgId of producingCfgIds) {
                    if (economyComposition.has(cfgId)) {
                        totalProducerCount += economyComposition.get(cfgId)!;
                    }
                }

                if (totalProducerCount < minProducerCount) {
                    minProducerCount = totalProducerCount;
                    slowestProduceCfgId = selectionItem.CfgId;
                }
            }
        }

        if (slowestProduceCfgId && minProducerCount < this.settlementController.Settings.ControllerStates.MaxSameCfgIdProducerCount) {
            let producingCfgIds = this.settlementController.ProductionController.GetProducingCfgIds(slowestProduceCfgId);
            let producerCfgId = MaraUtils.RandomSelect(this.settlementController.MasterMind, producingCfgIds);

            if (producerCfgId) {
                reinforcementProducers.push(producerCfgId);
            }
        }

        return reinforcementProducers;
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