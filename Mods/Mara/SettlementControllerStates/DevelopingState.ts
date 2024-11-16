import { MaraUtils } from "Mara/MaraUtils";
import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { MaraProductionRequest } from "../Common/MaraProductionRequest";
import { MaraResources } from "../Common/MapAnalysis/MaraResources";
import { UnitComposition } from "../Common/UnitComposition";

export class DevelopingState extends ProductionState {
    protected getProductionRequests(): Array<MaraProductionRequest> {
        let economyComposition = this.settlementController.GetCurrentEconomyComposition();
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();

        let result = this.getHarvestersProductionRequests(economyComposition);

        let shortestUnavailableChain = this.getShortestUnavailableChain(economyComposition, produceableCfgIds);

        let reinforcementProducers: Array<string> = this.getReinforcementProducers(economyComposition);
        this.settlementController.Debug(`Reinforcements producers: ${reinforcementProducers.join(", ")}`);

        let economyBoosters: Array<string> = this.getEconomyBoosters(economyComposition, produceableCfgIds);
        this.settlementController.Debug(`Economy boosters: ${economyBoosters.join(", ")}`);

        let selectedCfgIds: Array<string> | null = null;
 
        if (shortestUnavailableChain) {
            selectedCfgIds = shortestUnavailableChain;
        }
        else if (
            reinforcementProducers.length > 0 || 
            economyBoosters.length > 0
        ) {
            let cfgIdSet = [reinforcementProducers, economyBoosters];
            cfgIdSet.filter((item) => item.length > 0);
            
            selectedCfgIds = MaraUtils.RandomSelect(this.settlementController.MasterMind, cfgIdSet);
        }

        if (selectedCfgIds) {
            for (let item of selectedCfgIds) {
                result.push(this.makeProductionRequest(item, null, null));
            }
        }

        return result;
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
    }

    protected onInsufficientResources(insufficientResources: MaraResources): boolean {
        this.settlementController.Debug(`Preparing expand`);
        
        this.fillExpandData(insufficientResources);
        this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
        return false;
    }

    protected getProductionTimeout(): number {
        return this.settlementController.Settings.Timeouts.Develop;
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

    private getHarvestersProductionRequests(economyComposition: UnitComposition): Array<MaraProductionRequest> {
        let result = new Array<MaraProductionRequest>();

        let harvesterCount = 0;

        economyComposition.forEach((value, key) => {
            if (MaraUtils.IsHarvesterConfigId(key)) {
                harvesterCount += value;
            }
        });

        let maxHarvesterCount = this.settlementController.MiningController.GetOptimalHarvesterCount();
        let orderedHarvestersCount = 0;

        if (harvesterCount < maxHarvesterCount) {
            let harvesterConfigIds = MaraUtils.GetAllHarvesterConfigIds(this.settlementController.Settlement);
            let cfgId = MaraUtils.RandomSelect<string>(this.settlementController.MasterMind, harvesterConfigIds);

            if (cfgId != null) {
                for (let i = 0; i < maxHarvesterCount - harvesterCount; i++) {
                    result.push(this.makeProductionRequest(cfgId, null, null));
                    orderedHarvestersCount ++;

                    if (orderedHarvestersCount >= this.settlementController.Settings.ControllerStates.MaxHarvesterProductionBatch) {
                        break;
                    }
                }
            }
        }

        return result;
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

    private getEconomyBoosters(economyComposition: UnitComposition, produceableCfgIds: Array<string>) {
        let economyBoosters: Array<string> = [];

        let developmentBoosterCount = 0;

        economyComposition.forEach((value, key) => {
            if (MaraUtils.IsDevelopmentBoosterConfigId(key)) {
                developmentBoosterCount += value;
            }
        });

        let censusModel = MaraUtils.GetSettlementCensusModel(this.settlementController.Settlement);
        let peopleLevels = censusModel.PeopleIncomeLevels;
        let maxDevelopmentBoosters = peopleLevels.Item(peopleLevels.Count - 1).GrowthBuildings;

        if (developmentBoosterCount < maxDevelopmentBoosters) {
            let produceableEconomyBoosters = produceableCfgIds.filter((value) => MaraUtils.IsDevelopmentBoosterConfigId(value));
            let economyBooster = MaraUtils.RandomSelect(this.settlementController.MasterMind, produceableEconomyBoosters);

            if (economyBooster) {
                economyBoosters.push(economyBooster);
            }
        }

        return economyBoosters;
    }
}