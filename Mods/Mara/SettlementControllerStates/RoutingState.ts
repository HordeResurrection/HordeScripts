import { MaraMap } from "../Common/MapAnalysis/MaraMap";
import { MaraResourceType } from "../Common/MapAnalysis/MaraResourceType";
import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { MaraResources } from "../Common/MapAnalysis/MaraResources";
import { MaraUtils } from "../MaraUtils";
import { NonUniformRandomSelectItem } from "../Common/NonUniformRandomSelectItem";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

class NextStrategyItem implements NonUniformRandomSelectItem {
    Weight: number;
    NeedExpand: boolean;
}

class NeedExpandResult {
    NeedExpand: boolean;
    MinResourceAmount: number;
    MinResourceThreshold: number;
    ResourcesToMine: MaraResources;
}

const RESOURCE_THRESHOLD = 1000;
const PEOPLE_THRESHOLD = 10;

export class RoutingState extends MaraSettlementControllerState {
    OnEntry(): void {
        this.settlementController.CanMineResources = this.canMineResources();
        
        if (this.settlementController.CanMineResources) {
            let expandData = this.isExpandNeeded();

            if (expandData.NeedExpand) {
                this.settlementController.Debug(`Low on one or more resource, required resources: ${expandData.ResourcesToMine.ToString()}`);

                if (
                    this.decideOnExpand(
                        expandData.MinResourceAmount,
                        expandData.MinResourceThreshold - expandData.MinResourceAmount
                    )
                ) {
                    this.settlementController.Debug(`Proceeding to expand...`);
                    this.fillExpandData(expandData.ResourcesToMine);
                    this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
                }
                else {
                    this.defineOffensiveStrategy();
                }
                
                return;
            }
            else {
                let expandProbability = 100 * this.settlementController.Settings.ControllerStates.UnnecessaryExpandProbability;
                
                if (
                    this.decideOnExpand(
                        expandProbability,
                        100 - expandProbability
                    )
                ) {
                    this.settlementController.Debug(`Proceeding to expand for no reason`);

                    let totalResources = this.settlementController.MiningController.GetTotalResources();
                    
                    let lowestResource;
                    let lowestResourceAmount = Infinity;

                    totalResources.Resources.forEach((value, key) => {
                        if (key == MaraResourceType.People) {
                            return;
                        }
                        
                        if (!lowestResource || value < lowestResourceAmount) {
                            lowestResource = key;
                            lowestResourceAmount = value;
                        }
                    });

                    let resourcesToMine = new MaraResources(0, 0, 0, 0);
                    resourcesToMine.Resources.set(lowestResource, lowestResourceAmount);

                    if (totalResources.People < PEOPLE_THRESHOLD) {
                        resourcesToMine.Resources.set(MaraResourceType.People, PEOPLE_THRESHOLD);
                    }

                    this.fillExpandData(resourcesToMine);
                    this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
                }
                else {
                    this.defineOffensiveStrategy();
                }
                
                return;
            }
        }
        else {
            this.defineOffensiveStrategy();
            return;
        }
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
        
    }

    private pickBuildUpOrDevelopment(buildUpProbability: number): void {
        let realBuildUpProbability = buildUpProbability * (0.7 ** this.settlementController.ConsequtiveBuildUpCount);
        let pick = MaraUtils.Random(this.settlementController.MasterMind, 100);

        if (pick < realBuildUpProbability) {
            this.settlementController.ConsequtiveBuildUpCount ++;
            this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
        }
        else {
            this.settlementController.ConsequtiveBuildUpCount = 0;
            this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
        }
    }

    private defineOffensiveStrategy(): void {
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
        
        let combatCfgId = produceableCfgIds.find( (value) => {
            return (
                MaraUtils.IsCombatConfigId(value) && 
                (
                    this.settlementController.StrategyController.GlobalStrategy.OffensiveCfgIds.findIndex((item) => {return item.CfgId == value}) >= 0 || 
                    this.settlementController.StrategyController.GlobalStrategy.DefensiveBuildingsCfgIds.findIndex((item) => {return item.CfgId == value}) >= 0
                )
            );
        } );

        let offensiveCfgId = produceableCfgIds.find( 
            (value) => {
                return MaraUtils.IsCombatConfigId(value) && !MaraUtils.IsBuildingConfigId(value) &&
                    this.settlementController.StrategyController.GlobalStrategy.OffensiveCfgIds.findIndex((item) => {return item.CfgId == value}) >= 0
            } 
        );

        if (offensiveCfgId) {
            this.pickBuildUpOrDevelopment(this.settlementController.Settings.ControllerStates.BuildUpProbabilityWhenOffensePossible * 100);
        }
        else if (combatCfgId) {
            this.pickBuildUpOrDevelopment(this.settlementController.Settings.ControllerStates.BuildUpProbabilityWhenDefensePossible * 100);
        }
        else {
            if (this.canBuildUp()) {
                this.settlementController.Debug(`No produceable combat units, developing...`);
                this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
            }
            else {
                this.settlementController.Debug(`Unable to produce any combat unit, taking forced defeat...`);
                this.settlementController.State = SettlementControllerStateFactory.MakeIdleState(this.settlementController);
            }
        }
    }

