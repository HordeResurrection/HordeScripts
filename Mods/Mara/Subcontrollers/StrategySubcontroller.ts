//TODO: add unit types analysis and listing from game configs

import { MaraSettlementController } from "Mara/MaraSettlementController";
import { MaraPoint, eNext, enumerate } from "Mara/Utils/Common";
import { UnitComposition, MaraUtils, AlmostDefeatCondition, AllowedCompositionItem } from "Mara/Utils/MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraSquad } from "./Squads/MaraSquad";
import { MaraResourceCluster } from "../MaraResourceMap";
import { PathFinder } from "library/game-logic/path-find";

export class StrategySubcontroller extends MaraSubcontroller {
    private currentEnemy: any; //but actually Settlement
    EnemySettlements: Array<any> = []; //but actually Settlement
    
    constructor (parent: MaraSettlementController) {
        super(parent);
        this.buildEnemyList();
    }

    public get Player(): any {
        return this.parentController.Player;
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
            this.parentController.Debug(`Enemy defeated`);
            this.ResetEnemy();
            return;
        }
    }

    GetSettlementAttackArmyComposition(): UnitComposition {
        if (!this.currentEnemy) {
            this.SelectEnemy();
        }

        let ratio = this.selectAttackToDefenseRatio();
        this.parentController.AttackToDefenseUnitRatio = ratio;
        this.parentController.Debug(`Calculated attack to defense ratio: ${ratio}`);
        
        let requiredStrength = this.parentController.Settings.ControllerStates.AttackStrengthToEnemyStrengthRatio * 
            Math.max(
                this.calcSettlementStrength(this.currentEnemy), 
                this.parentController.Settings.ControllerStates.MinAttackStrength
            );

        let requiredOffensiveStrength = ratio * requiredStrength;
        this.parentController.Debug(`Calculated required offensive strength: ${requiredOffensiveStrength}`);

        let currentOffensiveStrength = this.calcSettlementStrength(this.parentController.Settlement) - this.GetCurrentDefensiveStrength();
        this.parentController.Debug(`Current offensive strength: ${currentOffensiveStrength}`);

        let ofensiveStrengthToProduce = requiredOffensiveStrength - currentOffensiveStrength;
        ofensiveStrengthToProduce = Math.max(ofensiveStrengthToProduce, 0);
        this.parentController.Debug(`Offensive strength to produce: ${ofensiveStrengthToProduce}`);

        let produceableCfgIds = this.parentController.ProductionController.GetProduceableCfgIds();
        let unitList = this.getOffensiveUnitComposition(produceableCfgIds, ofensiveStrengthToProduce);

        this.parentController.Debug(`Offensive unit composition:`);
        MaraUtils.PrintMap(unitList);

        let requiredDefensiveStrength = (1 - ratio) * requiredStrength;
        let currentDefensiveStrength = this.GetCurrentDefensiveStrength();
        let defensiveStrengthToProduce = Math.max(requiredDefensiveStrength - currentDefensiveStrength, 0);
        this.parentController.Debug(`Calculated required defensive strength: ${defensiveStrengthToProduce}`);
        
        let defensiveCfgIds = produceableCfgIds.filter(
            (value, index, array) => {
                let config = MaraUtils.GetUnitConfig(value)
                
                return MaraUtils.IsCombatConfig(config);
            }
        );
        this.parentController.Debug(`Defensive Cfg IDs: ${defensiveCfgIds}`);

        let allowedDefensiveCfgItems = MaraUtils.MakeAllowedCfgItems(defensiveCfgIds, unitList, this.parentController.Settlement);
        let defensiveUnitList = this.makeCombatUnitComposition(allowedDefensiveCfgItems, defensiveStrengthToProduce);
        this.parentController.Debug(`Defensive unit composition:`);
        MaraUtils.PrintMap(defensiveUnitList);

        defensiveUnitList.forEach((value, key, map) => MaraUtils.AddToMapItem(unitList, key, value));
        
        return unitList;
    }

    GetExpandAttackArmyComposition(expandLocation: MaraPoint): UnitComposition {
        let requiredStrength = 0;
        
        let enemyUnits = MaraUtils.GetSettlementUnitsInArea(
            expandLocation, 
            this.parentController.Settings.UnitSearch.ExpandEnemySearchRadius, 
            this.EnemySettlements
        );

        if (enemyUnits.length > 0) {
            for (let unit of enemyUnits) {
                requiredStrength += MaraUtils.GetUnitStrength(unit);
            }
        }
        
        if (requiredStrength > 0) {
            requiredStrength *= this.parentController.Settings.ControllerStates.AttackStrengthToEnemyStrengthRatio;

            this.parentController.Debug(`Required Strength to secure expand: ${requiredStrength}`);
        
            let produceableCfgIds = this.parentController.ProductionController.GetProduceableCfgIds();
            let composition = this.getOffensiveUnitComposition(produceableCfgIds, requiredStrength);

            this.parentController.Debug(`Offensive unit composition to secure expand:`);
            MaraUtils.PrintMap(composition);

            return composition;
        }
        else {
            this.parentController.Debug(`Expand is not secured by enemy, no attack needed`);
            return new Map<string, number>();
        }
    }

    GetExpandGuardArmyComposition(expandLocation: MaraPoint): UnitComposition {
        let expandGuardUnits = MaraUtils.GetSettlementUnitsInArea(
            expandLocation, 
            this.parentController.Settings.UnitSearch.ExpandEnemySearchRadius,
            [this.parentController.Settlement],
            (unit) => {return MaraUtils.IsCombatConfig(unit.Cfg) && MaraUtils.IsBuildingConfig(unit.Cfg)}
        );

        let currentStrength = 0;

        for (let unit of expandGuardUnits) {
            currentStrength += MaraUtils.GetUnitStrength(unit);
        }
        
        let requiredStrength = Math.max(this.parentController.Settings.CombatSettings.ExpandDefenseStrength - currentStrength, 0);

        if (requiredStrength > 0) {
            this.parentController.Debug(`Required Strength to guard expand: ${requiredStrength}`);
            let produceableCfgIds = this.parentController.ProductionController.GetProduceableCfgIds();
            let composition = this.getGuardingUnitComposition(produceableCfgIds, requiredStrength);

            this.parentController.Debug(`Unit composition to guard expand:`);
            MaraUtils.PrintMap(composition);
            
            return composition;
        }
        else {
            return new Map<string, number>();
        }
    }

    GetReinforcementCfgIds(): Array<string> {
        let economyComposition = this.parentController.GetCurrentDevelopedEconomyComposition();
        let combatUnitCfgIds = new Array<string>();

        economyComposition.forEach(
            (val, key, map) => {
                let config = MaraUtils.GetUnitConfig(key);
                
                if (
                    MaraUtils.IsCombatConfig(config) &&
                    config.BuildingConfig == null
                ) {
                    combatUnitCfgIds.push(key);
                }
            }
        );

        if (combatUnitCfgIds.length == 0) {
            combatUnitCfgIds.push("#UnitConfig_Slavyane_Swordmen"); //TODO: calculate this dynamically based on current configs
        }
        
        return combatUnitCfgIds;
    }

    SelectEnemy(): any { //but actually Settlement
        this.currentEnemy = null;

        let undefeatedEnemies: any[] = this.EnemySettlements.filter((value) => {return !MaraUtils.IsSettlementDefeated(value)});
        
        if (undefeatedEnemies.length > 0) {
            let index = MaraUtils.Random(this.parentController.MasterMind, undefeatedEnemies.length - 1);
            this.currentEnemy = undefeatedEnemies[index];
        }

        return this.currentEnemy;
    }

    ResetEnemy(): void {
        this.currentEnemy = null;
    }

    GetOffensiveTarget(
        enemySettlement: any //but actually Settlement
    ): any { //but actually Point2D
        if (!MaraUtils.IsSettlementDefeated(enemySettlement)) {
            let defeatCondition = enemySettlement.RulesOverseer.GetExistenceRule().AlmostDefeatCondition;

            if (defeatCondition == AlmostDefeatCondition.LossProducingBuildings) {
                let professionCenter = enemySettlement.Units.Professions;
                let productionBuilding = professionCenter.ProducingBuildings.First();
                
                return productionBuilding;
            }
            else if (defeatCondition == AlmostDefeatCondition.LossProducingUnits) {
                let professionCenter = enemySettlement.Units.Professions;
                let productionBuilding = professionCenter.ProducingBuildings.First();

                if (productionBuilding) {
                    return productionBuilding;
                }
                else {
                    return professionCenter.ProducingUnits.First();
                }
            }
            else { //loss of all units or custom conditions
                let professionCenter = enemySettlement.Units.Professions;
                let productionBuilding = professionCenter.ProducingBuildings.First();

                if (productionBuilding) {
                    return productionBuilding;
                }
                else {
                    let producingUnit = professionCenter.ProducingUnits.First();
                    
                    if (producingUnit) {
                        return producingUnit;
                    }
                    else {
                        return professionCenter.AllUnitsExceptPassive.First();
                    }
                }
            }
        }

        return null;
    }

    GetExpandOffenseTarget(expandLocation: MaraPoint): any {
        let enemyUnits = MaraUtils.GetSettlementUnitsInArea(
            expandLocation, 
            this.parentController.Settings.UnitSearch.ExpandEnemySearchRadius, 
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
        let settlementLocation = this.parentController.GetSettlementLocation();
        let settlementCenter = settlementLocation?.Center;

        if (settlementCenter) {
            let threatData: any[] = [];

            for (let squad of this.parentController.HostileAttackingSquads) {
                let distanceToCenter = MaraUtils.ChebyshevDistance(settlementCenter, squad.GetLocation().Point);
                threatData.push({squad: squad, distance: distanceToCenter});
            }
            
            threatData = threatData.sort(
                (a, b) => {return a.distance - b.distance;}
            );

            return threatData.map(v => v.squad);
        }
        else {
            return this.parentController.HostileAttackingSquads;
        }
    }

    IsUnderAttack(): boolean {
        let settlementLocation = this.parentController.GetSettlementLocation();

        if (!settlementLocation) {
            return false;
        }

        if (!this.isSafeLocation(settlementLocation.Center, settlementLocation.Radius))  {
            return true;
        }

        for (let expandPoint of this.parentController.Expands) {
            if (
                !this.isSafeLocation(
                    expandPoint, 
                    this.parentController.Settings.UnitSearch.ExpandEnemySearchRadius
                )
            ) {
                return true;
            }
        }

        if (this.parentController.TargetExpand?.BuildCenter) {
            if (
                !this.isSafeLocation(
                    this.parentController.TargetExpand.BuildCenter, 
                    this.parentController.Settings.UnitSearch.ExpandEnemySearchRadius
                )
            ) {
                return true;
            }
        }

        return false;
    }

    public IsSafeExpand(point: any): boolean {
        return this.isSafeLocation(
            point, 
            this.parentController.Settings.UnitSearch.ExpandEnemySearchRadius
        );
    }

    private isSafeLocation(point: any, radius: number): boolean {
        let enemies = MaraUtils.GetSettlementUnitsInArea(
            point, 
            radius, 
            this.EnemySettlements
        );

        return enemies.length == 0;
    }

    GetEnemiesInArea(cell: any, radius: number): Array<any> {
        return MaraUtils.GetSettlementUnitsInArea(cell, radius, this.EnemySettlements);
    }

    GetCurrentDefensiveStrength(): number {
        let units = enumerate(this.parentController.Settlement.Units);
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
        let harvesterConfigIds = MaraUtils.GetAllHarvesterConfigIds(this.parentController.Settlement);
        let harvesterConfigs: Array<any> = [];

        for (let cfgId of harvesterConfigIds) {
            harvesterConfigs.push(MaraUtils.GetUnitConfig(cfgId));
        }

        let settlementLocation = this.parentController.GetSettlementLocation();
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

        let acceptableClusters:Array<any> = [];
        let pathFinder = new PathFinder(MaraUtils.GetScena());

        for (let cluster of candidates) {
            let isClusterReachable = false;
            let clusterCenter = MaraUtils.FindFreeCell(cluster.Center);

            for (let harvesterCfg of harvesterConfigs) {
                if (MaraUtils.IsPathExists(settlementCenter!, clusterCenter, harvesterCfg, pathFinder)) {
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
                    return unit.Owner != this.parentController.Settlement
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

            distance += totalEnemyStrength / 10;
            acceptableClusters.push({Cluster: cluster, Distance: distance});
        }

        let minDistance = Infinity;
        
        for (let item of acceptableClusters) {
            if (minDistance > item.Distance) {
                minDistance = item.Distance;
            }
        }

        let finalClusters: Array<MaraResourceCluster> = [];

        for (let item of acceptableClusters) {
            if (item.Distance / minDistance <= 1.1) {
                finalClusters.push(item.Cluster);
            }
        }
        
        let result: MaraResourceCluster | null = MaraUtils.RandomSelect(this.parentController.MasterMind, finalClusters);

        return result;
    }

    private getOffensiveUnitComposition(produceableCfgIds: string[], requiredStrength: number): UnitComposition {
        let offensiveCfgIds = produceableCfgIds.filter(
            (value) => {
                let config = MaraUtils.GetUnitConfig(value)
                
                return MaraUtils.IsCombatConfig(config) &&
                    config.BuildingConfig == null;
            }
        );
        this.parentController.Debug(`Offensive Cfg IDs: ${offensiveCfgIds}`);
        let allowedOffensiveCfgItems = MaraUtils.MakeAllowedCfgItems(offensiveCfgIds, new Map<string, number>(), this.parentController.Settlement);

        return this.makeCombatUnitComposition(allowedOffensiveCfgItems, requiredStrength);
    }

    private getGuardingUnitComposition(produceableCfgIds: string[], requiredStrength: number): UnitComposition {
        let cfgIds = produceableCfgIds.filter(
            (value) => {
                let config = MaraUtils.GetUnitConfig(value)
                
                return MaraUtils.IsCombatConfig(config) && MaraUtils.IsBuildingConfig(config);
            }
        );
        this.parentController.Debug(`Guarding Cfg IDs: ${cfgIds}`);
        let allowedOffensiveCfgItems = MaraUtils.MakeAllowedCfgItems(cfgIds, new Map<string, number>(), this.parentController.Settlement);

        return this.makeCombatUnitComposition(allowedOffensiveCfgItems, requiredStrength);
    }

    private buildEnemyList(): void {
        let diplomacy = this.parentController.Settlement.Diplomacy;
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
            this.parentController.Debug(`Unable to compose required strength: no allowed configs provided`);
            return unitComposition;
        }

        let currentStrength = 0;

        while (currentStrength < requiredStrength) {
            if (allowedConfigs.length == 0) {
                this.parentController.Debug(`Unable to compose required strength: unit limits reached`);
                break;
            }
            
            let index = MaraUtils.Random(this.parentController.MasterMind, allowedConfigs.length - 1);
            let configItem = allowedConfigs[index];

            if (configItem.MaxCount > 0) {
                let leftStrength = requiredStrength - currentStrength;
                let unitStrength = MaraUtils.GetConfigStrength(configItem.UnitConfig);
                let maxUnitCount = Math.min(Math.round(leftStrength / unitStrength), configItem.MaxCount);

                let unitCount = Math.max(Math.round(maxUnitCount / 2), 1);
                
                MaraUtils.AddToMapItem(unitComposition, configItem.UnitConfig.Uid, unitCount);
                configItem.MaxCount -= unitCount;
                currentStrength += unitCount * unitStrength;

                allowedConfigs = allowedConfigs.filter((value) => {return value.MaxCount > 0});
            }
        }

        return unitComposition;
    }

    private selectAttackToDefenseRatio(): number {
        let choise = MaraUtils.Random(this.parentController.MasterMind, 3);

        switch (choise) {
            case 0:
                return 1;
            case 1:
                return 0.75;
            case 2: 
                return 0.5;
            case 3:
                return 0.25;
            default:
                return 0;
        }
    }
}