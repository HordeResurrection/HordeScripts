import { MaraSettlementController, SettlementLocation } from "Mara/MaraSettlementController";
import { eNext, enumerate } from "Mara/Utils/Common";
import { MaraUtils } from "Mara/Utils/MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraControllableSquad } from "./Squads/MaraControllableSquad";
import { TileType } from "library/game-logic/horde-types";

export class TacticalSubcontroller extends MaraSubcontroller {
    private offensiveSquads: Array<MaraControllableSquad> = [];
    private defensiveSquads: Array<MaraControllableSquad> = [];
    private reinforcementSquads: Array<MaraControllableSquad> = [];
    private initialOffensiveSquadCount: number;
    private unitsInSquads: Map<string, any> = new Map<string, any>();

    private currentTarget: any; //but actually Unit

    constructor (parent: MaraSettlementController) {
        super(parent);
    }

    public get Player(): any {
        return this.parentController.Player;
    }

    public get Settlement(): any {
        return this.parentController.Settlement;
    }

    public get OffenseCombativityIndex(): number {
        let combativityIndex = 0;

        for (let squad of this.offensiveSquads) {
            combativityIndex += squad.CombativityIndex;
        }

        return combativityIndex / this.initialOffensiveSquadCount;
    }

    public get EnemySettlements(): Array<any> {
        return this.parentController.StrategyController.EnemySettlements;
    }

    public get AllSquads(): Array<MaraControllableSquad> {
        return [...this.offensiveSquads, ...this.defensiveSquads, ...this.reinforcementSquads];
    }

    public get SquadsSettings(): any {
        return this.parentController.Settings.Squads;
    }

    Tick(tickNumber: number): void {
        for (let squad of this.parentController.HostileAttackingSquads) {
            squad.Tick(tickNumber);
        }

        for (let squad of this.AllSquads) {
            squad.Tick(tickNumber);
        }
        
        if (tickNumber % 10 == 0) {
            this.updateSquads();

            if (this.currentTarget) { //we are attacking
                if (this.currentTarget.IsAlive) {
                    let pullbackLocation = this.getPullbackLocation();

                    for (let squad of this.offensiveSquads) {
                        if (pullbackLocation) {
                            if (squad.CombativityIndex < this.parentController.Settings.Squads.MinCombativityIndex) {
                                this.sendSquadToLocation(squad, pullbackLocation);
                            }
                        }

                        if (squad.IsIdle() && squad.CombativityIndex >= 1) {
                            squad.Attack(this.currentTarget.Cell);
                        }
                    }
                }
            }
            else if (this.parentController.HostileAttackingSquads.length > 0) { //we are under attack
                this.updateDefenseTargets();
            }
            else { //building up or something
                let retreatLocation = this.getRetreatLocation();

                if (retreatLocation) {
                    for (let squad of this.AllSquads) {
                        if (squad.IsIdle()) {
                            this.sendSquadToLocation(squad, retreatLocation);
                        }
                    }
                }
            }
        }
    }

    Attack(target): void {
        this.currentTarget = target;
        this.parentController.Debug(`Selected '${this.currentTarget.Name}' as attack target`);
        this.issueAttackCommand();
    }

    Defend(): void {
        this.parentController.Debug(`Proceeding to defend`);
        this.currentTarget = null;

        if (
            this.AllSquads.length == 0
        ) {
            this.ComposeSquads();
        }
        
        let defensiveStrength = 0;
        this.defensiveSquads.forEach((squad) => {defensiveStrength += squad.Strength});

        let enemyStrength = 0;
        this.parentController.HostileAttackingSquads.forEach((squad) => {enemyStrength += squad.Strength});

        if (defensiveStrength < enemyStrength) {
            this.parentController.Debug(`Current defense strength ${defensiveStrength} is not enough to counter attack srength ${enemyStrength}`);
            this.Retreat();
        }

        this.updateDefenseTargets();
    }

