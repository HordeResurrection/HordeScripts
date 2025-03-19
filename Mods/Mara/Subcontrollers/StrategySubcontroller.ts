
import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraPoint } from "../Common/MaraPoint";
import { MaraUtils, AlmostDefeatCondition } from "Mara/MaraUtils";
import { MaraSquad } from "./Squads/MaraSquad";
import { SettlementGlobalStrategy } from "../Common/Settlement/SettlementControllerGlobalStrategy";
import { UnitComposition } from "../Common/UnitComposition";
import { MaraResourceCluster } from "../Common/MapAnalysis/MaraResourceCluster";
import { AllowedCompositionItem } from "../Common/AllowedCompositionItem";
import { MaraRect } from "../Common/MaraRect";
import { MaraMap } from "../Common/MapAnalysis/MaraMap";
import { NonUniformRandomSelectItem } from "../Common/NonUniformRandomSelectItem";
import { MaraPath } from "../Common/MapAnalysis/MaraPath";
import { MaraUnitCache } from "../Common/Cache/MaraUnitCache";
import { MaraUnitCacheItem } from "../Common/Cache/MaraUnitCacheItem";
import { MaraResourceClusterSelection } from "../Common/MaraResourceClusterSelection";
import { MaraTaskableSubcontroller } from "./MaraTaskableSubcontroller";
import { SettlementSubcontrollerTask } from "../SettlementSubcontrollerTasks/SettlementSubcontrollerTask";
import { AttackTask } from "../SettlementSubcontrollerTasks/StrategySubcontroller/AttackTask/AttackTask";

class PathSelectItem implements NonUniformRandomSelectItem {
    Weight: number;
    Path: MaraPath;
}

export class StrategySubcontroller extends MaraTaskableSubcontroller {
    EnemySettlements: Array<any> = []; //but actually Settlement

    private globalStrategy: SettlementGlobalStrategy = new SettlementGlobalStrategy();
    
    constructor (parent: MaraSettlementController) {
        super(parent);
        this.updateEnemiesList();
        this.globalStrategy.Init(this.settlementController);
    }

    public get GlobalStrategy(): SettlementGlobalStrategy {
        return this.globalStrategy;
    }

    public get Player(): any {
        return this.settlementController.Player;
    }

    GetSettlementAttackArmyComposition(settlement: any): UnitComposition {
        let ratio = MaraUtils.RandomSelect<number>(
            this.settlementController.MasterMind,
            this.settlementController.Settings.Combat.OffensiveToDefensiveRatios
        ) ?? 1;

        this.settlementController.AttackToDefenseUnitRatio = ratio;
        this.settlementController.Debug(`Calculated attack to defense ratio: ${ratio}`);
        
        let requiredStrength = this.settlementController.Settings.Combat.AttackStrengthToEnemyStrengthRatio * 
            Math.max(
                this.calcSettlementStrength(settlement), 
                this.settlementController.Settings.ControllerStates.MinAttackStrength
            );

        let requiredOffensiveStrength = ratio * requiredStrength;
        this.settlementController.Debug(`Calculated required offensive strength: ${requiredOffensiveStrength}`);

        let currentOffensiveStrength = this.getCurrentTotalStrength() - this.GetCurrentDefensiveStrength();
        this.settlementController.Debug(`Current offensive strength: ${currentOffensiveStrength}`);

        let ofensiveStrengthToProduce = requiredOffensiveStrength - currentOffensiveStrength;
        ofensiveStrengthToProduce = Math.max(ofensiveStrengthToProduce, 0);
        this.settlementController.Debug(`Offensive strength to produce: ${ofensiveStrengthToProduce}`);

        let unitList = this.getOffensiveUnitComposition(ofensiveStrengthToProduce);

        this.settlementController.Debug(`Offensive unit composition:`);
        MaraUtils.PrintMap(unitList);

        let requiredDefensiveStrength = (1 - ratio) * requiredStrength;
        let currentDefensiveStrength = this.GetCurrentDefensiveStrength();
        let defensiveStrengthToProduce = Math.max(requiredDefensiveStrength - currentDefensiveStrength, 0);
        this.settlementController.Debug(`Calculated required defensive strength: ${defensiveStrengthToProduce}`);
        
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();

        let defensiveCfgIds = produceableCfgIds.filter(
            (value) => {
                return (
                    this.globalStrategy.OffensiveCfgIds.findIndex((item) => {return item.CfgId == value}) >= 0 || 
                    this.globalStrategy.DefensiveBuildingsCfgIds.findIndex((item) => {return item.CfgId == value}) >= 0
                );
            }
        );
        this.settlementController.Debug(`Defensive Cfg IDs: ${defensiveCfgIds}`);

        let allowedDefensiveCfgItems = MaraUtils.MakeAllowedCfgItems(defensiveCfgIds, unitList, this.settlementController.Settlement);
        let defensiveUnitList = this.makeCombatUnitComposition(allowedDefensiveCfgItems, defensiveStrengthToProduce);
        this.settlementController.Debug(`Defensive unit composition:`);
        MaraUtils.PrintMap(defensiveUnitList);

        defensiveUnitList.forEach((value, key, map) => MaraUtils.AddToMapItem(unitList, key, value));
        
        return unitList;
    }

