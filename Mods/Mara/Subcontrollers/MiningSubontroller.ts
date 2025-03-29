import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { MaraMap } from "../Common/MapAnalysis/MaraMap";
import { MaraResourceType } from "../Common/MapAnalysis/MaraResourceType";
import { MaraResources } from "../Common/MapAnalysis/MaraResources";
import { MaraPoint } from "../Common/MaraPoint";
import { MaraUtils, ResourceType } from "../MaraUtils";
import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraResourceCluster } from "../Common/MapAnalysis/MaraResourceCluster";
import { MaraUnitCache } from "../Common/Cache/MaraUnitCache";
import { MaraUnitCacheItem } from "../Common/Cache/MaraUnitCacheItem";
import { MaraTaskableSubcontroller } from "./MaraTaskableSubcontroller";
import { SettlementSubcontrollerTask } from "../SettlementSubcontrollerTasks/SettlementSubcontrollerTask";
import { TargetExpandData } from "../Common/Settlement/TargetExpandData";
import { ExpandBuildTask } from "../SettlementSubcontrollerTasks/MiningSubcontroller/ExpandBuildTask/ExpandBuildTask";
import { UnitComposition } from "../Common/UnitComposition";
import { SubcontrollerRequestResult } from "../Common/SubcontrollerRequestResult";
import { MaraPriority } from "../Common/MaraPriority";
import { ProduceHarvestersTask } from "../SettlementSubcontrollerTasks/MiningSubcontroller/ProduceHarvestersTask/ProduceHarvestersTask";

class MineData {
    public Mine: MaraUnitCacheItem | null = null;
    public Miners: Array<MaraUnitCacheItem> = [];
}

class SawmillData {
    public Sawmill: MaraUnitCacheItem | null = null;
    public Woodcutters: Array<MaraUnitCacheItem> = [];
}

class NeedExpandResult {
    NeedExpand: boolean;
    MinResourceAmount: number;
    MinResourceThreshold: number;
    ResourcesToMine: MaraResources;
}

export class MiningSubcontroller extends MaraTaskableSubcontroller {
    readonly RESOURCE_THRESHOLD = 1000;
    readonly PEOPLE_THRESHOLD = 10;
    
    public Sawmills: Array<SawmillData> = [];

    private metalStocks: Array<MaraUnitCacheItem> | null = null;
    private mines: Array<MineData> = [];
    
    constructor (parent: MaraSettlementController) {
        super(parent);
    }

