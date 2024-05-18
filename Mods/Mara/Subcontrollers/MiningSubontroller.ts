import { MaraPoint, MaraResources, eNext, enumerate } from "../Utils/Common";
import { MaraUtils, ResourceType } from "../Utils/MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraSettlementController } from "Mara/MaraSettlementController";

class MineData {
    public Mine: any = null;
    public Miners: Array<any> = [];
}

class SawmillData {
    public Sawmill: any = null;
    public Woodcutters: Array<any> = [];
}

export class MiningSubcontroller extends MaraSubcontroller {
    public Mines: Array<MineData> = [];
    public Sawmills: Array<SawmillData> = [];
    
    constructor (parent: MaraSettlementController) {
        super(parent);
    }

    Tick(tickNumber: number): void {
        if (tickNumber % 50 != 0) {
            return;
        }

        this.cleanup();
        this.destroyEmptyMines();

        if (tickNumber % (5 * 50) == 0) {
            this.checkForUnaccountingBuildings();
            this.engageFreeHarvesters();
            this.engageIdleHarvesters();
        }
    }

    public GetTotalResources(): MaraResources {
        let settlement = this.parentController.Settlement;
        let settlementResources = settlement.Resources;
        
        let totalResources = new MaraResources(
            settlementResources.Lumber,
            settlementResources.Metal,
            settlementResources.Gold,
            0
        );

        let freeHousing = Math.max(settlement.Census.MaxPeople - settlement.Census.BusyAndReservedPeople, 0);
        totalResources.People = settlementResources.FreePeople + freeHousing;

        for (let mineData of this.Mines) {
            let mineResources = this.getMineResources(mineData.Mine);

            totalResources.Gold += mineResources.Gold;
            totalResources.Metal += mineResources.Metal;
        }

        for (let sawmillData of this.Sawmills) {
            MaraUtils.ForEachCell(
                sawmillData.Sawmill.CellCenter,
                this.parentController.Settings.ResourceMining.WoodcuttingRadius,
                (cell) => {
                    let treesCount = MaraUtils.GetCellTreesCount(cell.X, cell.Y);
                    totalResources.Wood += treesCount * 10;
                }
            );
        }

        return totalResources;
    }

    private cleanup() {
        this.Mines = this.Mines.filter((value) => {return value.Mine.IsAlive && value.Mine.Owner == this.parentController.Settlement});

        for (let mineData of this.Mines) {
            mineData.Miners = mineData.Miners.filter((value) => {return value.IsAlive});
        }

        this.Sawmills = this.Sawmills.filter((value) => {return value.Sawmill.IsAlive && value.Sawmill.Owner == this.parentController.Settlement});

        for (let sawmillData of this.Sawmills) {
            sawmillData.Woodcutters = sawmillData.Woodcutters.filter((value) => {return value.IsAlive})
        }
    }

    GetFreeHarvesters(): Array<any> {
        let engagedHarvesters: Array<any> = [];

        for (let mineData of this.Mines) {
            engagedHarvesters.push(...mineData.Miners);
        }

        for (let sawmillData of this.Sawmills) {
            engagedHarvesters.push(...sawmillData.Woodcutters);
        }

        let allHarvesters = this.findAllHarvesters();
        let freeHarvesters = allHarvesters.filter(
            (value) => {
                return !engagedHarvesters.find(
                    (harvester) => {return harvester == value}
                )
            }
        );

        return freeHarvesters;
    }

    private checkForUnaccountingBuildings() {
        let units = enumerate(this.parentController.Settlement.Units);
        let unit;
        
        while ((unit = eNext(units)) !== undefined) {
            if (MaraUtils.IsMineConfig(unit.Cfg)) {
                let mineData = this.Mines.find((value) => {return value.Mine == unit});
                
                if (!mineData) {
                    mineData = new MineData();
                    mineData.Mine = unit;
                    this.Mines.push(mineData);
                }
            }
            else if (MaraUtils.IsSawmillConfig(unit.Cfg)) {
                let sawmillData = this.Sawmills.find((value) => {return value.Sawmill == unit});

                if (!sawmillData) {
                    sawmillData = new SawmillData();
                    sawmillData.Sawmill = unit;
                    this.Sawmills.push(sawmillData);
                }
            }
        }
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

    private findWoodCell(sawmill: any): MaraPoint | null {
        let cell = MaraUtils.FindClosestCell(
            sawmill.CellCenter,
            this.parentController.Settings.ResourceMining.WoodcuttingRadius,
            (cell) => {return MaraUtils.GetCellTreesCount(cell.X, cell.Y) > 0;}
        )
        
        return cell;
    }

    private engageFreeHarvesters(): void {
        let freeHarvesters = this.GetFreeHarvesters();

        let freeHarvesterIndex = 0;
        const maxMiners = this.parentController.Settings.ResourceMining.MinersPerMine;
        const maxWoodcutters = this.parentController.Settings.ResourceMining.WoodcuttersPerSawmill;

        while (freeHarvesterIndex < freeHarvesters.length) {
            let understaffedMineData = this.Mines.find(
                (value) => {
                    return value.Miners.length < maxMiners;
                }
            );

            if (understaffedMineData) {
                let minerCount = maxMiners - understaffedMineData.Miners.length;
                let lastHarvesterIndex = Math.min(freeHarvesterIndex + minerCount, freeHarvesters.length);

                let minersToAdd = freeHarvesters.slice(freeHarvesterIndex, lastHarvesterIndex); //last index is not included into result
                understaffedMineData.Miners.push(...minersToAdd);
                freeHarvesterIndex = lastHarvesterIndex;

                continue;
            }
            else {
                let understaffedSawmillData = this.Sawmills.find((value) => {
                        return value.Woodcutters.length < maxWoodcutters && this.findWoodCell(value.Sawmill) != null;
                    }
                );

                if (understaffedSawmillData) {
                    let woodcutterCount = maxWoodcutters - understaffedSawmillData.Woodcutters.length;
                    let lastHarvesterIndex = Math.min(freeHarvesterIndex + woodcutterCount, freeHarvesters.length);

                    let woodcuttersToAdd = freeHarvesters.slice(freeHarvesterIndex, lastHarvesterIndex);
                    understaffedSawmillData.Woodcutters.push(...woodcuttersToAdd);
                    freeHarvesterIndex = lastHarvesterIndex;

                    continue;
                }
                else {
                    break;
                }
            }
        }
    }

    private engageIdleHarvesters(): void {
        for (let mineData of this.Mines) {
            for (let miner of mineData.Miners) {
                if (miner.OrdersMind.IsIdle()) {
                    MaraUtils.IssueMineCommand([miner], this.parentController.Player, mineData.Mine.Cell);
                }
            }
        }

        for (let sawmillData of this.Sawmills) {
            let woodCell = this.findWoodCell(sawmillData.Sawmill);

            if (woodCell) {
                for (let woodcutter of sawmillData.Woodcutters) {
                    if (woodcutter.OrdersMind.IsIdle()) {
                        MaraUtils.IssueHarvestLumberCommand([woodcutter], this.parentController.Player, woodCell);
                    }
                }
            }
            else {
                sawmillData.Woodcutters = [];
            }
        }
    }

    private destroyEmptyMines(): void {
        for (let mineData of this.Mines) {
            let mineResources = this.getMineResources(mineData.Mine);

            if (mineResources.Gold == 0 && mineResources.Metal == 0) {
                MaraUtils.IssueSelfDestructCommand([mineData.Mine], this.parentController.Player);
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