    GetExpandAttackArmyComposition(expandLocation: MaraPoint): UnitComposition {
        let requiredStrength = 0;
        
        let enemyUnits = MaraUtils.GetSettlementUnitsAroundPoint(
            expandLocation, 
            this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius, 
            this.EnemySettlements
        );

        if (enemyUnits.length > 0) {
            for (let unit of enemyUnits) {
                requiredStrength += MaraUtils.GetUnitStrength(unit);
            }

            requiredStrength = Math.max(this.settlementController.Settings.ControllerStates.MinAttackStrength, requiredStrength);
        }
        
        if (requiredStrength > 0) {
            requiredStrength *= this.settlementController.Settings.Combat.AttackStrengthToEnemyStrengthRatio;
            this.settlementController.Debug(`Required Strength to secure expand: ${requiredStrength}`);

            let composition = this.getOffensiveUnitComposition(requiredStrength);

            this.settlementController.Debug(`Offensive unit composition to secure expand:`);
            MaraUtils.PrintMap(composition);

            return composition;
        }
        else {
            this.settlementController.Debug(`Expand is not secured by enemy, no attack needed`);
            return new Map<string, number>();
        }
    }

    GetExpandGuardArmyComposition(expandLocation: MaraPoint): UnitComposition {
        let expandGuardUnits = MaraUtils.GetSettlementUnitsAroundPoint(
            expandLocation, 
            this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius,
            [this.settlementController.Settlement],
            (unit) => {return MaraUtils.IsCombatConfigId(unit.UnitCfgId) && MaraUtils.IsBuildingConfigId(unit.UnitCfgId)}
        );

        let currentStrength = 0;

        for (let unit of expandGuardUnits) {
            currentStrength += MaraUtils.GetUnitStrength(unit);
        }
        
        let requiredStrength = Math.max(this.settlementController.Settings.Combat.ExpandDefenseStrength - currentStrength, 0);

        if (requiredStrength > 0) {
            this.settlementController.Debug(`Required Strength to guard expand: ${requiredStrength}`);
            let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
            let composition = this.getGuardingUnitComposition(produceableCfgIds, requiredStrength);

            this.settlementController.Debug(`Unit composition to guard expand:`);
            MaraUtils.PrintMap(composition);
            
            return composition;
        }
        else {
            return new Map<string, number>();
        }
    }

    GetReinforcementCfgIds(): Array<string> {
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
        let combatUnitCfgIds = new Array<string>();
        
        let allowedCfgIds = new Set<string>(
            [
                ...this.globalStrategy.OffensiveCfgIds.map((value) => value.CfgId),
                ...this.globalStrategy.DefensiveBuildingsCfgIds.map((value) => value.CfgId)
            ]
        );
        
        
        for (let cfgId of produceableCfgIds) {
            if (
                MaraUtils.IsCombatConfigId(cfgId) &&
                !MaraUtils.IsBuildingConfigId(cfgId) &&
                allowedCfgIds.has(cfgId)
            ) {
                combatUnitCfgIds.push(cfgId);
            }
        }

        if (combatUnitCfgIds.length == 0) {
            combatUnitCfgIds.push(this.globalStrategy.LowestTechOffensiveCfgId);
        }
        
        return combatUnitCfgIds;
    }

