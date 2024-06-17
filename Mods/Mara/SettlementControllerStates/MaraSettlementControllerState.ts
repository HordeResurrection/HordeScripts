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
        let atLeastOneSawmillPresent = false;
        
        for (let sawmillData of this.settlementController.MiningController.Sawmills) {
            if (
                MaraUtils.ChebyshevDistance(cluster.Center, sawmillData.Sawmill.CellCenter) < 
                    this.settlementController.Settings.ResourceMining.WoodcuttingRadius
            ) {
                atLeastOneSawmillPresent = true;
                
                if (sawmillData.Woodcutters.length < this.settlementController.Settings.ResourceMining.MaxWoodcuttersPerSawmill) {
                    return true;
                }
            }
        }
        
        return !atLeastOneSawmillPresent;
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
                }
            }
            else if (requiredMetal > 0 && this.canPlaceMine(value, MaraResourceType.Metal)) {
                let freeMetal = this.getUnoccupiedMinerals(value.MetalCells);
                
                if (freeMetal > requiredMetal) {
                    candidates.push(value);
                }
            }
            else if (requiredWood > 0 && value.WoodAmount >= requiredWood) {
                if (this.isFreeWoodcuttingCluster(value)) {
                    candidates.push(value);
                }
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