import { MaraPoint, MaraResources, eNext, enumerate } from "../Utils/Common";
import { MaraUtils, ResourceType } from "../Utils/MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraSettlementCluster, MaraSettlementController } from "Mara/MaraSettlementController";

export class MiningSubcontroller extends MaraSubcontroller {
    constructor (parent: MaraSettlementController) {
        super(parent);
    }

    Tick(tickNumber: number): void {
        if (tickNumber % 50 != 0) {
            return;
        }

        this.destroyEmptyMines();
        this.engageFreeHarvesters();
        this.engageIdleHarvesters();
    }

    public GetTotalResources(): MaraResources {
        let settlementResources = this.parentController.Settlement.Resources;
        
        let totalResources = new MaraResources(
            settlementResources.Lumber,
            settlementResources.Metal,
            settlementResources.Gold,
            settlementResources.FreePeople
        );

        for (let settlementCluster of this.parentController.SettlementClusters) {
            let clusterBuildings = settlementCluster.Buildings;
            let isSawmillPresent = false;

            for (let building of clusterBuildings) {
                if (MaraUtils.IsSawmillConfig(building.Cfg)) {
                    isSawmillPresent = true;
                }

                if (MaraUtils.IsMineConfig(building.Cfg)) {
                    let mineResources = this.getMineResources(building);

                    totalResources.Gold += mineResources.Gold;
                    totalResources.Metal += mineResources.Metal;
                }
            }

            if (isSawmillPresent) {
                for (let resourceCluster of settlementCluster.ResourceClusters) {
                    totalResources.Wood += resourceCluster.WoodAmount;
                }
            }
        }

        return totalResources;
    }

    private getMineResources(mine: any): MaraResources {
        let maxCol = mine.Cell.X + mine.Rect.Width;
        let maxRow = mine.Cell.Y + mine.Rect.Height;

        let result = new MaraResources(0, 0, 0, 0);

        for (let row = mine.Cell.Y; row < maxRow; row++) {
            for (let col = mine.Cell.X; col < maxCol; col++) {
                let mineralType = MaraUtils.GetCellMineralType(col, row);
                let mineralAmount = MaraUtils.GetCellMineralsAmount(col, row);

                if (mineralType == ResourceType.Metal) {
                    result.Metal += mineralAmount;
                }
                else if (mineralType == ResourceType.Gold) {
                    result.Gold += mineralAmount;
                }
            }
        }

        return result;
    }

    private engageFreeHarvesters(): void {
        let engagedHarvesters: Array<any> = [];

        for (let settlementCluster of this.parentController.SettlementClusters) {
            engagedHarvesters.push(...settlementCluster.Woodcutters);

            for (let mineData of settlementCluster.Mines) {
                engagedHarvesters.push(...mineData.Miners);
            }
        }

        let allHarvesters = this.findAllHarvesters();
        let freeHarvesters = allHarvesters.filter(
            (value) => {
                return !engagedHarvesters.find(
                    (harvester) => {return harvester == value}
                )
            }
        );

        for (let harvester of freeHarvesters) {
            let harvesterEngaged = false;
            
            for (let settlementCluster of this.parentController.SettlementClusters) {
                for (let mineData of settlementCluster.Mines) {
                    if (mineData.Miners.length < this.parentController.Settings.ResourceMining.MinersPerMine) {
                        mineData.Miners.push(harvester);
                        harvesterEngaged = true;
                        break;
                    }
                }

                if (harvesterEngaged) {
                    break;
                }
            }

            if (!harvesterEngaged) {
                for (let settlementCluster of this.parentController.SettlementClusters) {
                    let sawmill = settlementCluster.Buildings.find((value) => {return MaraUtils.IsSawmillConfig(value.Cfg)});

                    if (sawmill) {
                        for (let resourceCluster of settlementCluster.ResourceClusters) {
                            if (resourceCluster.WoodAmount > 0) {
                                settlementCluster.Woodcutters.push(harvester);
                                harvesterEngaged = true;
                                break;
                            }
                        }
                    }

                    if (harvesterEngaged) {
                        break;
                    }
                }
            }
        }
    }

    private findWoodCell(settlementCluster: MaraSettlementCluster): MaraPoint | null {
        for (let resourceCluster of settlementCluster.ResourceClusters) {
            for (let cell of resourceCluster.WoodCells) {
                if (MaraUtils.GetCellTreesCount(cell.X, cell.Y) > 0) {
                    return cell;
                }
            }
        }

        return null;
    }

    private engageIdleHarvesters(): void {
        for (let settlementCluster of this.parentController.SettlementClusters) {
            let woodCell = this.findWoodCell(settlementCluster);
            
            if (woodCell) {
                for (let woodcutter of settlementCluster.Woodcutters) {
                    if (woodcutter.OrdersMind.IsIdle()) {
                        MaraUtils.IssueHarvestLumberCommand([woodcutter], this.parentController.Player, woodCell);
                    }
                }
            }
            else {
                settlementCluster.Woodcutters = [];
            }

            for (let mineData of settlementCluster.Mines) {
                for (let miner of mineData.Miners) {
                    if (miner.OrdersMind.IsIdle()) {
                        MaraUtils.IssueMineCommand([miner], this.parentController.Player, mineData.Mine.Cell);
                    }
                }
            }
        }
    }

    private destroyEmptyMines(): void {
        for (let settlementCluster of this.parentController.SettlementClusters) {
            for (let mineData of settlementCluster.Mines) {
                let mineResources = this.getMineResources(mineData.Mine);

                if (mineResources.Gold == 0 && mineResources.Metal == 0) {
                    MaraUtils.IssueSelfDestructCommand([mineData.Mine], this.parentController.Player);
                }
            }
        }
    }

    private findAllHarvesters(): Array<any> {
        //TODO: maybe simplify this somehow by using ProfessionCenter.Workers
        
        let units = enumerate(this.parentController.Settlement.Units);
        let unit;
        let result: Array<any> = [];
        
        while ((unit = eNext(units)) !== undefined) {
            if (MaraUtils.IsHarvesterConfig(unit.Cfg)) {
                result.push(unit);
            }
        }

        return result;
    }
}