    GetRequiredProductionChainCfgIds(): Set<string> {
        let result = new Set<string>();

        for (let item of this.globalStrategy.OffensiveCfgIds) {
            for (let cfgId of item.ProductionChain) {
                result.add(cfgId);
            }
        }

        for (let item of this.globalStrategy.DefensiveBuildingsCfgIds) {
            for (let cfgId of item.ProductionChain) {
                result.add(cfgId);
            }
        }

        return result;
    }

    SelectEnemy(): any { //but actually Settlement
        let undefeatedEnemies: any[] = this.EnemySettlements.filter((value) => {return !MaraUtils.IsSettlementDefeated(value)});
        let enemy: any = null;
        
        if (undefeatedEnemies.length > 0) {
            let index = MaraUtils.Random(this.settlementController.MasterMind, undefeatedEnemies.length - 1);
            enemy = undefeatedEnemies[index];
        }

        return enemy;
    }

    GetOffensiveTarget(
        enemySettlement: any //but actually Settlement
    ): MaraUnitCacheItem | undefined {
        if (MaraUtils.IsSettlementDefeated(enemySettlement)) {
            return undefined;
        }

        let defeatCondition = enemySettlement.RulesOverseer.GetExistenceRule().AlmostDefeatCondition;
        let allUnits = MaraUtils.GetAllSettlementUnits(enemySettlement);
        let candidates: Array<MaraUnitCacheItem> = [];

        if (defeatCondition == AlmostDefeatCondition.LossProducingBuildings) {
            candidates = allUnits.filter(
                (unit) => {
                    return (
                        MaraUtils.IsProducerConfigId(unit.UnitCfgId) && 
                        MaraUtils.IsBuildingConfigId(unit.UnitCfgId) ||
                        MaraUtils.IsMineConfigId(unit.UnitCfgId)
                    );
                }
            );
        }
        else if (defeatCondition == AlmostDefeatCondition.LossProducingUnits) {
            candidates = allUnits.filter(
                (unit) => {
                    return (
                        MaraUtils.IsProducerConfigId(unit.UnitCfgId) ||
                        MaraUtils.IsMineConfigId(unit.UnitCfgId)
                    );
                }
            );
        }
        else { //loss of all units or custom conditions
            candidates = allUnits.filter(
                (unit) => {
                    return (
                        MaraUtils.IsProducerConfigId(unit.UnitCfgId) && 
                        MaraUtils.IsBuildingConfigId(unit.UnitCfgId) ||
                        MaraUtils.IsMineConfigId(unit.UnitCfgId)
                    );
                }
            );

            if (candidates.length == 0) {
                candidates = allUnits.filter(
                    (unit) => {
                        return (
                            MaraUtils.IsProducerConfigId(unit.UnitCfgId) ||
                            MaraUtils.IsMineConfigId(unit.UnitCfgId)
                        );
                    }
                );

                if (candidates.length == 0) {
                    candidates = allUnits.filter(
                        (unit) => {return MaraUtils.IsActiveConfigId(unit.UnitCfgId)}
                    );
                }
            }
        }

        let clusters = MaraUtils.GetSettlementsSquadsFromUnits(
            candidates, 
            [enemySettlement], 
            (unit) => true,
            this.settlementController.Settings.UnitSearch.BuildingSearchRadius
        );

        let mostVulnerableCluster: MaraSquad | null = null;
        let minDefenceStrength = Infinity;

        for (let cluster of clusters) {
            let location = cluster.GetLocation();
            
            let enemies = this.GetEnemiesAroundPoint(
                location.SpreadCenter, 
                location.Spread + this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
            );

            let strength = 0;

            for (let enemy of enemies) {
                strength += MaraUtils.GetUnitStrength(enemy);
            }

            if (strength < minDefenceStrength) {
                minDefenceStrength = strength;
                mostVulnerableCluster = cluster;
            }
        }

        return mostVulnerableCluster?.Units[0];
    }

