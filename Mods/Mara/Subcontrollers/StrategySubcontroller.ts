
import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraPoint } from "../Common/MaraPoint";
import { MaraUtils, AlmostDefeatCondition } from "Mara/MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraSquad } from "./Squads/MaraSquad";
import { enumerate, eNext } from "library/dotnet/dotnet-utils";
import { Mara } from "../Mara";
import { SettlementGlobalStrategy } from "../Common/Settlement/SettlementControllerGlobalStrategy";
import { UnitFlags } from "library/game-logic/horde-types";
import { UnitComposition } from "../Common/UnitComposition";
import { MaraResourceCluster } from "../Common/Resources/MaraResourceCluster";
import { AllowedCompositionItem } from "../Common/AllowedCompositionItem";

export class StrategySubcontroller extends MaraSubcontroller {
    EnemySettlements: Array<any> = []; //but actually Settlement

    private currentEnemy: any; //but actually Settlement
    private globalStrategy: SettlementGlobalStrategy = new SettlementGlobalStrategy();
    
    constructor (parent: MaraSettlementController) {
        super(parent);
        this.buildEnemyList();
        this.globalStrategy.Init(this.settlementController);
    }

    public get GlobalStrategy(): SettlementGlobalStrategy {
        return this.globalStrategy;
    }

    public get Player(): any {
        return this.settlementController.Player;
    }

    public get CurrentEnemy(): any {
        return this.currentEnemy;
    }
    
    Tick(tickNumber: number): void {
        if (tickNumber % 10 != 0) {
            return;
        }

        if (!this.currentEnemy) {
            return;
        }

        if (MaraUtils.IsSettlementDefeated(this.currentEnemy)) {
            this.settlementController.Debug(`Enemy defeated`);
            this.ResetEnemy();
            return;
        }
    }

