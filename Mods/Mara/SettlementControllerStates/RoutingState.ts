import { MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraResources } from "../Utils/Common";
import { MaraUtils } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

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

        if (resources.People < 10) {
            this.settlementController.Debug(`Low people`);
            needExpand = true;
            resourcesToMine.People = 1;
        }
        
        if (resources.Gold < 1000 && leftResources.has(MaraResourceType.Gold)) {
            this.settlementController.Debug(`Low gold`);
            needExpand = true;
            resourcesToMine.Gold = 1;
        }
        
        if (resources.Metal < 1000 && leftResources.has(MaraResourceType.Metal)) {
            this.settlementController.Debug(`Low metal`);
            needExpand = true;
            resourcesToMine.Metal = 1;
        }

        if (resources.Wood < 1000 && leftResources.has(MaraResourceType.Wood)) {
            this.settlementController.Debug(`Low lumber`);
            needExpand = true;
            resourcesToMine.Wood = 1;
        }

        if (needExpand) {
            this.settlementController.Debug(`Low on one or more resource, proceeding to expand...`);
            this.fillExpandData(resourcesToMine);
            this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
            return;
        }
        else {
            let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
            let combatCfgId = produceableCfgIds.find( (value) => {return MaraUtils.IsCombatConfigId(value)} );
            let offensiveCfgId = produceableCfgIds.find( (value) => {return MaraUtils.IsCombatConfigId(value) && !MaraUtils.IsBuildingConfigId(value)} );

            if (offensiveCfgId) {
                let pick = MaraUtils.Random(this.settlementController.MasterMind, 100);

                if (pick < 75) {
                    this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
                }
                else {
                    this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
                }
            }
            else if (combatCfgId) {
                let pick = MaraUtils.Random(this.settlementController.MasterMind, 100);

                if (pick < 25) {
                    this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
                }
                else {
                    this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
                }
            }
            else {
                this.settlementController.Debug(`No produceable combat units, developing...`);
                this.settlementController.State = SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
            }
            
            return;
        }
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
        
    }
}