    Retreat(): void {
        this.parentController.Debug(`Retreating`);
        let retreatLocation = this.getRetreatLocation();

        if (retreatLocation) {
            for (let squad of this.offensiveSquads) {
                squad.Move(retreatLocation.Center, retreatLocation.Radius);
            }
        }
    }

    ComposeSquads(): void {
        this.parentController.Debug(`Composing squads`);
        
        this.offensiveSquads = [];
        this.defensiveSquads = [];
        this.reinforcementSquads = [];
        this.unitsInSquads = new Map<string, any>();

        let units = enumerate(this.parentController.Settlement.Units);
        let unit;
        let combatUnits: Array<any> = [];
        
        while ((unit = eNext(units)) !== undefined) {
            if (this.isCombatUnit(unit) && unit.IsAlive) {
                if (!this.isBuilding(unit)) {
                    combatUnits.push(unit);
                }
            }
        }

        if (combatUnits.length == 0) {
            return;
        }

        let ratio = this.parentController.AttackToDefenseUnitRatio ?? 0.9;
        let defensiveStrength = this.parentController.StrategyController.GetCurrentDefensiveStrength();

        let requiredDefensiveStrength = (1 - ratio) * (this.calcTotalUnitsStrength(combatUnits) + defensiveStrength);
        let unitIndex = 0;
        let defensiveUnits: any[] = [];
        
        for (unitIndex = 0; unitIndex < combatUnits.length; unitIndex++) {
            if (defensiveStrength >= requiredDefensiveStrength) {
                //unitIndex here will be equal to an index of the last defensive unit plus one
                break;
            }
            
            let unit = combatUnits[unitIndex];

            if (!this.isBuilding(unit)) {
                defensiveUnits.push(unit);
            }

            defensiveStrength += MaraUtils.GetUnitStrength(unit);
        }

        this.defensiveSquads = this.createSquadsFromUnits(defensiveUnits);
        this.parentController.Debug(`${this.defensiveSquads.length} defensive squads composed`);
        
        combatUnits.splice(0, unitIndex);
        combatUnits = combatUnits.filter((value, index, array) => {return !this.isBuilding(value)});
        this.offensiveSquads = this.createSquadsFromUnits(combatUnits);
        this.initialOffensiveSquadCount = this.offensiveSquads.length;

        this.parentController.Debug(`${this.initialOffensiveSquadCount} offensive squads composed`);
    }

    DismissSquads(): void {
        this.offensiveSquads = [];
        this.defensiveSquads = [];
        this.reinforcementSquads = [];
    }

    ReinforceSquads(): void {
        this.reinforceSquadsByFreeUnits();

        this.reinforceSquadsByReinforcementSquads();

        let reinforcements = this.reinforcementSquads.filter((value, index, array) => {return value.CombativityIndex >= 1});
        this.offensiveSquads.push(...reinforcements);

        this.reinforcementSquads = this.reinforcementSquads.filter((value, index, array) => {return value.CombativityIndex < 1});
    }

    private getWeakestReinforceableSquad(checkReinforcements: boolean): MaraControllableSquad | null {
        let weakestSquad = this.findWeakestReinforceableSquad(this.defensiveSquads, (s) => s.IsIdle());

        if (weakestSquad == null) {
            weakestSquad = this.findWeakestReinforceableSquad(this.offensiveSquads, (s) => s.IsIdle());
        }

        if (weakestSquad == null && checkReinforcements) {
            weakestSquad = this.findWeakestReinforceableSquad(this.reinforcementSquads);
        }

        return weakestSquad;
    }

    private sendSquadToLocation(squad: MaraControllableSquad, location: SettlementLocation): void {
        if (!location) {
            return;
        }
        
        if (!MaraUtils.IsPointsEqual(squad.CurrentTargetCell, location.Center)) {
            let squadLocation = squad.GetLocation();

            if (MaraUtils.ChebyshevDistance(squadLocation.Point, location.Center) > location.Radius) {
                let spread = squad.MinSpread * 3;
                let precision = Math.max(location.Radius - spread, 0)
                
                squad.Move(location.Center, precision);
            }
        }
    }

