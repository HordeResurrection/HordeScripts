import { MaraSettlementController, TargetExpandData } from "Mara/MaraSettlementController";
import { FsmState, MaraPoint, MaraResources } from "Mara/Utils/Common";
import { MaraResourceCluster, MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
import { MaraUtils } from "../Utils/MaraUtils";

export abstract class MaraSettlementControllerState extends FsmState {
    protected settlementController: MaraSettlementController;
    
    constructor(settlementController: MaraSettlementController) {
        super();
        this.settlementController = settlementController;
    }

    protected fillExpandData(requiredResources: MaraResources): void {
        //let needProducePeople = requiredResources.People > 0;

        //if (!needProducePeople) {
            let optimalCluster = this.selectOptimalResourceCluster(requiredResources);

            if (optimalCluster) {
                this.settlementController.Debug(`Selected resource cluster ${optimalCluster.Center.ToString()} for expand`);
                let requiredResourceTypes: MaraResourceType[] = [];

                if (requiredResources.Gold > 0 && optimalCluster.GoldAmount > 0) {
                    this.settlementController.Debug(`Gold production is scheduled`);
                    requiredResourceTypes.push(MaraResourceType.Gold);
                }

                if (requiredResources.Metal > 0 && optimalCluster.MetalAmount > 0) {
                    this.settlementController.Debug(`Metal production is scheduled`);
                    requiredResourceTypes.push(MaraResourceType.Metal);
                }

                if (requiredResources.Wood > 0 && optimalCluster.WoodAmount > 0) {
                    this.settlementController.Debug(`Wood production is scheduled`);
                    requiredResourceTypes.push(MaraResourceType.Wood);
                }
                
                this.settlementController.TargetExpand = new TargetExpandData(
                    optimalCluster,
                    requiredResourceTypes
                );
            }
            else {
                this.settlementController.Debug(`Unable to find suitable resource cluster for mining`);
                
                this.settlementController.TargetExpand = new TargetExpandData( //when in doubt - build more izbas!!
                    null,
                    [MaraResourceType.People]
                );
            }
        // }
        // else {
        //     this.settlementController.TargetExpand = new TargetExpandData(
        //         null,
        //         [MaraResourceType.People]
        //     );
        // }
    }

    private selectOptimalResourceCluster(requiredResources: MaraResources): MaraResourceCluster | null {
        let candidates: Array<MaraResourceCluster> = [];
        
        let requiredGold = requiredResources.Gold;
        let requiredMetal = requiredResources.Metal;
        let requiredWood = requiredResources.Wood;

        MaraResourceMap.ResourceClusters.forEach((value) => {
            if (requiredGold > 0) {
                let freeGold = this.getUnoccupiedMinerals(value.GoldCells);
                
                if (freeGold > requiredGold) {
                    candidates.push(value);
                }
            }
            else if (requiredMetal > 0) {
                let freeMetal = this.getUnoccupiedMinerals(value.MetalCells);
                
                if (freeMetal > requiredMetal) {
                    candidates.push(value);
                }
            }
            else if (requiredWood > 0 && value.WoodAmount >= requiredWood) {
                candidates.push(value);
            }
        });

        this.settlementController.Debug(`Candidate resource clusters:`);
        for (let cluster of candidates) {
            this.settlementController.Debug(`(${cluster.Center.ToString()})`);
        }

        if (candidates.length > 0) {
            return this.settlementController.StrategyController.SelectOptimalResourceCluster(candidates);
        }
        else {
            return null;
        }
    }

    private getUnoccupiedMinerals(cells: Array<MaraPoint>): number {
        let freeMinerals = 0;

        for (let cell of cells) {
            let unit = MaraUtils.GetUnit(cell);

            if (unit?.Owner == this.settlementController.Settlement) {
                continue;
            }
            else {
                freeMinerals += MaraUtils.GetCellMineralsAmount(cell.X, cell.Y);
            }
        }

        return freeMinerals;
    }
}