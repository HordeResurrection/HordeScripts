import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraTaskableSubcontroller } from "./MaraTaskableSubcontroller";
import { SettlementSubcontrollerTask } from "../SettlementSubcontrollerTasks/SettlementSubcontrollerTask";
import { MaraUtils } from "../MaraUtils";
import { UnitComposition } from "../Common/UnitComposition";
import { DevelopSettlementTask } from "../SettlementSubcontrollerTasks/DevelopmentSubcontroller/DevelopSettlementTask/DevelopSettlementTask";

export class DevelopmentSubcontroller extends MaraTaskableSubcontroller {
    protected get successfulSelfTaskCooldown(): number {
        return MaraUtils.Random(
            this.settlementController.MasterMind,
            this.settlementController.Settings.Timeouts.SettlementEnhanceMaxCooldown,
            this.settlementController.Settings.Timeouts.SettlementEnhanceMinCooldown
        );
    }
    
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

        let economyBoosters: Array<string> = this.getEconomyBoosters(economyComposition);
        this.Debug(`Economy boosters & chain: ${economyBoosters.join(", ")}`);

        let healers: Array<string> = this.getHealers(economyComposition);
        this.Debug(`Healers & chain: ${healers.join(", ")}`);

        let selectedCfgIds: Array<string> | null = null;
    
        if (shortestUnavailableChain) {
            selectedCfgIds = shortestUnavailableChain;
        }
        else if (
            economyBoosters.length > 0 ||
            healers.length > 0
        ) {
            let cfgIdSet = [economyBoosters, healers];
            cfgIdSet.filter((item) => item.length > 0);
            
            selectedCfgIds = MaraUtils.RandomSelect(this.settlementController.MasterMind, cfgIdSet);
        }

        if (selectedCfgIds) {
            return new DevelopSettlementTask(selectedCfgIds, this.settlementController, this);
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