    private findWeakestReinforceableSquad(
        squads: Array<MaraControllableSquad>, 
        squadFilter: ((squad: MaraControllableSquad) => boolean) | null = null
    ): MaraControllableSquad | null {
        let weakestSquad: MaraControllableSquad | null = null;

        for (let squad of squads) {
            if (squadFilter) {
                if (!squadFilter(squad)) {
                    continue;
                }
            }

            if (squad.CombativityIndex >= 1) {
                continue;
            }
            
            if (weakestSquad == null) {
                weakestSquad = squad;
            }

            if (squad.Strength < weakestSquad.Strength) {
                weakestSquad = squad;
            }
        }

        return weakestSquad;
    }

    private reinforceSquadsByFreeUnits(): void {
        let units = enumerate(this.parentController.Settlement.Units);
        let unit;
        let freeUnits: any[] = [];
        
        while ((unit = eNext(units)) !== undefined) {
            if (
                !this.unitsInSquads.has(unit.Id) &&
                this.isCombatUnit(unit) && 
                !this.isBuilding(unit) && 
                unit.IsAlive
            ) {
                freeUnits.push(unit);
                this.parentController.Debug(`Unit ${unit.ToString()} is marked for reinforcements`);
            }
        }

        if (freeUnits.length == 0) {
            return;
        }

        let weakestSquad = this.getWeakestReinforceableSquad(true);

        if (weakestSquad != null) {
            weakestSquad.AddUnits(freeUnits);
        
            for (let unit of freeUnits) {
                this.unitsInSquads.set(unit.Id, unit);
            }
        }
        else {
            let newSquad = this.createSquad(freeUnits);
            this.reinforcementSquads.push(newSquad);
        }
    }

    private reinforceSquadsByReinforcementSquads(): void {
        let weakestSquad = this.getWeakestReinforceableSquad(false);

        if (!weakestSquad) {
            return;
        }

        let strongestReinforcementIndex: number | null = null;
        let maxStrength = 0;

        for (let i = 0; i < this.reinforcementSquads.length; i++) {
            if (strongestReinforcementIndex == null) {
                strongestReinforcementIndex = i;
                maxStrength = this.reinforcementSquads[i].Strength;
            }

            if (this.reinforcementSquads[i].Strength > maxStrength) {
                strongestReinforcementIndex = i;
                maxStrength = this.reinforcementSquads[i].Strength;
            }
        }

        if (strongestReinforcementIndex != null) {
            let reinforcementSquad = this.reinforcementSquads[strongestReinforcementIndex];
            weakestSquad.AddUnits(reinforcementSquad.Units);
            this.reinforcementSquads.splice(strongestReinforcementIndex, 1);
        }
    }

    private calcTotalUnitsStrength(units: Array<any>): number {
        let totalStrength = 0;
        units.forEach((value, index, array) => {totalStrength += MaraUtils.GetUnitStrength(value)});
        
        return totalStrength;
    }

    private createSquadsFromUnits(units: Array<any>): Array<MaraControllableSquad> {
        let unitClusters = this.clusterizeUnits(units);
        let result: Array<MaraControllableSquad> = [];

        for (let cluster of unitClusters) {
            let squads = this.createSquadsFromHomogeneousUnits(cluster);
            result.push(...squads);
        }
        
        return result;
    }

    private clusterizeUnits(units: Array<any>): Array<Array<any>> {
        let clusters = new Map<string, Array<any>>();

        for (let unit of units) {
            let moveType = unit.Cfg.MoveType.ToString();

            let unitSpeed = unit.Cfg.Speeds.Item(TileType.Grass);
            let speedGroupCode = "";

            if (unitSpeed <= 9) {
                speedGroupCode = "1";
            }
            else if (unitSpeed <= 14) {
                speedGroupCode = "2";
            }
            else {
                speedGroupCode = "3";
            }

            let clusterKey = `${moveType}:${speedGroupCode}`;
            let cluster: Array<any>;
            
            if (clusters.has(clusterKey)) {
                cluster = clusters.get(clusterKey)!;
            }
            else {
                cluster = new Array<any>();
            }

            cluster.push(unit);
            clusters.set(clusterKey, cluster);
        }
        
        return Array.from(clusters.values());
    }

