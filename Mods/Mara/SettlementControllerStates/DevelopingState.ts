import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraResources } from "../Utils/Common";

export class DevelopingState extends ProductionState {
    protected getTargetUnitsComposition(): UnitComposition {
        var targetCompostion = new Map<string, number>();

        let economyComposition = this.settlementController.GetCurrentEconomyComposition();
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
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

        if (absentProducers.length > 0 || absentTech.length > 0) {
            let selectedCfgIds: Array<string>;

            if (absentProducers.length > 0 && absentTech.length > 0) {
                let pick = MaraUtils.Random(this.settlementController.MasterMind, 100, 1);
                
                if (pick > this.settlementController.Settings.ControllerStates.ProducerProductionProbability) {
                    selectedCfgIds = absentTech;
                }
                else {
                    selectedCfgIds = absentProducers;
                }
            }
            else if (absentProducers.length > 0) {
                selectedCfgIds = absentProducers;
            }
            else {
                selectedCfgIds = absentTech;
            }
            
            let index = MaraUtils.Random(this.settlementController.MasterMind, selectedCfgIds.length - 1);
            MaraUtils.IncrementMapItem(targetCompostion, selectedCfgIds[index]);
        }

        let combatComposition = this.settlementController.StrategyController.GetSettlementAttackArmyComposition();
        let estimation = this.settlementController.ProductionController.EstimateProductionTime(combatComposition);

        estimation.forEach((value, key) => {
            if (value > this.settlementController.Settings.Timeouts.UnitProductionEstimationThreshold / 2) {
                let producingCfgIds = this.settlementController.ProductionController.GetProducingCfgIds(key);

                if (producingCfgIds.length > 0) {
                    let index = MaraUtils.Random(this.settlementController.MasterMind, producingCfgIds.length - 1);
                    let producerCfgId = producingCfgIds[index];

                    if (!targetCompostion.has(producerCfgId)) {
                        targetCompostion.set(producerCfgId, 1);
                    }
                }
            }
        });

        economyComposition.forEach((value, key) => {
            MaraUtils.AddToMapItem(targetCompostion, key, value);
        });

        return targetCompostion;
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