    GetSettlementAttackArmyComposition(): UnitComposition {
        if (!this.currentEnemy) {
            this.SelectEnemy();
        }

        let ratio = MaraUtils.RandomSelect<number>(
            this.settlementController.MasterMind,
            this.settlementController.Settings.CombatSettings.OffensiveToDefensiveRatios
        ) ?? 1;

        this.settlementController.AttackToDefenseUnitRatio = ratio;
        this.settlementController.Debug(`Calculated attack to defense ratio: ${ratio}`);
        
        let requiredStrength = this.settlementController.Settings.CombatSettings.AttackStrengthToEnemyStrengthRatio * 
            Math.max(
                this.calcSettlementStrength(this.currentEnemy), 
                this.settlementController.Settings.ControllerStates.MinAttackStrength
            );

        let requiredOffensiveStrength = ratio * requiredStrength;
        this.settlementController.Debug(`Calculated required offensive strength: ${requiredOffensiveStrength}`);

        let currentOffensiveStrength = this.calcSettlementStrength(this.settlementController.Settlement) - this.GetCurrentDefensiveStrength();
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
                return this.globalStrategy.OffensiveCfgIds.has(value) || this.globalStrategy.DefensiveBuildingsCfgIds.has(value);
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
        
        let enemyUnits = MaraUtils.GetSettlementUnitsInArea(
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
            requiredStrength *= this.settlementController.Settings.CombatSettings.AttackStrengthToEnemyStrengthRatio;
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
        let expandGuardUnits = MaraUtils.GetSettlementUnitsInArea(
            expandLocation, 
            this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius,
            [this.settlementController.Settlement],
            (unit) => {return MaraUtils.IsCombatConfig(unit.Cfg) && MaraUtils.IsBuildingConfig(unit.Cfg)}
        );

        let currentStrength = 0;

        for (let unit of expandGuardUnits) {
            currentStrength += MaraUtils.GetUnitStrength(unit);
        }
        
        let requiredStrength = Math.max(this.settlementController.Settings.CombatSettings.ExpandDefenseStrength - currentStrength, 0);

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
                ...this.globalStrategy.OffensiveCfgIds,
                ...this.globalStrategy.DefensiveBuildingsCfgIds,
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
        return this.globalStrategy.ProductionChainCfgIds;
    }

    SelectEnemy(): any { //but actually Settlement
        this.currentEnemy = null;

        let undefeatedEnemies: any[] = this.EnemySettlements.filter((value) => {return !MaraUtils.IsSettlementDefeated(value)});
        
        if (undefeatedEnemies.length > 0) {
            let index = MaraUtils.Random(this.settlementController.MasterMind, undefeatedEnemies.length - 1);
            this.currentEnemy = undefeatedEnemies[index];
        }

        return this.currentEnemy;
    }

    ResetEnemy(): void {
        this.currentEnemy = null;
    }

    GetOffensiveTarget(
        enemySettlement: any //but actually Settlement
    ): any { //but actually Unit
        if (MaraUtils.IsSettlementDefeated(enemySettlement)) {
            return null;
        }

        let defeatCondition = enemySettlement.RulesOverseer.GetExistenceRule().AlmostDefeatCondition;
        let allUnits = MaraUtils.GetAllSettlementUnits(enemySettlement);
        let candidates: Array<any> = [];

        if (defeatCondition == AlmostDefeatCondition.LossProducingBuildings) {
            candidates = allUnits.filter(
                (unit) => {
                    return (
                        MaraUtils.IsProducerConfig(unit.Cfg) && 
                        MaraUtils.IsBuildingConfig(unit.Cfg) ||
                        MaraUtils.IsMineConfig(unit.Cfg)
                    );
                }
            );
        }
        else if (defeatCondition == AlmostDefeatCondition.LossProducingUnits) {
            candidates = allUnits.filter(
                (unit) => {
                    return (
                        MaraUtils.IsProducerConfig(unit.Cfg) ||
                        MaraUtils.IsMineConfig(unit.Cfg)
                    );
                }
            );
        }
        else { //loss of all units or custom conditions
            candidates = allUnits.filter(
                (unit) => {
                    return (
                        MaraUtils.IsProducerConfig(unit.Cfg) && 
                        MaraUtils.IsBuildingConfig(unit.Cfg) ||
                        MaraUtils.IsMineConfig(unit.Cfg)
                    );
                }
            );

            if (candidates.length == 0) {
                candidates = allUnits.filter(
                    (unit) => {
                        return (
                            MaraUtils.IsProducerConfig(unit.Cfg) ||
                            MaraUtils.IsMineConfig(unit.Cfg)
                        );
                    }
                );

                if (candidates.length == 0) {
                    candidates = allUnits.filter(
                        (unit) => {return unit.Cfg.HasNotFlags(UnitFlags.Passive);}
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
            
            let enemies = this.GetEnemiesInArea(
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

    GetExpandOffenseTarget(expandLocation: MaraPoint): any {
        let enemyUnits = MaraUtils.GetSettlementUnitsInArea(
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

        if (!this.isSafeLocation(settlementLocation.Center, settlementLocation.Radius))  {
            return true;
        }

        for (let expandPoint of this.settlementController.Expands) {
            if (
                !this.isSafeLocation(
                    expandPoint, 
                    this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
                )
            ) {
                return true;
            }
        }

        if (this.settlementController.TargetExpand?.BuildCenter) {
            if (
                !this.isSafeLocation(
                    this.settlementController.TargetExpand.BuildCenter, 
                    this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
                )
            ) {
                return true;
            }
        }

        return false;
    }

    IsSafeExpand(point: any): boolean {
        return this.isSafeLocation(
            point, 
            this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
        );
    }

    GetEnemiesInArea(cell: any, radius: number): Array<any> {
        return MaraUtils.GetSettlementUnitsInArea(cell, radius, this.EnemySettlements);
    }

    GetCurrentDefensiveStrength(): number {
        let units = enumerate(this.settlementController.Settlement.Units);
        let unit;
        let defensiveStrength = 0;
        
        while ((unit = eNext(units)) !== undefined) {
            if (MaraUtils.IsCombatConfig(unit.Cfg) && unit.IsAlive) {
                if (MaraUtils.IsBuildingConfig(unit.Cfg)) {
                    defensiveStrength += MaraUtils.GetUnitStrength(unit);
                }
            }
        }

        return defensiveStrength;
    }

    SelectOptimalResourceCluster(candidates: Array<MaraResourceCluster>): MaraResourceCluster | null {
        let harvesterConfigIds = MaraUtils.GetAllHarvesterConfigIds(this.settlementController.Settlement);
        let harvesterConfigs: Array<any> = [];

        for (let cfgId of harvesterConfigIds) {
            harvesterConfigs.push(MaraUtils.GetUnitConfig(cfgId));
        }

        let settlementLocation = this.settlementController.GetSettlementLocation();
        let settlementCenter: MaraPoint | null = null;

        if (settlementLocation) {
            let freeCell = MaraUtils.FindFreeCell(settlementLocation.Center);

            if (freeCell) {
                settlementCenter = new MaraPoint(freeCell.X, freeCell.Y);
            }
        }
        else {
            return null; //what's the point?..
        }

        let produceableOffensiveCfgIds = this.getOffensiveCfgIds();
        let canAttack = produceableOffensiveCfgIds.length > 0;

        let acceptableClusters:Array<any> = [];

        for (let cluster of candidates) {
            let isClusterReachable = false;
            let clusterCenter = MaraUtils.FindFreeCell(cluster.Center);

            for (let harvesterCfg of harvesterConfigs) {
                if (MaraUtils.IsPathExists(settlementCenter!, clusterCenter, harvesterCfg, Mara.Pathfinder)) {
                    isClusterReachable = true;
                    break;
                }
            }

            if (!isClusterReachable) {
                continue;
            }

            let distance = MaraUtils.ChebyshevDistance(cluster.Center, settlementLocation.Center);

            let units = MaraUtils.GetUnitsInArea(
                cluster.Center,
                cluster.Size, //radius = cluster radius * 2
                (unit) => {
                    return unit.Owner != this.settlementController.Settlement
                }
            );

            let totalEnemyStrength = 0;

            for (let unit of units) {
                if (this.EnemySettlements.find((value) => {return value == unit.Owner})) {
                    totalEnemyStrength += MaraUtils.GetUnitStrength(unit);
                }
                else {
                    continue;
                }
            }

            if (totalEnemyStrength == 0 || canAttack) {
                distance += totalEnemyStrength / 10;
                acceptableClusters.push({Cluster: cluster, Distance: distance});
            }
        }

        let minDistance = Infinity;
        
        for (let item of acceptableClusters) {
            if (minDistance > item.Distance) {
                minDistance = item.Distance;
            }
        }

        minDistance = Math.max(
            minDistance,
            this.settlementController.Settings.ResourceMining.MinResourceClusterDistanceSpread
        );
        
        let finalClusters: Array<MaraResourceCluster> = [];

        for (let item of acceptableClusters) {
            if (item.Distance / minDistance <= 1.1) {
                finalClusters.push(item.Cluster);
            }
        }
        
        let result: MaraResourceCluster | null = MaraUtils.RandomSelect(this.settlementController.MasterMind, finalClusters);

        return result;
    }

    private isSafeLocation(point: any, radius: number): boolean {
        let enemies = MaraUtils.GetSettlementUnitsInArea(
            point, 
            radius, 
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
                return this.globalStrategy.OffensiveCfgIds.has(value)
            }
        );

        return offensiveCfgIds;
    }

    private getGuardingUnitComposition(produceableCfgIds: string[], requiredStrength: number): UnitComposition {
        let cfgIds = produceableCfgIds.filter(
            (value) => {
                return this.globalStrategy.DefensiveBuildingsCfgIds.has(value);
            }
        );
        this.settlementController.Debug(`Guarding Cfg IDs: ${cfgIds}`);
        let allowedOffensiveCfgItems = MaraUtils.MakeAllowedCfgItems(cfgIds, new Map<string, number>(), this.settlementController.Settlement);

        return this.makeCombatUnitComposition(allowedOffensiveCfgItems, requiredStrength);
    }

    private buildEnemyList(): void {
        let diplomacy = this.settlementController.Settlement.Diplomacy;
        let settlements = MaraUtils.GetAllSettlements();
        this.EnemySettlements = settlements.filter((value) => {return diplomacy.IsWarStatus(value)})
    }

    private calcSettlementStrength(settlement: any): number {
        let units = enumerate(settlement.Units);
        let unit;
        let settlementStrength = 0;
        
        while ((unit = eNext(units)) !== undefined) {
            settlementStrength += MaraUtils.GetUnitStrength(unit);
        }

        return settlementStrength;
    }

    private makeCombatUnitComposition(allowedConfigs: Array<AllowedCompositionItem>, requiredStrength: any): UnitComposition {
        let unitComposition: UnitComposition = new Map<string, number>();

        if (allowedConfigs.length == 0) {
            this.settlementController.Debug(`Unable to compose required strength: no allowed configs provided`);
            return unitComposition;
        }
        
        let maxStrength = 0;

        for (let item of allowedConfigs) {
            let strength = MaraUtils.GetConfigStrength(item.UnitConfig);

            if (strength > maxStrength) {
                maxStrength = strength;
            }
        }

        let strengthToProduce = Math.min(
            requiredStrength, 
            maxStrength * this.settlementController.Settings.CombatSettings.MaxCompositionUnitCount
        );

        let currentStrength = 0;
        let totalUnitCount = 0;

        while (
            currentStrength < strengthToProduce &&
            totalUnitCount < this.settlementController.Settings.CombatSettings.MaxCompositionUnitCount
        ) {
            if (allowedConfigs.length == 0) {
                this.settlementController.Debug(`Unable to compose required strength: unit limits reached`);
                break;
            }
            
            let configItem = MaraUtils.RandomSelect(this.settlementController.MasterMind, allowedConfigs);

            if (configItem!.MaxCount > 0) {
                let leftStrength = strengthToProduce - currentStrength;
                let unitStrength = MaraUtils.GetConfigStrength(configItem!.UnitConfig);
                let maxUnitCount = Math.min(Math.round(leftStrength / unitStrength), configItem!.MaxCount);

                let unitCount = Math.max(Math.round(maxUnitCount / 2), 1);
                
                MaraUtils.AddToMapItem(unitComposition, configItem!.UnitConfig.Uid, unitCount);
                configItem!.MaxCount -= unitCount;
                currentStrength += unitCount * unitStrength;
                totalUnitCount += unitCount;

                allowedConfigs = allowedConfigs.filter((value) => {return value.MaxCount > 0});
            }
        }

        return unitComposition;
    }
}