    GetExpandOffenseTarget(expandLocation: MaraPoint): MaraUnitCacheItem | null {
        let enemyUnits = MaraUtils.GetSettlementUnitsAroundPoint(
            expandLocation, 
            this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius, 
            this.EnemySettlements
        );

        if (enemyUnits.length > 0) {
            return enemyUnits[0];
        }
        else {
            return null;
        }
    }

    GetPath(from: MaraPoint, to: MaraPoint): Array<MaraPoint> {
        let possiblePaths = MaraMap.GetPaths(from, to);
        
        if (possiblePaths.length == 0) {
            return [to];
        }
        else {
            for (let path of possiblePaths) {
                this.settlementController.Debug(`path candidate: ${path.ToString()}, length: ${path.Length}`);
            }
            
            let longestPath = MaraUtils.FindExtremum(possiblePaths, (a, b) => a.Length - b.Length);
            let longestPathLen = longestPath!.Length + 1;

            let candidates: Array<PathSelectItem> = [];

            for (let path of possiblePaths) {
                let pathSelectItem = new PathSelectItem();
                pathSelectItem.Path = path;
                pathSelectItem.Weight = longestPathLen - path.Length;

                candidates.push(pathSelectItem);
            }

            let selectedCandidate = MaraUtils.NonUniformRandomSelect(this.settlementController.MasterMind, candidates);
            let nodes = selectedCandidate!.Path.Nodes;
            let cellsPath = nodes.map((n) => n.Region.Center);

            return [from, ...cellsPath, to];
        }
    }

    OrderAttackersByDangerLevel(): Array<MaraSquad> {
        let settlementLocation = this.settlementController.GetSettlementLocation();
        let settlementCenter = settlementLocation?.Center;

        if (settlementCenter) {
            let threatData: any[] = [];

            for (let squad of this.settlementController.HostileAttackingSquads) {
                let distanceToCenter = MaraUtils.ChebyshevDistance(settlementCenter, squad.GetLocation().Point);
                threatData.push({squad: squad, distance: distanceToCenter});
            }
            
            threatData = threatData.sort(
                (a, b) => {return a.distance - b.distance;}
            );

            return threatData.map(v => v.squad);
        }
        else {
            return this.settlementController.HostileAttackingSquads;
        }
    }

    IsUnderAttack(): boolean {
        let settlementLocation = this.settlementController.GetSettlementLocation();

        if (!settlementLocation) {
            return false;
        }

        if (!this.isSafeLocation(settlementLocation.BoundingRect))  {
            return true;
        }

        for (let expandPoint of this.settlementController.Expands) {
            if (
                !this.isSafeLocation(
                    MaraRect.CreateFromPoint(
                        expandPoint, 
                        this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
                    )
                )
            ) {
                return true;
            }
        }

        if (this.settlementController.TargetExpand?.BuildCenter) {
            if (
                !this.isSafeLocation(
                    MaraRect.CreateFromPoint(
                        this.settlementController.TargetExpand.BuildCenter, 
                        this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
                    )
                )
            ) {
                return true;
            }
        }

        return false;
    }

    IsSafeExpand(point: any): boolean {
        return this.isSafeLocation(
            MaraRect.CreateFromPoint(
                point, 
                this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
            )
        );
    }

    GetEnemiesInArea(rect: MaraRect): Array<MaraUnitCacheItem> {
        return MaraUtils.GetSettlementUnitsInArea(rect, this.EnemySettlements);
    }

    GetEnemiesAroundPoint(point: MaraPoint, radius: number): Array<MaraUnitCacheItem> {
        return MaraUtils.GetSettlementUnitsAroundPoint(point, radius, this.EnemySettlements);
    }

    GetCurrentDefensiveStrength(): number {
        let units = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        let defensiveStrength = 0;
        
        for (let unit of units) {
            if (MaraUtils.IsCombatConfigId(unit.UnitCfgId) && unit.UnitIsAlive) {
                if (MaraUtils.IsBuildingConfigId(unit.UnitCfgId)) {
                    defensiveStrength += MaraUtils.GetUnitStrength(unit);
                }
            }
        }

        return defensiveStrength;
    }

