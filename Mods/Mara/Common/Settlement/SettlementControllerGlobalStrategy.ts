import { MaraSettlementController } from "../../MaraSettlementController";
import { MaraUtils } from "../../MaraUtils";

class SelectionResult {
    ConfigData: Map<string, CfgIdSelectionItem>;
    LowestTechCfgId: string = "";
}

class CfgIdSelectionItem {
    CfgId: string;
    ProductionChain: Array<string>;
}

export class SettlementGlobalStrategy {
    OffensiveCfgIds: Array<CfgIdSelectionItem>;
    DefensiveBuildingsCfgIds: Array<CfgIdSelectionItem>;
    LowestTechOffensiveCfgId: string;
    
    private isInited: boolean = false;

    Init(settlementController: MaraSettlementController): void {
        if (this.isInited) {
            return;
        }

        this.isInited = true;

        let availableCfgIds = MaraUtils.GetAllConfigIds(
            settlementController.Settlement, 
            (config) => true,
            "allConfigs"
        );
        
        let availableOffensiveCfgs = availableCfgIds.filter(
            (value) => MaraUtils.IsCombatConfigId(value) && !MaraUtils.IsBuildingConfigId(value)
        );

        let offensiveResults = this.initCfgIdsType(
            settlementController, 
            availableOffensiveCfgs, 
            settlementController.Settings.Combat.MaxUsedOffensiveCfgIdCount
        );

        this.OffensiveCfgIds = Array.from(offensiveResults.ConfigData.values());
        this.LowestTechOffensiveCfgId = offensiveResults.LowestTechCfgId;

        let availableDefensiveCfgIds = availableCfgIds.filter(
            (value) => MaraUtils.IsCombatConfigId(value) && MaraUtils.IsBuildingConfigId(value)
        );

        let defensiveResults = this.initCfgIdsType(
            settlementController, 
            availableDefensiveCfgIds, 
            settlementController.Settings.Combat.MaxUsedDefensiveCfgIdCount
        );

        this.DefensiveBuildingsCfgIds = Array.from(defensiveResults.ConfigData.values());

        settlementController.Debug(`Inited global strategy`);
        settlementController.Debug(`Offensive CfgIds: ${this.OffensiveCfgIds.map((value) => value.CfgId).join(", ")}`);
        settlementController.Debug(`Defensive CfgIds: ${this.DefensiveBuildingsCfgIds.map((value) => value.CfgId).join(", ")}`);
    }

    private initCfgIdsType(
        settlementController: MaraSettlementController,
        availableCfgIds: Array<string>,
        maxCfgIdCount: number
    ): SelectionResult {
        let allSelectionItems: Array<CfgIdSelectionItem> = [];

        for (let cfgId of availableCfgIds) {
            let productionChain = MaraUtils.GetCfgIdProductionChain(cfgId, settlementController.Settlement);
            let selectionItem = new CfgIdSelectionItem();
            
            selectionItem.CfgId = cfgId;
            selectionItem.ProductionChain = productionChain.map((item) => item.Uid);
            allSelectionItems.push(selectionItem);
        }
        
        let resultSelectionItems: Array<CfgIdSelectionItem> = [];
        let cfgIdCount = 0;
        
        if (allSelectionItems.length <= cfgIdCount) {
            resultSelectionItems = allSelectionItems;
        }
        else {
            let buildingDamagerItems = allSelectionItems.filter((value) => {
                return MaraUtils.IsAllDamagerConfigId(value.CfgId);
            });

            let lowestTechBuildingDamager = this.selectLowestTechSelectionItem(buildingDamagerItems);

            if (lowestTechBuildingDamager) {
                resultSelectionItems.push(lowestTechBuildingDamager);
                cfgIdCount ++;
                allSelectionItems = allSelectionItems.filter((value) => {return value.CfgId != lowestTechBuildingDamager.CfgId});
            }
            
            while (cfgIdCount < maxCfgIdCount) {
                let choise = MaraUtils.RandomSelect<CfgIdSelectionItem>(settlementController.MasterMind, allSelectionItems);

                if (!choise) {
                    break;
                }

                resultSelectionItems.push(choise);
                cfgIdCount ++;
                allSelectionItems = allSelectionItems.filter((value) => {return value.CfgId != choise.CfgId});
            }
        }

        let result = new SelectionResult();
        let lowestTechItem = this.selectLowestTechSelectionItem(resultSelectionItems);
        
        if (lowestTechItem) {
            result.LowestTechCfgId = lowestTechItem.CfgId;
        }

        result.ConfigData = new Map<string, CfgIdSelectionItem>();

        for (let item of resultSelectionItems) {
            result.ConfigData.set(item.CfgId, item);
        }

        return result;
    }

    private selectLowestTechSelectionItem(items: Array<CfgIdSelectionItem>): CfgIdSelectionItem | null {
        let shortestChainItem: CfgIdSelectionItem | null = null;
        
        for (let item of items) {
            if (!shortestChainItem) {
                shortestChainItem = item;
            }

            if (item.ProductionChain.length < shortestChainItem.ProductionChain.length) {
                shortestChainItem = item;
            }
        }

        return shortestChainItem;
    }
}