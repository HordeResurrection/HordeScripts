import { MaraUtils } from "Mara/Utils/MaraUtils";
import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraProductionRequest, MaraResources } from "../Utils/Common";

export class DevelopingState extends ProductionState {
    protected getProductionRequests(): Array<MaraProductionRequest> {
        let economyComposition = this.settlementController.GetCurrentEconomyComposition();
        let requiredProductionChain = this.settlementController.StrategyController.GetRequiredProductionChainCfgIds();
        
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
        produceableCfgIds = produceableCfgIds.filter((value) => requiredProductionChain.has(value));
        
        let absentProducers: string[] = [];
        let absentTech: string[] = [];

        for (let cfgId of produceableCfgIds) {
            if (economyComposition.has(cfgId)) {
                continue;
            }

            let config = MaraUtils.GetUnitConfig(cfgId);
            let unitLimit = this.settlementController.Settlement.RulesOverseer.GetCurrentLimitForUnit(config) ?? Infinity;

            if (unitLimit > 0) {
                if (MaraUtils.IsProducerConfig(config)) {
                    absentProducers.push(cfgId);
                }
                else if (MaraUtils.IsTechConfig(config)) {
                    absentTech.push(cfgId);
                }
            }
        }

        let result = new Array<MaraProductionRequest>();

        let harvesterCount = 0;

        economyComposition.forEach((value, key) => {
            if (MaraUtils.IsHarvesterConfigId(key)) {
                harvesterCount += value;
            }
        });

        let maxHarvesterCount = this.settlementController.MiningController.GetOptimalHarvesterCount();

        if (harvesterCount < maxHarvesterCount) {
            let harvesterConfigIds = MaraUtils.GetAllHarvesterConfigIds(this.settlementController.Settlement);
            let cfgId = MaraUtils.RandomSelect<string>(this.settlementController.MasterMind, harvesterConfigIds);

            if (cfgId != null) {
                for (let i = 0; i < maxHarvesterCount - harvesterCount; i++) {
                    result.push(this.makeProductionRequest(cfgId, null, null));
                }
            }
        }

        let combatComposition = this.settlementController.StrategyController.GetSettlementAttackArmyComposition();
        let estimation = this.settlementController.ProductionController.EstimateProductionTime(combatComposition);
        let reinforcementProducers:Array<string> = [];

        estimation.forEach((value, key) => {
            if (value > this.settlementController.Settings.Timeouts.UnitProductionEstimationThreshold / 2) {
                let producingCfgIds = this.settlementController.ProductionController.GetProducingCfgIds(key);
                producingCfgIds = producingCfgIds.filter((value) => requiredProductionChain.has(value));

                if (producingCfgIds.length > 0) {
                    let producerCfgId = MaraUtils.RandomSelect(this.settlementController.MasterMind, producingCfgIds);
                    reinforcementProducers.push(producerCfgId!);
                }
            }
        });

        let selectedCfgIds: Array<string> | null = null;
 
        if (absentProducers.length > 0) {
            selectedCfgIds = absentProducers;
        }
        else if (absentTech.length > 0) {
            selectedCfgIds = absentTech;
        }
        if (reinforcementProducers.length > 0) {
            selectedCfgIds = reinforcementProducers;
        }

        if (selectedCfgIds) {
            let cfgId =  MaraUtils.RandomSelect(this.settlementController.MasterMind, selectedCfgIds);
            result.push(this.makeProductionRequest(cfgId!, null, null));
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
}