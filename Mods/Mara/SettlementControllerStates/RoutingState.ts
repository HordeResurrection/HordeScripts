import { MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraResources } from "../Utils/Common";
import { MaraUtils, NonUniformRandomSelectItem } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

class NextStrategyItem implements NonUniformRandomSelectItem {
    Weight: number;
    NeedExpand: boolean;
}

const RESOURCE_THRESHOLD = 1000;
const PEOPLE_THRESHOLD = 10;

export class RoutingState extends MaraSettlementControllerState {
    OnEntry(): void {
        let leftResources = new Set<MaraResourceType>();
        
        MaraResourceMap.ResourceClusters.forEach((value) => {
            if (value.GoldAmount > 0) {
                leftResources.add(MaraResourceType.Gold);
            }

            if (value.MetalAmount > 0) {
                leftResources.add(MaraResourceType.Metal);
            }

            if (value.WoodAmount > 0) {
                leftResources.add(MaraResourceType.Wood);
            }
        });
                
        let resources = this.settlementController.MiningController.GetTotalResources();
        this.settlementController.Debug(`Total resources: ${resources.ToString()}`);

        let needExpand = false;
        let resourcesToMine = new MaraResources(0, 0, 0, 0);
        let minResourceAmount = Infinity;
        let minResourceToThresholdRatio = Infinity;
        let minResourceThreshold = 0;

        if (resources.People < PEOPLE_THRESHOLD) {
            this.settlementController.Debug(`Low people`);
            needExpand = true;
            resourcesToMine.People = 1;

            let ratio = resources.People / PEOPLE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                minResourceAmount = resources.People;
                minResourceThreshold = PEOPLE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }
        
        if (resources.Gold < RESOURCE_THRESHOLD && leftResources.has(MaraResourceType.Gold)) {
            this.settlementController.Debug(`Low gold`);
            needExpand = true;
            resourcesToMine.Gold = 1;

            let ratio = resources.Gold / RESOURCE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                minResourceAmount = resources.Gold;
                minResourceThreshold = RESOURCE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }
        
        if (resources.Metal < RESOURCE_THRESHOLD && leftResources.has(MaraResourceType.Metal)) {
            this.settlementController.Debug(`Low metal`);
            needExpand = true;
            resourcesToMine.Metal = 1;

            let ratio = resources.Metal / RESOURCE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                minResourceAmount = resources.Metal;
                minResourceThreshold = RESOURCE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }

        if (resources.Wood < RESOURCE_THRESHOLD && leftResources.has(MaraResourceType.Wood)) {
            this.settlementController.Debug(`Low lumber`);
            needExpand = true;
            resourcesToMine.Wood = 1;

            let ratio = resources.Wood / RESOURCE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                minResourceAmount = resources.Wood;
                minResourceThreshold = RESOURCE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }

        if (needExpand) {
            this.settlementController.Debug(`Low on one or more resource`);

            let positiveItem = new NextStrategyItem();
            positiveItem.NeedExpand = true;
            positiveItem.Weight = minResourceAmount;

            let negativeItem = new NextStrategyItem();
            negativeItem.NeedExpand = false;
            negativeItem.Weight = minResourceThreshold - minResourceAmount;

            let pick = MaraUtils.NonUniformRandomSelect(this.settlementController.MasterMind, [positiveItem, negativeItem]);

            if (pick!.NeedExpand) {
                this.settlementController.Debug(`Proceeding to expand...`);
                this.fillExpandData(resourcesToMine);
                this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
            }
            else {
                this.defineOffensiveStrategy();
            }
            
            return;
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
        let pick = MaraUtils.Random(this.settlementController.MasterMind, 100);

        if (pick < buildUpProbability) {
            this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
        }
        else {
            this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
        }
    }

    private defineOffensiveStrategy(): void {
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
        let combatCfgId = produceableCfgIds.find( (value) => {return MaraUtils.IsCombatConfigId(value)} );
        let offensiveCfgId = produceableCfgIds.find( (value) => {return MaraUtils.IsCombatConfigId(value) && !MaraUtils.IsBuildingConfigId(value)} );

        if (offensiveCfgId) {
            this.pickBuildUpOrDevelopment(50);
        }
        else if (combatCfgId) {
            this.pickBuildUpOrDevelopment(25);
        }
        else {
            this.settlementController.Debug(`No produceable combat units, developing...`);
            this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
        }
    }
}