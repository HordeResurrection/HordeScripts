import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { MaraMap } from "../Common/MapAnalysis/MaraMap";
import { MaraResourceType } from "../Common/MapAnalysis/MaraResourceType";
import { MaraResources } from "../Common/MapAnalysis/MaraResources";
import { MaraPoint } from "../Common/MaraPoint";
import { MaraUtils, ResourceType } from "../MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraResourceCluster } from "../Common/MapAnalysis/MaraResourceCluster";
import { MaraUnitCache } from "../Common/Cache/MaraUnitCache";
import { MaraUnitCacheItem } from "../Common/Cache/MaraUnitCacheItem";

class MineData {
    public Mine: MaraUnitCacheItem | null = null;
    public Miners: Array<MaraUnitCacheItem> = [];
}

class SawmillData {
    public Sawmill: MaraUnitCacheItem | null = null;
    public Woodcutters: Array<MaraUnitCacheItem> = [];
}

export class MiningSubcontroller extends MaraSubcontroller {
    public Sawmills: Array<SawmillData> = [];

    private metalStocks: Array<MaraUnitCacheItem> | null = null;
    private mines: Array<MineData> = [];
    
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
        
        let settlement = this.settlementController.Settlement;
        let settlementResources = settlement.Resources;
        
        let totalResources = new MaraResources(
            settlementResources.Lumber,
            settlementResources.Metal,
            settlementResources.Gold,
            0
        );

        let freeHousing = Math.max(settlement.Census.MaxPeople - settlement.Census.BusyAndReservedPeople, 0);
        totalResources.People = settlementResources.FreePeople + freeHousing;

        for (let mineData of this.mines) {
            let mineResources = this.getMineResources(mineData.Mine!);

            totalResources.Gold += mineResources.Gold;
            totalResources.Metal += mineResources.Metal;
        }