    SelectOptimalResourceCluster(candidates: Array<MaraResourceCluster>): MaraResourceClusterSelection {
        let settlementLocation = this.settlementController.GetSettlementLocation();
        let settlementCenter: MaraPoint | null = null;

        if (settlementLocation) {
            let freeCell = MaraUtils.FindFreeCell(settlementLocation.Center);

            if (freeCell) {
                settlementCenter = new MaraPoint(freeCell.X, freeCell.Y);
            }
        }
        else {
            return new MaraResourceClusterSelection(null, true, null); //what's the point?..
        }

        let produceableOffensiveCfgIds = this.getOffensiveCfgIds();
        let canAttack = produceableOffensiveCfgIds.length > 0;

        let acceptableClusters: Array<any> = [];
        let reachableClusters: Array<any> = [];

        for (let cluster of candidates) {
            let distance = MaraUtils.ChebyshevDistance(cluster.Center, settlementLocation.Center);

            let units = MaraUtils.GetUnitsAroundPoint(
                cluster.Center,
                cluster.Size, //radius = cluster radius * 2
                (unit) => {
                    return unit.UnitOwner != this.settlementController.Settlement
                }
            );

            let totalEnemyStrength = 0;

            for (let unit of units) {
                if (this.EnemySettlements.find((value) => {return value == unit.UnitOwner})) {
                    totalEnemyStrength += MaraUtils.GetUnitStrength(unit);
                }
                else {
                    continue;
                }
            }

            if (totalEnemyStrength == 0 || canAttack) {
                distance += totalEnemyStrength / 10;

                let path = MaraMap.GetShortestPath(settlementCenter!, cluster.Center);

                if (path) {
                    reachableClusters.push({Cluster: cluster, Distance: distance});
                }

                acceptableClusters.push({Cluster: cluster, Distance: distance});
            }
        }

        let optimalCluster = this.selectOptimalCluster(acceptableClusters);
        let isReachable = reachableClusters.find((c) => c == optimalCluster);

        let reachableCluster = this.selectOptimalCluster(reachableClusters);

        return new MaraResourceClusterSelection(optimalCluster, isReachable, reachableCluster);
    }

    protected doRoutines(tickNumber: number): void {
        if (tickNumber % 50 == 0) {
            this.updateEnemiesList();
        }
    }

    protected makeSelfTask(): SettlementSubcontrollerTask | null {
        let enemy = this.SelectEnemy();

        if (enemy) {
            return new AttackTask(
                1,
                enemy,
                this.settlementController,
                this.settlementController
            );
        }
        else {
            return null;
        }
    }

    private selectOptimalCluster(clusterData: any): MaraResourceCluster | null {
        let minDistance = Infinity;
        
        for (let item of clusterData) {
            if (minDistance > item.Distance) {
                minDistance = item.Distance;
            }
        }

        minDistance = Math.max(
            minDistance,
            this.settlementController.Settings.ResourceMining.MinResourceClusterDistanceSpread
        );
        
        let finalClusters: Array<MaraResourceCluster> = [];

        for (let item of clusterData) {
            if (item.Distance / minDistance <= 1.1) {
                finalClusters.push(item.Cluster);
            }
        }
        
        let result: MaraResourceCluster | null = MaraUtils.RandomSelect(this.settlementController.MasterMind, finalClusters);

        return result;
    }

    private isSafeLocation(rect: MaraRect): boolean {
        let enemies = MaraUtils.GetSettlementUnitsInArea(
            rect,
            this.EnemySettlements
        );

        return enemies.length == 0;
    }

    private getOffensiveUnitComposition(requiredStrength: number): UnitComposition {
        let offensiveCfgIds = this.getOffensiveCfgIds();
        this.settlementController.Debug(`Offensive Cfg IDs: ${offensiveCfgIds}`);
        let allowedOffensiveCfgItems = MaraUtils.MakeAllowedCfgItems(offensiveCfgIds, new Map<string, number>(), this.settlementController.Settlement);

        return this.makeCombatUnitComposition(allowedOffensiveCfgItems, requiredStrength);
    }

