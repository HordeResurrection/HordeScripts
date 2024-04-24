import { MaraResourceCluster, MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
import { TargetExpandData } from "../MaraSettlementController";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraResources } from "../Utils/Common";
import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";
import { ProductionState } from "./ProductionState";

export class ExpandPrepareState extends ProductionState {
    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeExpandSecureState(this.settlementController);
    }
    
    protected getTargetUnitsComposition(): UnitComposition {
        if (this.settlementController.TargetExpand?.Cluster) {
            let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
            let armyToProduce = this.settlementController.StrategyController.GetExpandAttackArmyComposition(this.settlementController.TargetExpand!.Cluster!.Center!);
            
            return MaraUtils.AddCompositionLists(currentEconomy, armyToProduce);
        }
        else {
            return this.settlementController.GetCurrentDevelopedEconomyComposition();
        }
    }

    protected prepareProductionContext(): MaraSettlementControllerState | null {
        let targetComposition = this.settlementController.TargetUnitsComposition;
        let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();

        let compositionToProduce = MaraUtils.SubstractCompositionLists(targetComposition!, currentEconomy);
        let compositionCost = this.calculateCompositionCost(compositionToProduce);
        
        let currentResources = this.settlementController.MiningController.GetTotalResources();
        let requiredResources = new Map<string, number>();

        requiredResources.set("Gold", Math.max(currentResources.Gold - compositionCost.Gold, 0));
        requiredResources.set("Metal", Math.max(currentResources.Metal - compositionCost.Metal, 0));
        requiredResources.set("Wood", Math.max(currentResources.Wood - compositionCost.Wood, 0));
        
        let needProducePeople = false;

        if (currentResources.People < compositionCost.People) {
            needProducePeople = true;
        }

        if (!needProducePeople) {
            let optimalCluster = this.selectOptimalResourceCluster(requiredResources);

            if (optimalCluster) {
                let requiredResourceTypes: MaraResourceType[] = [];

                if (requiredResources.get("Gold")! > 0) {
                    requiredResourceTypes.push(MaraResourceType.Gold);
                }

                if (requiredResources.get("Metal")! > 0) {
                    requiredResourceTypes.push(MaraResourceType.Metal);
                }

                if (requiredResources.get("Wood")! > 0) {
                    requiredResourceTypes.push(MaraResourceType.Wood);
                }
                
                this.settlementController.TargetExpand = new TargetExpandData(
                    optimalCluster,
                    requiredResourceTypes
                );

                return null;
            }
            else {
                //TODO: possibly go to other state since it can go right back from Developing State
                this.settlementController.Debug(`Unable to find suitable resource cluster for mining, going back to Developing State`);
                return SettlementControllerStateFactory.MakeDevelopingState(this.settlementController);
            }
        }
        else {
            this.settlementController.TargetExpand = new TargetExpandData(
                null,
                [MaraResourceType.People]
            );

            return null;
        }
    }

    private calculateCompositionCost(composition: UnitComposition): MaraResources {
        let result = new MaraResources(0, 0, 0, 0);

        composition.forEach((value, key) => {
            let config = MaraUtils.GetUnitConfig(key);
            let cost = config.CostResources;

            result.Gold += cost.Gold * value;
            result.Metal += cost.Metal * value;
            result.Wood += cost.Lumber * value;
            result.People += cost.People * value;
        });

        return result;
    }

    private selectOptimalResourceCluster(requiredResources: Map<string, number>): MaraResourceCluster | null {
        let candidates: Array<MaraResourceCluster> = [];
        
        let requiredGold = requiredResources.get("Gold")!;
        let requiredMetal = requiredResources.get("Metal")!;
        let requiredWood = requiredResources.get("Wood")!;

        MaraResourceMap.ResourceClusters.forEach((value) => {
            if (requiredGold > 0 && value.GoldAmount >= requiredGold) {
                candidates.push(value);
            }
            else if (requiredMetal > 0 && value.MetalAmount >= requiredMetal) {
                candidates.push(value);
            }
            else if (requiredWood > 0 && value.WoodAmount >= requiredWood) {
                candidates.push(value);
            }
        });

        if (candidates.length > 0) {
            return this.settlementController.StrategyController.SelectOptimalResourceCluster(candidates);
        }
        else {
            return null;
        }
    }
}