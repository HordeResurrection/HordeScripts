import { MaraSettlementController, TargetExpandData } from "Mara/MaraSettlementController";
import { FsmState, MaraPoint, MaraResources } from "Mara/Utils/Common";
import { MaraResourceCluster, MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
import { MaraUtils } from "../Utils/MaraUtils";

export abstract class MaraSettlementControllerState extends FsmState {
    protected readonly settlementController: MaraSettlementController;
    
    constructor(settlementController: MaraSettlementController) {
        super();
        this.settlementController = settlementController;
    }

    protected fillExpandData(requiredResources: MaraResources): void {
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

            if (requiredResources.People > 0) {
                requiredResourceTypes.push(MaraResourceType.People);
            }
            
            this.settlementController.TargetExpand = new TargetExpandData(
                optimalCluster,
                requiredResourceTypes
            );
        }
        else {
            this.settlementController.Debug(`No resource cluster for mining selected`);
            
            this.settlementController.TargetExpand = new TargetExpandData( //when in doubt - build more izbas!!
                null,
                [MaraResourceType.People]
            );
        }
    }

    private isFreeWoodcuttingCluster(cluster: MaraResourceCluster): boolean {
        for (let sawmillData of this.settlementController.MiningController.Sawmills) {
            if (
                MaraUtils.ChebyshevDistance(cluster.Center, sawmillData.Sawmill.CellCenter) < 
                    this.settlementController.Settings.ResourceMining.WoodcuttingRadius
            ) {
                return false;
            }
        }
        
        return true;
    }

    private canPlaceMine(cluster: MaraResourceCluster, resourceType: MaraResourceType): boolean {
        let mineConfigs = MaraUtils.GetAllMineConfigIds(this.settlementController.Settlement);
        let cfgId = MaraUtils.RandomSelect<string>(this.settlementController.MasterMind, mineConfigs);

        if (cfgId == null) {
            return false;
        }

        let position = this.settlementController.MiningController.FindMinePosition(
            cluster, 
            MaraUtils.GetUnitConfig(cfgId),
            resourceType
        );

        return position != null;
    }

    private selectOptimalResourceCluster(requiredResources: MaraResources): MaraResourceCluster | null {
        let candidates: Array<MaraResourceCluster> = [];
        
        let requiredGold = requiredResources.Gold;
        let requiredMetal = requiredResources.Metal;
        let requiredWood = requiredResources.Wood;

        MaraResourceMap.ResourceClusters.forEach((value) => {
            if (requiredGold > 0) {
                let freeGold = this.getUnoccupiedMinerals(value.GoldCells);
                
                if (freeGold > requiredGold && this.canPlaceMine(value, MaraResourceType.Gold)) {
                    candidates.push(value);
                    return;
                }
            }
            
            if (requiredMetal > 0) {
                let freeMetal = this.getUnoccupiedMinerals(value.MetalCells);
                
                if (freeMetal > requiredMetal && this.canPlaceMine(value, MaraResourceType.Metal)) {
                    candidates.push(value);
                    return;
                }
            }
            
            if (requiredWood > 0 && value.WoodAmount >= requiredWood) {
                if (this.isFreeWoodcuttingCluster(value)) {
                    candidates.push(value);
                    return;
                }
            }
        });

        this.settlementController.Debug(`Candidate resource clusters:`);
        for (let cluster of candidates) {
            this.settlementController.Debug(`(${cluster.Center.ToString()})`);
        }

        if (candidates.length > 0) {
            let settlementLocation = this.settlementController.GetSettlementLocation();

            if (settlementLocation) {
                let sortData = candidates.map((value) => {
                    return {
                        Distance: MaraUtils.ChebyshevDistance(settlementLocation.Center, value.Center),
                        Cluster: value
                    }
                });

                sortData.sort((a, b) => a.Distance - b.Distance);

                let closestSortData = sortData.slice(0, 10);
                let closestCandidates = closestSortData.map((value) => value.Cluster);

                return this.settlementController.StrategyController.SelectOptimalResourceCluster(closestCandidates);
            }
            else {
                return null;
            }
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
                freeMinerals += MaraResourceMap.GetCellMineralsAmount(cell.X, cell.Y);
            }
        }

        return freeMinerals;
    }
}