    private getOffensiveCfgIds(): Array<string> {
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
        
        let offensiveCfgIds = produceableCfgIds.filter(
            (value) => {
                return this.globalStrategy.OffensiveCfgIds.findIndex((item) => {return item.CfgId == value}) >= 0
            }
        );

        return offensiveCfgIds;
    }

    private getGuardingUnitComposition(produceableCfgIds: string[], requiredStrength: number): UnitComposition {
        let cfgIds = produceableCfgIds.filter(
            (value) => {
                return this.globalStrategy.DefensiveBuildingsCfgIds.findIndex((item) => {return item.CfgId == value}) >= 0
            }
        );
        this.settlementController.Debug(`Guarding Cfg IDs: ${cfgIds}`);
        let allowedOffensiveCfgItems = MaraUtils.MakeAllowedCfgItems(cfgIds, new Map<string, number>(), this.settlementController.Settlement);

        return this.makeCombatUnitComposition(allowedOffensiveCfgItems, requiredStrength);
    }

    private updateEnemiesList(): void {
        let diplomacy = this.settlementController.Settlement.Diplomacy;
        let settlements = MaraUnitCache.AllSettlements;
        this.EnemySettlements = settlements.filter(
            (value) => {
                return diplomacy.IsWarStatus(value) && MaraUnitCache.GetAllSettlementUnits(value).length > 0
            }
        );
    }

    private calcSettlementStrength(settlement: any): number {
        let units = MaraUtils.GetAllSettlementUnits(settlement);
        let settlementStrength = 0;
        
        for (let unit of units) {
            settlementStrength += MaraUtils.GetUnitStrength(unit);
        }

        return settlementStrength;
    }

    private getCurrentTotalStrength(): number {
        let allUnits = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        let totalStrength = 0;
        
        for (let unit of allUnits) {
            if (MaraUtils.IsCombatConfigId(unit.UnitCfgId) && unit.UnitIsAlive) {
                totalStrength += MaraUtils.GetUnitStrength(unit);
            }
        }

        return totalStrength;
    }

    private makeCombatUnitComposition(allowedConfigs: Array<AllowedCompositionItem>, requiredStrength: number): UnitComposition {
        let unitComposition: UnitComposition = new Map<string, number>();

        if (allowedConfigs.length == 0) {
            this.settlementController.Debug(`Unable to compose required strength: no allowed configs provided`);
            return unitComposition;
        }
        
        let maxStrength = 0;

        for (let item of allowedConfigs) {
            let strength = MaraUtils.GetConfigIdStrength(item.UnitConfigId);

            if (strength > maxStrength) {
                maxStrength = strength;
            }
        }

        let strengthToProduce = Math.min(
            requiredStrength, 
            maxStrength * this.settlementController.Settings.Combat.MaxCompositionUnitCount
        );

        let currentStrength = 0;
        let totalUnitCount = 0;

        while (
            currentStrength < strengthToProduce &&
            totalUnitCount < this.settlementController.Settings.Combat.MaxCompositionUnitCount
        ) {
            if (allowedConfigs.length == 0) {
                this.settlementController.Debug(`Unable to compose required strength: unit limits reached`);
                break;
            }
            
            let configItem = MaraUtils.RandomSelect(this.settlementController.MasterMind, allowedConfigs);

            if (configItem!.MaxCount > 0) {
                let leftStrength = strengthToProduce - currentStrength;
                let unitStrength = MaraUtils.GetConfigIdStrength(configItem!.UnitConfigId);
                let maxUnitCount = Math.min(Math.round(leftStrength / unitStrength), configItem!.MaxCount);

                let unitCount = Math.max(Math.round(maxUnitCount / 2), 1);
                
                MaraUtils.AddToMapItem(unitComposition, configItem!.UnitConfigId, unitCount);
                configItem!.MaxCount -= unitCount;
                currentStrength += unitCount * unitStrength;
                totalUnitCount += unitCount;

                allowedConfigs = allowedConfigs.filter((value) => {return value.MaxCount > 0});
            }
        }

        return unitComposition;
    }
}