        for (let sawmillData of this.Sawmills) {
            MaraMap.ResourceClusters.forEach(
                (value) => {
                    if (
                        MaraUtils.ChebyshevDistance(value.Center, sawmillData.Sawmill?.UnitRect.Center) < 
                            this.settlementController.Settings.ResourceMining.WoodcuttingRadius
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

    public GetFreeHarvesters(): Array<MaraUnitCacheItem> {
        this.engageFreeHarvesters();
        return this.getUnengagedHarvesters();
    }

    public GetRectResources(topLeft: MaraPoint, bottomRight: MaraPoint): MaraResources {
        let result = new MaraResources(0, 0, 0, 0);

        for (let row = topLeft.Y; row <= bottomRight.Y; row++) {
            for (let col = topLeft.X; col <= bottomRight.X; col++) {
                let mineralType = MaraMap.GetCellMineralType(col, row);
                let mineralAmount = MaraMap.GetCellMineralsAmount(col, row);

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

    public FindMinePosition(resourceCluster: MaraResourceCluster, mineConfigId: string, targetResourceType: MaraResourceType): MaraPoint | null {
        let mineralCells = [...resourceCluster.GoldCells, ...resourceCluster.MetalCells];
        let rect = MaraUtils.GetBoundingRect(mineralCells);

        let optimalPosition: MaraPoint | null = null;
        let optimalPositionResources: MaraResources | null = null;

        let mineHeigth = MaraUtils.GetConfigIdHeight(mineConfigId);
        let mineWidth = MaraUtils.GetConfigIdWidth(mineConfigId);

        let mineConfig = MaraUtils.GetUnitConfig(mineConfigId);

        for (let row = Math.max(rect.TopLeft.Y - mineHeigth, 0); row <= rect.BottomRight.Y; row ++) {
            for (let col = Math.max(rect.TopLeft.X - mineWidth, 0); col <= rect.BottomRight.X; col ++) {
                if (unitCanBePlacedByRealMap(mineConfig, col, row)) {
                    let position = new MaraPoint(col, row);
                    
                    let positionResources = this.GetRectResources(
                        position,
                        new MaraPoint(col + mineWidth - 1, row + mineHeigth - 1)
                    );
                    
                    if (optimalPositionResources) {
                        if (targetResourceType == MaraResourceType.Gold) {
                            if (positionResources.Gold > optimalPositionResources.Gold) {
                                optimalPosition = position;
                                optimalPositionResources = positionResources;
                            }
                            else if (
                                positionResources.Gold == optimalPositionResources.Gold &&
                                positionResources.Metal > optimalPositionResources.Metal
                            ) {
                                optimalPosition = position;
                                optimalPositionResources = positionResources;
                            }
                        }
                        else {
                            if (positionResources.Metal > optimalPositionResources.Metal) {
                                optimalPosition = position;
                                optimalPositionResources = positionResources;
                            }
                            else if (
                                positionResources.Metal == optimalPositionResources.Metal &&
                                positionResources.Gold > optimalPositionResources.Gold
                            ) {
                                optimalPosition = position;
                                optimalPositionResources = positionResources;
                            }
                        }
                    }
                    else {
                        if (targetResourceType == MaraResourceType.Gold && positionResources.Gold > 0) {
                            optimalPosition = position;
                            optimalPositionResources = positionResources;
                        }
                        else if (targetResourceType == MaraResourceType.Metal && positionResources.Metal > 0) {
                            optimalPosition = position;
                            optimalPositionResources = positionResources;
                        }
                    }
                }
            }
        }

        return optimalPosition;
    }

    public GetOptimalHarvesterCount(): number {
        this.checkForUnaccountedBuildings();
        let maxMiners = 0;

        for (let mineData of this.mines) {
            maxMiners += this.getMinerCount(mineData.Mine!);
        }
        
        return maxMiners +
            this.Sawmills.length * this.settlementController.Settings.ResourceMining.WoodcutterBatchSize;
    }

    private getClosestMetalStock(point: MaraPoint): MaraUnitCacheItem | null {
        if (!this.metalStocks) {
            let allUnits = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
            this.metalStocks = allUnits.filter( (value) => {return MaraUtils.IsMetalStockConfigId(value.UnitCfgId)} );
        }
        
        let closestDistance = Infinity;
        let closestMetalStock: MaraUnitCacheItem | null = null;

        for (let metalStock of this.metalStocks) {
            let distance = MaraUtils.ChebyshevDistance(point, metalStock.UnitRect.Center)
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestMetalStock = metalStock;
            }
        }

        return closestMetalStock;
    }

    private getMinerCount(mine: MaraUnitCacheItem): number {
        let minerCount = this.settlementController.Settings.ResourceMining.MinMinersPerMine;
        let closestStock = this.getClosestMetalStock(mine.UnitRect.Center);

        if (closestStock) {
            let distance = MaraUtils.ChebyshevDistance(mine.UnitRect.Center, closestStock.UnitRect.Center);
            let additionalMinerCount = Math.floor(distance / 8);
            minerCount += additionalMinerCount;
        }

        return minerCount;
    }

    private getUnengagedHarvesters(): Array<MaraUnitCacheItem> {
        let engagedHarvesters: Array<MaraUnitCacheItem> = [];

        for (let mineData of this.mines) {
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

    private isUnreservedHarvester(unit: MaraUnitCacheItem) {
        return (
            unit.Unit.IsAlive && !this.settlementController.ReservedUnitsData.IsUnitReserved(unit)
        );
    }

    private isValidHarvestingBuilding(building: MaraUnitCacheItem): boolean {
        return (
            building.Unit.IsAlive && 
            building.UnitOwner == this.settlementController.Settlement &&
            this.settlementController.StrategyController.IsSafeExpand(building.UnitRect.Center)
        )
    }

    private cleanup(): void {
        this.metalStocks = null;
        
        this.mines = this.mines.filter((value) => {return this.isValidHarvestingBuilding(value.Mine!)});

        for (let mineData of this.mines) {
            mineData.Miners = mineData.Miners.filter((value) => {return this.isUnreservedHarvester(value)});
        }

        this.Sawmills = this.Sawmills.filter((value) => {return this.isValidHarvestingBuilding(value.Sawmill!)});

        for (let sawmillData of this.Sawmills) {
            sawmillData.Woodcutters = sawmillData.Woodcutters.filter((value) => {return this.isUnreservedHarvester(value)})
        }
    }

    private checkForUnaccountedBuildings(): void {
        let units = MaraUnitCache.GetAllSettlementUnits(this.settlementController.Settlement);
        
        for (let unit of units) {
            if (unit.Unit.EffectsMind.BuildingInProgress) {
                continue;
            }

            if (MaraUtils.IsMineConfigId(unit.UnitCfgId)) {
                let mineData = this.mines.find((value) => {return value.Mine == unit});
                
                if (!mineData && this.isValidHarvestingBuilding(unit)) {
                    mineData = new MineData();
                    mineData.Mine = unit;
                    this.mines.push(mineData);
                }
            }
            else if (MaraUtils.IsSawmillConfigId(unit.UnitCfgId)) {
                let sawmillData = this.Sawmills.find((value) => {return value.Sawmill == unit});

                if (!sawmillData && this.isValidHarvestingBuilding(unit)) {
                    sawmillData = new SawmillData();
                    sawmillData.Sawmill = unit;
                    this.Sawmills.push(sawmillData);
                }
            }
        }
    }

    private getMineResources(mine: MaraUnitCacheItem): MaraResources {
        return this.GetRectResources(
            mine.UnitRect.TopLeft,
            mine.UnitRect.BottomRight
        );
    }

    private findWoodCell(sawmill: MaraUnitCacheItem): MaraPoint | null {
        let cell = MaraUtils.FindClosestCell(
            sawmill.UnitRect.Center,
            this.settlementController.Settings.ResourceMining.WoodcuttingRadius + MaraMap.RESOURCE_CLUSTER_SIZE / 2,
            (cell) => {return MaraMap.GetCellTreesCount(cell.X, cell.Y) > 0;}
        )
        
        return cell;
    }

    private redistributeHarvesters(): void {
        let minerRequrement = 0;

        for (let mineData of this.mines) {
            let requiredMiners = this.getMinerCount(mineData.Mine!);
            
            if (mineData.Miners.length < requiredMiners) {
                minerRequrement += requiredMiners - mineData.Miners.length;
            }
            else if (mineData.Miners.length > requiredMiners) {
                mineData.Miners.length = requiredMiners;
            }
        }

        const minWoodcuttersPerSawmill = this.settlementController.Settings.ResourceMining.MinWoodcuttersPerSawmill;

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
        const maxWoodcutters = this.settlementController.Settings.ResourceMining.MaxWoodcuttersPerSawmill;

        while (freeHarvesterIndex < freeHarvesters.length) {
            let understaffedMineData = this.mines.find(
                (value) => {
                    let requiredMiners = this.getMinerCount(value.Mine!);
                    return value.Miners.length < requiredMiners;
                }
            );

            if (understaffedMineData) {
                let requiredMiners = this.getMinerCount(understaffedMineData.Mine!);
                let minerCount = requiredMiners - understaffedMineData.Miners.length;
                let lastHarvesterIndex = Math.min(freeHarvesterIndex + minerCount, freeHarvesters.length);

                let minersToAdd = freeHarvesters.slice(freeHarvesterIndex, lastHarvesterIndex); //last index is not included into result
                understaffedMineData.Miners.push(...minersToAdd);
                this.settlementController.ReservedUnitsData.AddReservableUnits(minersToAdd, 1);
                MaraUtils.IssueMineCommand(minersToAdd, this.settlementController.Player, understaffedMineData.Mine!.UnitCell);

                freeHarvesterIndex = lastHarvesterIndex;

                continue;
            }
            else {
                let understaffedSawmillData = this.Sawmills.find((value) => {
                        return value.Woodcutters.length < maxWoodcutters && this.findWoodCell(value.Sawmill!) != null;
                    }
                );

                if (understaffedSawmillData) {
                    let woodcutterCount = maxWoodcutters - understaffedSawmillData.Woodcutters.length;
                    let lastHarvesterIndex = Math.min(freeHarvesterIndex + woodcutterCount, freeHarvesters.length);

                    let woodcuttersToAdd = freeHarvesters.slice(freeHarvesterIndex, lastHarvesterIndex);
                    understaffedSawmillData.Woodcutters.push(...woodcuttersToAdd);
                    this.settlementController.ReservedUnitsData.AddReservableUnits(woodcuttersToAdd, 0);
                    
                    let woodCell = this.findWoodCell(understaffedSawmillData.Sawmill!);
                    MaraUtils.IssueHarvestLumberCommand(woodcuttersToAdd, this.settlementController.Player, woodCell);
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
        for (let mineData of this.mines) {
            for (let miner of mineData.Miners) {
                if (miner.Unit.OrdersMind.IsIdle()) {
                    MaraUtils.IssueMineCommand([miner], this.settlementController.Player, mineData.Mine!.UnitCell);
                }
            }
        }

        for (let sawmillData of this.Sawmills) {
            let woodCell = this.findWoodCell(sawmillData.Sawmill!);

            if (woodCell) {
                for (let woodcutter of sawmillData.Woodcutters) {
                    if (woodcutter.Unit.OrdersMind.IsIdle()) {
                        MaraUtils.IssueHarvestLumberCommand([woodcutter], this.settlementController.Player, woodCell);
                    }
                }
            }
            else {
                sawmillData.Woodcutters = [];
            }
        }
    }

    private destroyEmptyMines(): void {
        for (let mineData of this.mines) {
            let mineResources = this.getMineResources(mineData.Mine!);

            if (mineResources.Gold == 0 && mineResources.Metal == 0) {
                MaraUtils.IssueSelfDestructCommand([mineData.Mine!], this.settlementController.Player);
            }
        }
    }

    private findAllHarvesters(): Array<MaraUnitCacheItem> {
        //TODO: maybe simplify this somehow by using ProfessionCenter.Workers
        let allUnits = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        return allUnits.filter( (value) => {return MaraUtils.IsHarvesterConfigId(value.UnitCfgId)} );
    }
}