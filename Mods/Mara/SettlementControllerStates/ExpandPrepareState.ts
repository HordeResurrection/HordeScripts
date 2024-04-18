import { MaraResourceCluster, MaraResourceMap } from "../MaraResourceMap";
import { MaraResources } from "../Utils/Common";
import { MaraUtils, UnitComposition } from "../Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class ExpandPrepareState extends MaraSettlementControllerState {
    OnEntry(): void {
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
            this.settlementController.TargetExpandCluster = optimalCluster;
        }
        else {

        }
    }

    OnExit(): void {}

    Tick(tickNumber: number): void {

    }

    private calculateCompositionCost(composition: UnitComposition): MaraResources {
        return new MaraResources(0, 0, 0, 0);
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