    private canMineResources(): boolean {
        let economy = this.settlementController.GetCurrentDevelopedEconomyComposition();

        let atLeastOneHarvesterPresent = false;
        let atLeastOneMetalStockPresent = false;

        economy.forEach((value, key) => {
            if (MaraUtils.IsHarvesterConfigId(key)) {
                atLeastOneHarvesterPresent = true;
            }
            else if (MaraUtils.IsMetalStockConfigId(key)) {
                atLeastOneMetalStockPresent = true;
            }
        });

        if (!atLeastOneHarvesterPresent) {
            if (!this.checkConfigIdsLimits(MaraUtils.GetAllHarvesterConfigIds)) {
                return false;
            }
        }

        if (!atLeastOneMetalStockPresent) {
            if (!this.checkConfigIdsLimits(MaraUtils.GetAllMetalStockConfigIds)) {
                return false;
            }
        }

        if (!this.checkConfigIdsLimits(MaraUtils.GetAllSawmillConfigIds)) {
            return false;
        }

        if (!this.checkConfigIdsLimits(MaraUtils.GetAllMineConfigIds)) {
            return false;
        }

        if (!this.checkConfigIdsLimits(MaraUtils.GetAllHousingConfigIds)) {
            return false;
        }

        return true;
    }

    private checkConfigIdsLimits(configIdsGetter: (any) => Array<string>): boolean {
        let availableCfgIds = configIdsGetter(this.settlementController.Settlement);

        if (availableCfgIds.length == 0) {
            return false;
        }

        let economy = this.settlementController.GetCurrentDevelopedEconomyComposition();
        let allowedItems = MaraUtils.MakeAllowedCfgItems(availableCfgIds, economy, this.settlementController.Settlement);

        for (let item of allowedItems) {
            if (item.MaxCount > 0) {
                return true;
            }
        }
        
        return false;
    }

    private canBuildUp(): boolean {
        let offensiveComposition = this.settlementController.StrategyController.GetSettlementAttackArmyComposition();
        
        if (offensiveComposition.size > 0) {
            return true;
        }
        else {
            let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
            let requiredTechChain = this.settlementController.StrategyController.GetRequiredProductionChainCfgIds();

            let absentTech: Array<string> = [];

            requiredTechChain.forEach((v) => {
                if (!currentEconomy.has(v)) {
                    absentTech.push(v);
                }
            });

            let atLeastOneTechIsProduceable = false;

            for (let cfgId of absentTech) {
                let producers = this.settlementController.ProductionController.GetProducingCfgIds(cfgId);
                
                if (producers.length > 0) {
                    atLeastOneTechIsProduceable = true;
                    break;
                }
            }

            return atLeastOneTechIsProduceable;
        }
    }

    private isExpandNeeded(): NeedExpandResult {
        let leftResources = new Set<MaraResourceType>();
        
        for (let cluster of MaraMap.ResourceClusters) {
            if (cluster.GoldAmount > 0) {
                leftResources.add(MaraResourceType.Gold);
            }

            if (cluster.MetalAmount > 0) {
                leftResources.add(MaraResourceType.Metal);
            }

            if (cluster.WoodAmount > 0) {
                leftResources.add(MaraResourceType.Wood);
            }

            if (leftResources.size == 3) {
                break;
            }
        }
                
        let resources = this.settlementController.MiningController.GetTotalResources();
        this.settlementController.Debug(`Total resources: ${resources.ToString()}`);

        let result = new NeedExpandResult();
        result.NeedExpand = false;
        result.ResourcesToMine = new MaraResources(0, 0, 0, 0);
        result.MinResourceAmount = Infinity;
        result.MinResourceThreshold = 0;

        let minResourceToThresholdRatio = Infinity;

        //TODO: rewrite code below to get rid of certain resource names
        
        if (resources.People < PEOPLE_THRESHOLD) {
            this.settlementController.Debug(`Low people`);
            result.NeedExpand = true;
            result.ResourcesToMine.People = PEOPLE_THRESHOLD - resources.People;

            let ratio = resources.People / PEOPLE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                result.MinResourceAmount = resources.People;
                result.MinResourceThreshold = PEOPLE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }
        
        if (resources.Gold < RESOURCE_THRESHOLD && leftResources.has(MaraResourceType.Gold)) {
            this.settlementController.Debug(`Low gold`);
            result.NeedExpand = true;
            result.ResourcesToMine.Gold = RESOURCE_THRESHOLD - resources.Gold;

            let ratio = resources.Gold / RESOURCE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                result.MinResourceAmount = resources.Gold;
                result.MinResourceThreshold = RESOURCE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }
        
        if (resources.Metal < RESOURCE_THRESHOLD && leftResources.has(MaraResourceType.Metal)) {
            this.settlementController.Debug(`Low metal`);
            result.NeedExpand = true;
            result.ResourcesToMine.Metal = RESOURCE_THRESHOLD - resources.Metal;

            let ratio = resources.Metal / RESOURCE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                result.MinResourceAmount = resources.Metal;
                result.MinResourceThreshold = RESOURCE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }

        if (resources.Wood < RESOURCE_THRESHOLD && leftResources.has(MaraResourceType.Wood)) {
            this.settlementController.Debug(`Low lumber`);
            result.NeedExpand = true;
            result.ResourcesToMine.Wood = RESOURCE_THRESHOLD - resources.Wood;

            let ratio = resources.Wood / RESOURCE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                result.MinResourceAmount = resources.Wood;
                result.MinResourceThreshold = RESOURCE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }

        return result;
    }

    private decideOnExpand(positiveWeigth: number, negativeWeigth: number): boolean {
        this.settlementController.Debug(`deciding on expand, positive weigth: ${positiveWeigth}, negative: ${negativeWeigth}`);
        
        let positiveItem = new NextStrategyItem();
        positiveItem.NeedExpand = true;
        positiveItem.Weight = positiveWeigth;

        let negativeItem = new NextStrategyItem();
        negativeItem.NeedExpand = false;
        negativeItem.Weight = negativeWeigth;

        let pick = MaraUtils.NonUniformRandomSelect(this.settlementController.MasterMind, [positiveItem, negativeItem]);
        
        return pick!.NeedExpand;
    }
}