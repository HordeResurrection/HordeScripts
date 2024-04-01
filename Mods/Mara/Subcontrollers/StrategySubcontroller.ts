//TODO: add unit types analysis and listing from game configs

import { MaraSettlementController } from "Mara/MaraSettlementController";
import { eNext, enumerate } from "Mara/Utils/Common";
import { UnitComposition, MaraUtils, AlmostDefeatCondition, AllowedCompositionItem } from "Mara/Utils/MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraSquad } from "./Squads/MaraSquad";

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

    GetArmyComposition(): UnitComposition {
        if (!this.currentEnemy) {
            this.SelectEnemy();
        }
        
        let requiredOffensiveStrength = this.calcSettlementStrength(this.currentEnemy, true);
        requiredOffensiveStrength = 1.5 * requiredOffensiveStrength;
        requiredOffensiveStrength = Math.ceil(Math.max(requiredOffensiveStrength / 100, 1)) * 100;
        this.parentController.Debug(`Calculated required offensive strength: ${requiredOffensiveStrength}`);

        let currentStrength = this.calcSettlementStrength(this.parentController.Settlement, false);
        this.parentController.Debug(`Current offensive strength: ${currentStrength}`);

        requiredOffensiveStrength -= currentStrength;
        requiredOffensiveStrength = Math.max(requiredOffensiveStrength, 0);
        this.parentController.Debug(`Offensive strength to produce: ${requiredOffensiveStrength}`);

        let produceableCfgIds = this.parentController.ProductionController.GetProduceableCfgIds();
        
        let offensiveCfgIds = produceableCfgIds.filter(
            (value, index, array) => {
                let config = MaraUtils.GetUnitConfig(value)
                
                return MaraUtils.IsCombatConfig(config) &&
                    config.BuildingConfig == null;
            }
        );
        this.parentController.Debug(`Offensive Cfg IDs: ${offensiveCfgIds}`);
        let allowedOffensiveCfgItems = MaraUtils.MakeAllowedCfgItems(offensiveCfgIds, new Map<string, number>(), this.parentController.Settlement);

        let unitList = this.makeCombatUnitComposition(allowedOffensiveCfgItems, requiredOffensiveStrength);
        this.parentController.Debug(`Offensive unit composition:`);
        MaraUtils.PrintMap(unitList);

        let requiredDefensiveStrength = 0.15 * requiredOffensiveStrength; //add a bit more for defense purposes
        this.parentController.Debug(`Calculated required defensive strength: ${requiredDefensiveStrength}`);
        
        let defensiveCfgIds = produceableCfgIds.filter(
            (value, index, array) => {
                let config = MaraUtils.GetUnitConfig(value)
                
                return MaraUtils.IsCombatConfig(config);
            }
        );
        this.parentController.Debug(`Defensive Cfg IDs: ${defensiveCfgIds}`);

        let allowedDefensiveCfgItems = MaraUtils.MakeAllowedCfgItems(defensiveCfgIds, unitList, this.parentController.Settlement);
        let defensiveUnitList = this.makeCombatUnitComposition(allowedDefensiveCfgItems, requiredDefensiveStrength);
        this.parentController.Debug(`Defensive unit composition:`);
        MaraUtils.PrintMap(defensiveUnitList);

        defensiveUnitList.forEach((value, key, map) => MaraUtils.AddToMapItem(unitList, key, value));
        
        return unitList;
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
        //TODO: add enemy detection around expands
        let settlementLocation = this.parentController.GetSettlementLocation();

        if (!settlementLocation) {
            return false;
        }

        let enemies = MaraUtils.GetSettlementUnitsInArea(
            settlementLocation.Center, 
            settlementLocation.Radius, 
            this.EnemySettlements
        );
        
        return enemies.length > 0;
    }

    GetEnemiesInArea(cell: any, radius: number): Array<any> {
        return MaraUtils.GetSettlementUnitsInArea(cell, radius, this.EnemySettlements);
    }

    private buildEnemyList(): void {
        let diplomacy = this.parentController.Settlement.Diplomacy;
        let settlements = MaraUtils.GetAllSettlements();
        this.EnemySettlements = settlements.filter((value) => {return diplomacy.IsWarStatus(value)})
    }

    private calcSettlementStrength(settlement: any, includeBuildings: boolean): number {
        let units = enumerate(settlement.Units);
        let unit;
        let settlementStrength = 0;
        
        while ((unit = eNext(units)) !== undefined) {
            if (unit.Cfg.BuildingConfig == null || includeBuildings) {
                settlementStrength += MaraUtils.GetUnitStrength(unit);
            }
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
                MaraUtils.IncrementMapItem(unitComposition, configItem.UnitConfig.Uid);
                currentStrength += MaraUtils.GetConfigStrength(configItem.UnitConfig);
                configItem.MaxCount--;

                allowedConfigs = allowedConfigs.filter((value) => {return value.MaxCount > 0});
            }
        }

        return unitComposition;
    }
}