    public GetStashedResourses(): MaraResources {
        let settlement = this.settlementController.Settlement;
        let settlementResources = settlement.Resources;
        
        return new MaraResources(
            settlementResources.Lumber,
            settlementResources.Metal,
            settlementResources.Gold,
            settlementResources.FreePeople
        );
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

        let scenaWidth = MaraUtils.GetScenaWidth();
        let scenaHeigth = MaraUtils.GetScenaHeigth();

        let mineConfig = MaraUtils.GetUnitConfig(mineConfigId);

        for (let row = Math.max(rect.TopLeft.Y - mineHeigth + 1, 0); row <= rect.BottomRight.Y; row ++) {
            for (let col = Math.max(rect.TopLeft.X - mineWidth + 1, 0); col <= rect.BottomRight.X; col ++) {
                if (unitCanBePlacedByRealMap(mineConfig, col, row)) {
                    let position = new MaraPoint(col, row);
                    
                    let positionResources = this.GetRectResources(
                        position,
                        new MaraPoint(
                            Math.min(col + mineWidth, scenaWidth) - 1, 
                            Math.min(row + mineHeigth, scenaHeigth) - 1
                        )
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

    public ProvideResourcesForUnitComposition(composition: UnitComposition): SubcontrollerRequestResult {
        let compositionCost = this.calculateCompositionCost(composition);
        this.Debug(`Target composition cost: ${compositionCost.ToString()}`);

        let currentResources = this.getTotalResources();
        this.Debug(`Current resources: ${currentResources.ToString()}`);

        let insufficientResources = new MaraResources(
            Math.max(compositionCost.Wood - currentResources.Wood, 0), 
            Math.max(compositionCost.Metal - currentResources.Metal, 0), 
            Math.max(compositionCost.Gold - currentResources.Gold, 0), 
            Math.max(compositionCost.People - currentResources.People, 0)
        );

        let result = new SubcontrollerRequestResult();

        if (
            insufficientResources.Gold > 0 ||
            insufficientResources.Metal > 0 ||
            insufficientResources.Wood > 0 ||
            insufficientResources.People > 0
        ) {
            let targetExpand = this.fillExpandData(insufficientResources);
            let task = new ExpandBuildTask(MaraPriority.Major, this.settlementController, targetExpand, this);

            result.IsSuccess = false;
            result.Task = task;
            
            this.AddTask(task);
        }
        else {
            result.IsSuccess = true;
            result.Task = null;
        }

        return result;
    }

    protected doRoutines(tickNumber: number): void {
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

    protected makeSelfTask(): SettlementSubcontrollerTask | null {
        let expandBuildTask = this.makeExpandBuildTask();

        if (expandBuildTask) {
            return expandBuildTask;
        }

        let produceHarvestersTask = this.makeProduceHarvestersTask();

        if (produceHarvestersTask) {
            return produceHarvestersTask;
        }

        return null;
    }

    private makeExpandBuildTask(): ExpandBuildTask | null {
        let canMineResources = this.canMineResources();

        if (!canMineResources) {
            return null;
        }

        let expandData = this.isExpandNeeded();
        
        if (expandData.NeedExpand) {
            this.Debug(`Low on one or more resource, required resources: ${expandData.ResourcesToMine.ToString()}`);
            this.Debug(`Proceeding to expand...`);
            let targetExpand = this.fillExpandData(expandData.ResourcesToMine);
            
            return new ExpandBuildTask(MaraPriority.Normal, this.settlementController, targetExpand, this);
        }
        else {
            return null;
        }
    }

    private makeProduceHarvestersTask(): ProduceHarvestersTask | null {
        let currentComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();
        let currentHarvesterCount = 0;

        currentComposition.forEach((value, key) => {
            if (MaraUtils.IsHarvesterConfigId(key)) {
                currentHarvesterCount += value;
            }
        });

        let optimalHarvesterCount = this.GetOptimalHarvesterCount();
        let requiredHarvesterCount = optimalHarvesterCount - currentHarvesterCount;

        if (requiredHarvesterCount > 0) {
            let harvesterCfgIds = MaraUtils.GetAllHarvesterConfigIds(this.settlementController.Settlement);
            harvesterCfgIds = harvesterCfgIds.filter((cfgId) => this.settlementController.ProductionController.IsCfgIdProduceable(cfgId));

            if (harvesterCfgIds.length == 0) {
                return null;
            }

            this.Debug(`Required ${requiredHarvesterCount} harvesters, proceeding to produce`);
            
            let harvesterCfgId = MaraUtils.RandomSelect(this.settlementController.MasterMind, harvesterCfgIds)!;
            let task = new ProduceHarvestersTask(MaraPriority.Low, requiredHarvesterCount, harvesterCfgId, this.settlementController, this);

            return task;
        }
        else {
            return null;
        }
    }

    private getTotalResources(): MaraResources {
        this.checkForUnaccountedBuildings();
        
        let settlement = this.settlementController.Settlement;
        
        let totalResources = this.GetStashedResourses();

        let freeHousing = Math.max(settlement.Census.MaxPeople - settlement.Census.BusyAndReservedPeople, 0);
        totalResources.People += freeHousing;

        for (let mineData of this.mines) {
            let mineResources = this.getMineResources(mineData.Mine!);

            totalResources.Gold += mineResources.Gold;
            totalResources.Metal += mineResources.Metal;
        }

        for (let sawmillData of this.Sawmills) {
            if (sawmillData.Sawmill) {
                let clusters = MaraMap.GetResourceClustersAroundPoint(
                    sawmillData.Sawmill.UnitRect.Center,
                    this.settlementController.Settings.ResourceMining.WoodcuttingRadius
                );

                clusters.forEach((c) => totalResources.Wood += c.WoodAmount);
            }
        }

        let model = MaraUtils.GetPropertyValue(settlement.Census, "Model");
        let taxFactor = model.TaxFactor;

        totalResources.Gold += taxFactor.Gold * totalResources.People;
        totalResources.Wood += taxFactor.Lumber * totalResources.People;
        totalResources.Metal += taxFactor.Metal * totalResources.People;

        return totalResources;
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

    private canMineResources(): boolean {
        let economy = this.settlementController.GetCurrentDevelopedEconomyComposition();

        let atLeastOneHarvesterPresent = false;
        let atLeastOneMetalStockPresent = false;

        economy.forEach((value, key) => {
            if (MaraUtils.IsHarvesterConfigId(key)) {
                atLeastOneHarvesterPresent = true;
            }
            else if (MaraUtils.IsMetalStockConfigId(key)) {
                atLeastOneMetalStockPresent = true;
            }
        });

        if (!atLeastOneHarvesterPresent) {
            if (!this.checkConfigIdsLimits(MaraUtils.GetAllHarvesterConfigIds)) {
                return false;
            }
        }

        if (!atLeastOneMetalStockPresent) {
            if (!this.checkConfigIdsLimits(MaraUtils.GetAllMetalStockConfigIds)) {
                return false;
            }
        }

        if (!this.checkConfigIdsLimits(MaraUtils.GetAllSawmillConfigIds)) {
            return false;
        }

        if (!this.checkConfigIdsLimits(MaraUtils.GetAllMineConfigIds)) {
            return false;
        }

        if (!this.checkConfigIdsLimits(MaraUtils.GetAllHousingConfigIds)) {
            return false;
        }

        return true;
    }
    
    private isExpandNeeded(): NeedExpandResult {
        let leftResources = new Set<MaraResourceType>();
        
        for (let cluster of MaraMap.ResourceClusters) {
            if (cluster.GoldAmount > 0) {
                leftResources.add(MaraResourceType.Gold);
            }

            if (cluster.MetalAmount > 0) {
                leftResources.add(MaraResourceType.Metal);
            }

            if (cluster.WoodAmount > 0) {
                leftResources.add(MaraResourceType.Wood);
            }

            if (leftResources.size == 3) {
                break;
            }
        }
                
        let resources = this.getTotalResources();
        this.Debug(`Total resources: ${resources.ToString()}`);

        let result = new NeedExpandResult();
        result.NeedExpand = false;
        result.ResourcesToMine = new MaraResources(0, 0, 0, 0);
        result.MinResourceAmount = Infinity;
        result.MinResourceThreshold = 0;

        let minResourceToThresholdRatio = Infinity;

        //TODO: rewrite code below to get rid of certain resource names
        //TODO: also go to expand if currently not mining some resource
        
        if (resources.People < this.PEOPLE_THRESHOLD) {
            this.Debug(`Low people`);
            result.NeedExpand = true;
            result.ResourcesToMine.People = this.PEOPLE_THRESHOLD - resources.People;

            let ratio = resources.People / this.PEOPLE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                result.MinResourceAmount = resources.People;
                result.MinResourceThreshold = this.PEOPLE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }
        
        if (resources.Gold < this.RESOURCE_THRESHOLD && leftResources.has(MaraResourceType.Gold)) {
            this.Debug(`Low gold`);
            result.NeedExpand = true;
            result.ResourcesToMine.Gold = this.RESOURCE_THRESHOLD - resources.Gold;

            let ratio = resources.Gold / this.RESOURCE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                result.MinResourceAmount = resources.Gold;
                result.MinResourceThreshold = this.RESOURCE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }
        
        if (resources.Metal < this.RESOURCE_THRESHOLD && leftResources.has(MaraResourceType.Metal)) {
            this.Debug(`Low metal`);
            result.NeedExpand = true;
            result.ResourcesToMine.Metal = this.RESOURCE_THRESHOLD - resources.Metal;

            let ratio = resources.Metal / this.RESOURCE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                result.MinResourceAmount = resources.Metal;
                result.MinResourceThreshold = this.RESOURCE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }

        if (resources.Wood < this.RESOURCE_THRESHOLD && leftResources.has(MaraResourceType.Wood)) {
            this.Debug(`Low lumber`);
            result.NeedExpand = true;
            result.ResourcesToMine.Wood = this.RESOURCE_THRESHOLD - resources.Wood;

            let ratio = resources.Wood / this.RESOURCE_THRESHOLD;

            if (minResourceToThresholdRatio > ratio) {
                result.MinResourceAmount = resources.Wood;
                result.MinResourceThreshold = this.RESOURCE_THRESHOLD;
                minResourceToThresholdRatio = ratio;
            }
        }

        return result;
    }

    protected fillExpandData(requiredResources: MaraResources): TargetExpandData {
        let optimalCluster = this.selectOptimalResourceCluster(requiredResources);

        if (optimalCluster) {
            this.Debug(`Selected resource cluster ${optimalCluster.Center.ToString()} for expand`);
            let requiredResourceTypes: MaraResourceType[] = [];

            if (requiredResources.Gold > 0 && optimalCluster.GoldAmount > 0) {
                this.Debug(`Gold production is scheduled`);
                requiredResourceTypes.push(MaraResourceType.Gold);
            }

            if (requiredResources.Metal > 0 && optimalCluster.MetalAmount > 0) {
                this.Debug(`Metal production is scheduled`);
                requiredResourceTypes.push(MaraResourceType.Metal);
            }

            if (requiredResources.Wood > 0 && optimalCluster.WoodAmount > 0) {
                this.Debug(`Wood production is scheduled`);
                requiredResourceTypes.push(MaraResourceType.Wood);
            }

            if (requiredResources.People > 0) {
                requiredResourceTypes.push(MaraResourceType.People);
            }
            
            return new TargetExpandData(
                optimalCluster,
                requiredResourceTypes
            );
        }
        else {
            this.Debug(`No resource cluster for mining selected`);
            
            return new TargetExpandData( //when in doubt - build more izbas!!
                null,
                [MaraResourceType.People]
            );
        }
    }

    private selectOptimalResourceCluster(requiredResources: MaraResources): MaraResourceCluster | null {
        let candidates: Array<MaraResourceCluster> = [];
        
        let requiredGold = requiredResources.Gold;
        let requiredMetal = requiredResources.Metal;
        let requiredWood = requiredResources.Wood;

        MaraMap.ResourceClusters.forEach((value) => {
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

        this.Debug(`Candidate resource clusters:`);
        for (let cluster of candidates) {
            this.Debug(`(${cluster.Center.ToString()})`);
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

                let clusterSelection = this.settlementController.StrategyController.SelectOptimalResourceCluster(closestCandidates);

                return clusterSelection.OptimalReachable; //TODO: temporarily disable unreachable expands, remove this

                if (clusterSelection.Optimal) {
                    if (clusterSelection.IsOptimalClusterReachable) {
                        return clusterSelection.Optimal;
                    }
                    else {
                        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
                        let bridgeCfgId = produceableCfgIds.find((cfgId) => MaraUtils.IsWalkableConfigId(cfgId));

                        if (bridgeCfgId) {
                            return clusterSelection.Optimal;
                        }
                        else {
                            return clusterSelection.OptimalReachable;
                        }
                    }
                }
                else {
                    return clusterSelection.OptimalReachable;
                }
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }

    private canPlaceMine(cluster: MaraResourceCluster, resourceType: MaraResourceType): boolean {
        let mineConfigs = MaraUtils.GetAllMineConfigIds(this.settlementController.Settlement);
        let cfgId = MaraUtils.RandomSelect<string>(this.settlementController.MasterMind, mineConfigs);

        if (cfgId == null) {
            return false;
        }

        let position = this.settlementController.MiningController.FindMinePosition(
            cluster, 
            cfgId,
            resourceType
        );

        return position != null;
    }

    private getUnoccupiedMinerals(cells: Array<MaraPoint>): number {
        let freeMinerals = 0;

        for (let cell of cells) {
            let unit = MaraUtils.GetUnit(cell);

            if (unit?.UnitOwner == this.settlementController.Settlement) {
                continue;
            }
            else {
                freeMinerals += MaraMap.GetCellMineralsAmount(cell.X, cell.Y);
            }
        }

        return freeMinerals;
    }

    private isFreeWoodcuttingCluster(cluster: MaraResourceCluster): boolean {
        for (let sawmillData of this.settlementController.MiningController.Sawmills) {
            if (
                MaraUtils.ChebyshevDistance(cluster.Center, sawmillData.Sawmill!.UnitRect.Center) < 
                    this.settlementController.Settings.ResourceMining.WoodcuttingRadius
            ) {
                return false;
            }
        }
        
        return true;
    }

    private checkConfigIdsLimits(configIdsGetter: (any) => Array<string>): boolean {
        let availableCfgIds = configIdsGetter(this.settlementController.Settlement);

        if (availableCfgIds.length == 0) {
            return false;
        }

        let economy = this.settlementController.GetCurrentDevelopedEconomyComposition();
        let allowedItems = MaraUtils.MakeAllowedCfgItems(availableCfgIds, economy, this.settlementController.Settlement);

        for (let item of allowedItems) {
            if (item.MaxCount > 0) {
                return true;
            }
        }
        
        return false;
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
            unit.UnitIsAlive && !this.settlementController.ReservedUnitsData.IsUnitReserved(unit)
        );
    }

    private isValidHarvestingBuilding(building: MaraUnitCacheItem): boolean {
        return (
            building.UnitIsAlive && 
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