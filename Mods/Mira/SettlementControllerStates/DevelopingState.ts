import { MiraUtils, UnitComposition } from "Mira/Utils/MiraUtils";
import { ProductionState } from "./ProductionState";
import { BuildingUpState } from "./BuildingUpState";

export class DevelopingState extends ProductionState {
    private readonly MAX_PRODUCTION_TIME = (2 * 60 * 50) / 2; //2 min
    private readonly PRODUCER_PRODUCTION_PROBABILITY = 66;
    
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

            if (MiraUtils.IsProducerConfig(cfgId)) {
                absentProducers.push(cfgId);
            }
            else if (MiraUtils.IsTechConfig(cfgId)) {
                absentTech.push(cfgId);
            }
        }

        if (absentProducers.length > 0 || absentTech.length > 0) {
            let selectedCfgIds: Array<string>;

            if (absentProducers.length > 0 && absentTech.length > 0) {
                let pick = MiraUtils.Random(100, 1);
                
                if (pick > this.PRODUCER_PRODUCTION_PROBABILITY) {
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
            
            let index = MiraUtils.Random(selectedCfgIds.length - 1);
            MiraUtils.IncrementMapItem(targetCompostion, selectedCfgIds[index]);
        }

        let combatComposition = this.settlementController.StrategyController.GetArmyComposition();
        let estimation = this.settlementController.ProductionController.EstimateProductionTime(combatComposition);

        estimation.forEach((value, key) => {
            if (value > this.MAX_PRODUCTION_TIME) {
                let producingCfgIds = this.settlementController.ProductionController.GetProducingCfgIds(key);

                if (producingCfgIds.length > 0) {
                    let index = MiraUtils.Random(producingCfgIds.length - 1);
                    let producerCfgId = producingCfgIds[index];

                    if (!targetCompostion.has(producerCfgId)) {
                        targetCompostion.set(producerCfgId, 1);
                    }
                }
            }
        });

        economyComposition.forEach((value, key) => {
            MiraUtils.AddToMapItem(targetCompostion, key, value);
        });

        //temp code until resource gathering is implemented
        targetCompostion.set("#UnitConfig_Slavyane_Farm", 5);
        targetCompostion.set("#UnitConfig_Slavyane_Worker1", 5);

        return targetCompostion;
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = new BuildingUpState(this.settlementController);
    }
}