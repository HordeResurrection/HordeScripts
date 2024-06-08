import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { MaraResourceCluster, MaraResourceMap, MaraResourceType } from "../MaraResourceMap";
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
            // if (mineData.Miners.length == 0) {
            //     continue;
            // }

            let mineResources = this.getMineResources(mineData.Mine);

            totalResources.Gold += mineResources.Gold;
            totalResources.Metal += mineResources.Metal;
        }

        for (let sawmillData of this.Sawmills) {
            // if (sawmillData.Woodcutters.length == 0) {
            //     continue;
            // }
            
            MaraResourceMap.ResourceClusters.forEach(
                (value) => {
                    if (
                        MaraUtils.ChebyshevDistance(value.Center, sawmillData.Sawmill.CellCenter) <= 
                            this.parentController.Settings.ResourceMining.WoodcuttingRadius
                    ) {
                        totalResources.Wood += value.WoodAmount;
                    }
                }
            );
        }

        let model = MaraUtils.GetPropertyValue(settlement.Census, "Model");
        let taxFactor = model.TaxFactor;

        totalResources.Gold += taxFactor.Gold * totalResources.People;
        totalResources.Wood += taxFactor.Lumber * totalResources.People;
        totalResources.Metal += taxFactor.Metal * totalResources.People;

        return totalResources;
    }

    public GetFreeHarvesters(): Array<any> {
        this.engageFreeHarvesters();
        return this.getUnengagedHarvesters();
    }

    GetRectResources(topLeft: MaraPoint, bottomRight: MaraPoint): MaraResources {
        let result = new MaraResources(0, 0, 0, 0);

        for (let row = topLeft.Y; row <= bottomRight.Y; row++) {
            for (let col = topLeft.X; col <= bottomRight.X; col++) {
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

    public FindMinePosition(resourceCluster: MaraResourceCluster, mineConfig: any, targetResourceType: MaraResourceType): MaraPoint | null {
        let mineralCells = [...resourceCluster.GoldCells, ...resourceCluster.MetalCells];
        let rect = MaraUtils.GetCircumscribingRect(mineralCells);

        let optimalPosition: MaraPoint | null = null;
        let optimalPositionResources: MaraResources | null = null;

        for (let row = rect.topLeft.Y - mineConfig.Size.Height; row <= rect.bottomRight.Y; row++) {
            for (let col = rect.topLeft.X - mineConfig.Size.Width; col <= rect.bottomRight.X; col++) {
                if (unitCanBePlacedByRealMap(mineConfig, col, row)) {
                    let positionResources = this.GetRectResources(
                        new MaraPoint(col, row),
                        new MaraPoint(col + mineConfig.Size.Width - 1, row + mineConfig.Size.Height - 1)
                    );
                    
                    if (optimalPositionResources) {
                        if (targetResourceType == MaraResourceType.Gold) {
                            if (positionResources.Gold > optimalPositionResources.Gold) {
                                optimalPosition = new MaraPoint(col, row);
                                optimalPositionResources = positionResources;
                            }
                            else if (
                                positionResources.Gold == optimalPositionResources.Gold &&
                                positionResources.Metal > optimalPositionResources.Metal
                            ) {
                                optimalPosition = new MaraPoint(col, row);
                                optimalPositionResources = positionResources;
                            }
                        }
                        else {
                            if (positionResources.Metal > optimalPositionResources.Metal) {
                                optimalPosition = new MaraPoint(col, row);
                                optimalPositionResources = positionResources;
                            }
                            else if (
                                positionResources.Metal == optimalPositionResources.Metal &&
                                positionResources.Gold > optimalPositionResources.Gold
                            ) {
                                optimalPosition = new MaraPoint(col, row);
                                optimalPositionResources = positionResources;
                            }
                        }
                    }
                    else {
                        if (targetResourceType == MaraResourceType.Gold && positionResources.Gold > 0) {
                            optimalPosition = new MaraPoint(col, row);
                            optimalPositionResources = positionResources;
                        }
                        else if (targetResourceType == MaraResourceType.Metal && positionResources.Metal > 0) {
                            optimalPosition = new MaraPoint(col, row);
                            optimalPositionResources = positionResources;
                        }
                    }
                }
            }
        }

        return optimalPosition;
    }

    public GetMaxHarvesterCount(): number {
        let maxMiners = 0;

        for (let mineData of this.Mines) {
            maxMiners += this.getMinerCount(mineData.Mine);
        }
        
        return maxMiners +
            this.Sawmills.length * this.parentController.Settings.ResourceMining.MaxWoodcuttersPerSawmill;
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
                    this.isUnreservedHarvester(value) &&
                    !engagedHarvesters.find((harvester) => {return harvester == value})
                );
            }
        );

        return freeHarvesters;
    }

    private isUnreservedHarvester(unit: any) {
        return (
            unit.IsAlive && !this.parentController.ReservedUnitsData.IsUnitReserved(unit)
        );
    }

    private buildingFilter(building: any): boolean {
        return (
            building.IsAlive && 
            building.Owner == this.parentController.Settlement &&
            this.parentController.StrategyController.IsSafeExpand(building.CellCenter)
        )
    }

    private cleanup(): void {
        this.metalStocks = null;
        
        this.Mines = this.Mines.filter((value) => {return this.buildingFilter(value.Mine)});

        for (let mineData of this.Mines) {
            mineData.Miners = mineData.Miners.filter((value) => {return this.isUnreservedHarvester(value)});
        }

        this.Sawmills = this.Sawmills.filter((value) => {return this.buildingFilter(value.Sawmill)});

        for (let sawmillData of this.Sawmills) {
            sawmillData.Woodcutters = sawmillData.Woodcutters.filter((value) => {return this.isUnreservedHarvester(value)})
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
                
                if (!mineData && this.parentController.StrategyController.IsSafeExpand(unit.CellCenter)) {
                    mineData = new MineData();
                    mineData.Mine = unit;
                    this.Mines.push(mineData);
                }
            }
            else if (MaraUtils.IsSawmillConfig(unit.Cfg)) {
                let sawmillData = this.Sawmills.find((value) => {return value.Sawmill == unit});

                if (!sawmillData && this.parentController.StrategyController.IsSafeExpand(unit.CellCenter)) {
                    sawmillData = new SawmillData();
                    sawmillData.Sawmill = unit;
                    this.Sawmills.push(sawmillData);
                }
            }
        }
    }

    private getMineResources(mine: any): MaraResources {
        return this.GetRectResources(
            new MaraPoint(mine.Cell.X, mine.Cell.Y),
            new MaraPoint(mine.Cell.X + mine.Rect.Width - 1, mine.Cell.Y + mine.Rect.Height - 1)
        );
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
            else if (mineData.Miners.length > requiredMiners) {
                mineData.Miners.length = requiredMiners;
            }
        }

        const minWoodcuttersPerSawmill = this.parentController.Settings.ResourceMining.MinWoodcuttersPerSawmill;

        if (minerRequrement > 0) {
            for (let sawmillData of this.Sawmills) {
                if (sawmillData.Woodcutters.length > minWoodcuttersPerSawmill) {
                    // just remove woodcutters from array which marks them as free
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