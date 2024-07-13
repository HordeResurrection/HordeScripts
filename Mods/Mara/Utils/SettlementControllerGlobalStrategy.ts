import { MaraSettlementController } from "../MaraSettlementController";
import { MaraUtils } from "./MaraUtils";

class SelectionResult {
    CfgIds: Set<string>;
    ProductionChainCfgIds: Set<string>;
    LowestTechCfgId: string = "";
}

class CfgIdSelectionItem {
    CfgId: string;
    ProductionChain: Array<string>;
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

        let lowestTechItem = this.selectLowestTechSelectionItem(resultSelectionItems);

        let result = new SelectionResult();
        result.CfgIds = new Set<string>(resultSelectionItems.map((value) => value.CfgId));
        result.LowestTechCfgId = lowestTechItem!.CfgId;
        result.ProductionChainCfgIds = new Set<string>();

        for (let item of resultSelectionItems) {
            for (let cfgId of item.ProductionChain) {
                result.ProductionChainCfgIds.add(cfgId);
            }
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