    private createSquadsFromHomogeneousUnits(units: Array<any>): Array<MaraControllableSquad> {
        let squadUnits: any[] = [];
        let squads: Array<MaraControllableSquad> = [];
        let currentSquadStrength = 0;

        for (let unit of units) {
            currentSquadStrength += MaraUtils.GetUnitStrength(unit);
            squadUnits.push(unit);
            this.parentController.Debug(`Added unit ${unit.ToString()} into squad`);

            if (currentSquadStrength >= this.parentController.Settings.Squads.MinStrength) {
                let squad = this.createSquad(squadUnits);
                
                squads.push(squad);
                currentSquadStrength = 0;
                squadUnits = [];
            }
        }

        if (squadUnits.length > 0) {
            let squad = this.createSquad(squadUnits);    
            squads.push(squad);
        }
        
        return squads;
    }

    private createSquad(units: Array<any>): MaraControllableSquad {
        let squad = new MaraControllableSquad(units, this);
        
        for (let unit of units) {
            this.unitsInSquads.set(unit.Id, unit);
        }

        return squad;
    }

    private issueAttackCommand(): void {
        this.parentController.Debug(`Issuing attack command`);

        for (let squad of this.offensiveSquads) {
            this.parentController.Debug(`Squad attacking`);
            squad.Attack(this.currentTarget.Cell);
        }
    }

    private updateSquads(): void {
        this.offensiveSquads = this.offensiveSquads.filter((squad) => {return squad.Units.length > 0});
        this.defensiveSquads = this.defensiveSquads.filter((squad) => {return squad.Units.length > 0});
        this.reinforcementSquads = this.reinforcementSquads.filter((squad) => {return squad.Units.length > 0});
        this.parentController.HostileAttackingSquads = this.parentController.HostileAttackingSquads.filter((squad) => {return squad.Units.length > 0});

        if (this.unitsInSquads != null) {
            let filteredUnits = new Map<string, any>();
            
            this.unitsInSquads.forEach(
                (value, key, map) => {
                    if (value.IsAlive) {
                        filteredUnits.set(key, value)
                    }
                }
            );

            this.unitsInSquads = filteredUnits;
        }
    }

    private isCombatUnit(unit: any): boolean {
        return MaraUtils.IsCombatConfig(unit.Cfg);
    }

    private isBuilding(unit: any): boolean {
        let config = unit.Cfg;

        return config.BuildingConfig != null;
    }

    private getPullbackLocation(): SettlementLocation | null {
        return this.parentController.GetSettlementLocation();
    }

    private getRetreatLocation(): SettlementLocation | null {
        return this.getPullbackLocation();
    }

    private updateDefenseTargets(): void {
        if (this.parentController.HostileAttackingSquads.length == 0) {
            return;
        }
        
        let attackers = this.parentController.StrategyController.OrderAttackersByDangerLevel();
        
        let attackerIndex = 0;
        let attackerLocation = attackers[attackerIndex].GetLocation();
        let attackerStrength = attackers[attackerIndex].Strength;
        let accumulatedStrength = 0;

        let settlementLocation = this.parentController.GetSettlementLocation();

        if (!settlementLocation) { //everything is lost :(
            return;
        }

        let settlementCenter = settlementLocation.Center;
        
        for (let squad of this.AllSquads) {
            let distanceToSettlement = MaraUtils.ChebyshevDistance(
                squad.GetLocation().Point,
                settlementCenter
            );

            if (distanceToSettlement > settlementLocation.Radius) {
                continue;
            }
            
            squad.Attack(attackerLocation.Point);
            accumulatedStrength += squad.Strength;

            if (accumulatedStrength > attackerStrength) {
                attackerIndex++;

                if (attackerIndex == attackers.length) {
                    return;
                }

                attackerLocation = attackers[attackerIndex].GetLocation();
                attackerStrength = attackers[attackerIndex].Strength;
                accumulatedStrength = 0;
            }
        }
    }
}