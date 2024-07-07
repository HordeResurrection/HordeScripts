import { MaraSettlementController } from "../MaraSettlementController";
import { MaraUtils } from "./MaraUtils";

class SelectionResult {
    CfgIds: Set<string>;
    ProductionChainCfgIds: Set<string>;
    LowestTechCfgId: string = "";
}

export class SettlementGlobalStrategy {
    OffensiveCfgIds: Set<string>;
    DefensiveBuildingsCfgIds: Set<string>;
    ProductionChainCfgIds: Set<string>;
    LowestTechOffensiveCfgId: string;
    
    private isInited: boolean = false;

    Init(settlementController: MaraSettlementController): void {
        if (this.isInited) {
            return;
        }

        this.isInited = true;

        let availableCfgIds = MaraUtils.GetAllConfigIds(
            settlementController.Settlement, 
            (config) => true
        );
        
        let availableOffensiveCfgs = availableCfgIds.filter(
            (value) => MaraUtils.IsCombatConfigId(value) && !MaraUtils.IsBuildingConfigId(value)
        );

        let offensiveResults = this.initCfgIdsType(
            settlementController, 
            availableOffensiveCfgs, 
            settlementController.Settings.CombatSettings.MaxUsedOffensiveCfgIdCount
        );

        this.OffensiveCfgIds = offensiveResults.CfgIds;
        this.LowestTechOffensiveCfgId = offensiveResults.LowestTechCfgId;

        let availableDefensiveCfgIds = availableCfgIds.filter(
            (value) => MaraUtils.IsCombatConfigId(value) && MaraUtils.IsBuildingConfigId(value)
        );

        let defensiveResults = this.initCfgIdsType(
            settlementController, 
            availableDefensiveCfgIds, 
            settlementController.Settings.CombatSettings.MaxUsedDefensiveCfgIdCount
        );

        this.DefensiveBuildingsCfgIds = defensiveResults.CfgIds;

        this.ProductionChainCfgIds = new Set<string>();

        offensiveResults.ProductionChainCfgIds.forEach((value) => {this.ProductionChainCfgIds.add(value)});
        defensiveResults.ProductionChainCfgIds.forEach((value) => {this.ProductionChainCfgIds.add(value)});

        settlementController.Debug(`Inited global strategy`);
        settlementController.Debug(`Offensive CfgIds: ${Array.from(this.OffensiveCfgIds.keys()).join(", ")}`);
        settlementController.Debug(`Defensive CfgIds: ${Array.from(this.DefensiveBuildingsCfgIds.keys()).join(", ")}`);
        settlementController.Debug(`Tech Chain: ${Array.from(this.ProductionChainCfgIds.keys()).join(", ")}`);
    }

    private initCfgIdsType(
        settlementController: MaraSettlementController,
        availableCfgIds: Array<string>,
        maxCfgIdCount: number
    ): SelectionResult {
        let result = new SelectionResult();
        let cfgIdCount = 0;
        
        if (availableCfgIds.length <= cfgIdCount) {
            result.CfgIds = new Set(availableCfgIds);
        }
        else {
            result.CfgIds = new Set<string>();
            
            while (cfgIdCount < maxCfgIdCount) {
                let cfgId = MaraUtils.RandomSelect<string>(settlementController.MasterMind, availableCfgIds);

                if (!cfgId) {
                    break;
                }

                result.CfgIds.add(cfgId);
                cfgIdCount ++;
                availableCfgIds = availableCfgIds.filter((value) => {return value != cfgId});
            }
        }

        result.ProductionChainCfgIds = new Set<string>();
        let shortestProductionChainLen = Infinity;

        result.CfgIds.forEach((value) => {
            let productionChain = MaraUtils.GetCfgIdProductionChain(value, settlementController.Settlement);
            
            for (let item of productionChain) {
                result.ProductionChainCfgIds.add(item.Uid);
            }

            if (productionChain.length < shortestProductionChainLen) {
                shortestProductionChainLen = productionChain.length;
                result.LowestTechCfgId = value;
            }
        });

        return result;
    }
}