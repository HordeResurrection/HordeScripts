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

    private metalStocks: Array<any> | null = null;
    
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
            this.checkForUnaccountedBuildings();
            this.redistributeHarvesters();
            this.engageFreeHarvesters();
            this.engageIdleHarvesters();
        }
    }

    public GetTotalResources(): MaraResources {
        this.checkForUnaccountedBuildings();
        
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

    public GetFreeHarvesters(): Array<any> {
        this.engageFreeHarvesters();
        return this.getUnengagedHarvesters();
    }

    private getClosestMetalStock(point: MaraPoint): any | null {
        if (!this.metalStocks) {
            let allUnits = MaraUtils.GetAllSettlementUnits(this.parentController.Settlement);
            this.metalStocks = allUnits.filter( (value) => {return MaraUtils.IsMetalStockConfig(value.Cfg)} );
        }
        
        let closestDistance = Infinity;
        let closestMetalStock: any | null = null;

        for (let metalStock of this.metalStocks) {
            let distance = MaraUtils.ChebyshevDistance(point, metalStock.CellCenter)
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestMetalStock = metalStock;
            }
        }

        return closestMetalStock;
    }

    private getMinerCount(mine: any): number {
        let minerCount = this.parentController.Settings.ResourceMining.MinMinersPerMine;
        let closestStock = this.getClosestMetalStock(mine.CellCenter);

        if (closestStock) {
            let distance = MaraUtils.ChebyshevDistance(mine.CellCenter, closestStock.CellCenter);
            let additionalMinerCount = Math.floor(distance / 8);
            minerCount += additionalMinerCount;
        }

        return minerCount;
    }

    private getUnengagedHarvesters(): Array<any> {
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
                return (
                    this.isFreeHarvester(value) &&
                    !engagedHarvesters.find((harvester) => {return harvester == value})
                );
            }
        );

        return freeHarvesters;
    }

    private isFreeHarvester(unit: any) {
        return (
            unit.IsAlive && !this.parentController.ReservedUnitsData.IsUnitReserved(unit)
        );
    }

    private cleanup(): void {
        this.metalStocks = null;
        
        this.Mines = this.Mines.filter((value) => {return value.Mine.IsAlive && value.Mine.Owner == this.parentController.Settlement});

        for (let mineData of this.Mines) {
            mineData.Miners = mineData.Miners.filter((value) => {return this.isFreeHarvester(value)});
        }

        this.Sawmills = this.Sawmills.filter((value) => {return value.Sawmill.IsAlive && value.Sawmill.Owner == this.parentController.Settlement});

        for (let sawmillData of this.Sawmills) {
            sawmillData.Woodcutters = sawmillData.Woodcutters.filter((value) => {return this.isFreeHarvester(value)})
        }
    }

    private checkForUnaccountedBuildings(): void {
        let units = enumerate(this.parentController.Settlement.Units);
        let unit;
        
        while ((unit = eNext(units)) !== undefined) {
            if (unit.EffectsMind.BuildingInProgress) {
                continue;
            }

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

    private redistributeHarvesters(): void {
        let minerRequrement = 0;

        for (let mineData of this.Mines) {
            let requiredMiners = this.getMinerCount(mineData.Mine);
            
            if (mineData.Miners.length < requiredMiners) {
                minerRequrement += requiredMiners - mineData.Miners.length;
            }
        }

        const minWoodcuttersPerSawmill = this.parentController.Settings.ResourceMining.MinWoodcuttersPerSawmill;

        if (minerRequrement > 0) {
            for (let sawmillData of this.Sawmills) {
                if (sawmillData.Woodcutters.length > minWoodcuttersPerSawmill) {
                    // just remoe woodcutters from array which marks them as free
                    // they will be processed in engageFreeHarvesters() later

                    let maxWoodcuttersToRemove = Math.min(sawmillData.Woodcutters.length - minWoodcuttersPerSawmill, minerRequrement);
                    sawmillData.Woodcutters = sawmillData.Woodcutters.splice(0, maxWoodcuttersToRemove);
                    
                    minerRequrement -= maxWoodcuttersToRemove;

                    if (minerRequrement == 0) {
                        break;
                    }
                }
            }
        }
    }

    private engageFreeHarvesters(): void {
        let freeHarvesters = this.getUnengagedHarvesters();

        let freeHarvesterIndex = 0;
        const maxWoodcutters = this.parentController.Settings.ResourceMining.MaxWoodcuttersPerSawmill;

        while (freeHarvesterIndex < freeHarvesters.length) {
            let understaffedMineData = this.Mines.find(
                (value) => {
                    let requiredMiners = this.getMinerCount(value.Mine);
                    return value.Miners.length < requiredMiners;
                }
            );

            if (understaffedMineData) {
                let requiredMiners = this.getMinerCount(understaffedMineData.Mine);
                let minerCount = requiredMiners - understaffedMineData.Miners.length;
                let lastHarvesterIndex = Math.min(freeHarvesterIndex + minerCount, freeHarvesters.length);

                let minersToAdd = freeHarvesters.slice(freeHarvesterIndex, lastHarvesterIndex); //last index is not included into result
                understaffedMineData.Miners.push(...minersToAdd);
                this.parentController.ReservedUnitsData.AddReservableUnits(minersToAdd, 1);
                MaraUtils.IssueMineCommand(minersToAdd, this.parentController.Player, understaffedMineData.Mine.Cell);

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
                    this.parentController.ReservedUnitsData.AddReservableUnits(woodcuttersToAdd, 0);
                    
                    let woodCell = this.findWoodCell(understaffedSawmillData.Sawmill);
                    MaraUtils.IssueHarvestLumberCommand(woodcuttersToAdd, this.parentController.Player, woodCell);
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
        let allUnits = MaraUtils.GetAllSettlementUnits(this.parentController.Settlement);
        return allUnits.filter( (value) => {return MaraUtils.IsHarvesterConfig(value.Cfg)} );
    }
}