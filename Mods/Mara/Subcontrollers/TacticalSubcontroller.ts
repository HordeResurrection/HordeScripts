import { MaraSettlementController, SettlementLocation } from "Mara/MaraSettlementController";
import { MaraUtils } from "Mara/Utils/MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraControllableSquad } from "./Squads/MaraControllableSquad";
import { TileType } from "library/game-logic/horde-types";
import { enumerate, eNext } from "library/dotnet/dotnet-utils";

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
        return this.settlementController.Player;
    }

    public get Settlement(): any {
        return this.settlementController.Settlement;
    }

    public get OffenseCombativityIndex(): number {
        let combativityIndex = 0;

        for (let squad of this.offensiveSquads) {
            combativityIndex += squad.CombativityIndex;
        }

        return combativityIndex / this.initialOffensiveSquadCount;
    }

    public get EnemySettlements(): Array<any> {
        return this.settlementController.StrategyController.EnemySettlements;
    }

    public get AllSquads(): Array<MaraControllableSquad> {
        return [...this.offensiveSquads, ...this.defensiveSquads, ...this.reinforcementSquads];
    }

    public get SquadsSettings(): any {
        return this.settlementController.Settings.Squads;
    }

    Tick(tickNumber: number): void {
        for (let squad of this.settlementController.HostileAttackingSquads) {
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
                            if (squad.CombativityIndex < this.settlementController.Settings.Squads.MinCombativityIndex) {
                                this.sendSquadToLocation(squad, pullbackLocation);
                            }
                        }

                        if (squad.IsIdle() && squad.CombativityIndex >= 1) {
                            squad.Attack(this.currentTarget.Cell);
                        }
                    }
                }
            }
            else if (this.settlementController.HostileAttackingSquads.length > 0) { //we are under attack
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
        this.settlementController.Debug(`Selected '${this.currentTarget.Name}' as attack target`);
        this.issueAttackCommand();
    }

    Defend(): void {
        this.settlementController.Debug(`Proceeding to defend`);
        this.currentTarget = null;

        if (
            this.AllSquads.length == 0
        ) {
            this.ComposeSquads();
        }
        
        let defensiveStrength = 0;
        this.defensiveSquads.forEach((squad) => {defensiveStrength += squad.Strength});

        let enemyStrength = 0;
        this.settlementController.HostileAttackingSquads.forEach((squad) => {enemyStrength += squad.Strength});

        if (defensiveStrength < enemyStrength) {
            this.settlementController.Debug(`Current defense strength ${defensiveStrength} is not enough to counter attack srength ${enemyStrength}`);
            this.Retreat();
        }

        this.updateDefenseTargets();
    }

    Retreat(): void {
        this.settlementController.Debug(`Retreating`);
        let retreatLocation = this.getRetreatLocation();

        if (retreatLocation) {
            for (let squad of this.offensiveSquads) {
                squad.Move(retreatLocation.Center, retreatLocation.Radius);
            }
        }
    }

    ComposeSquads(): void {
        this.settlementController.Debug(`Composing squads`);
        
        this.offensiveSquads = [];
        this.defensiveSquads = [];
        this.reinforcementSquads = [];
        this.unitsInSquads = new Map<string, any>();

        let units = enumerate(this.settlementController.Settlement.Units);
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

        let ratio = this.settlementController.AttackToDefenseUnitRatio ?? 0.9;
        let defensiveStrength = this.settlementController.StrategyController.GetCurrentDefensiveStrength();

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
        this.settlementController.Debug(`${this.defensiveSquads.length} defensive squads composed`);
        
        combatUnits.splice(0, unitIndex);
        combatUnits = combatUnits.filter((value, index, array) => {return !this.isBuilding(value)});
        this.offensiveSquads = this.createSquadsFromUnits(combatUnits);
        this.initialOffensiveSquadCount = this.offensiveSquads.length;

        this.settlementController.Debug(`${this.initialOffensiveSquadCount} offensive squads composed`);
    }

    ReinforceSquads(): void {
        this.reinforceSquadsByFreeUnits();

        this.reinforceSquadsByReinforcementSquads();

        let reinforcements = this.reinforcementSquads.filter((value, index, array) => {return value.CombativityIndex >= 1});
        this.offensiveSquads.push(...reinforcements);

        this.reinforcementSquads = this.reinforcementSquads.filter((value, index, array) => {return value.CombativityIndex < 1});
    }

    private getWeakestReinforceableSquad(squadMovementType: string, checkReinforcements: boolean): MaraControllableSquad | null {
        let weakestSquad = this.findWeakestReinforceableSquad(this.defensiveSquads, squadMovementType, (s) => s.IsIdle());

        if (weakestSquad == null) {
            weakestSquad = this.findWeakestReinforceableSquad(this.offensiveSquads, squadMovementType, (s) => s.IsIdle());
        }

        if (weakestSquad == null && checkReinforcements) {
            weakestSquad = this.findWeakestReinforceableSquad(this.reinforcementSquads, squadMovementType);
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
                let precision = Math.max(location.Radius - spread, 0);
                
                squad.Move(location.Center, precision);
            }
        }
    }

    private findWeakestReinforceableSquad(
        squads: Array<MaraControllableSquad>, 
        squadMovementType: string,
        squadFilter: ((squad: MaraControllableSquad) => boolean) | null = null
    ): MaraControllableSquad | null {
        let weakestSquad: MaraControllableSquad | null = null;

        for (let squad of squads) {
            if (squad.Units.length == 0) {
                continue;
            }

            let movementType = this.getUnitMovementType(squad.Units[0]);

            if (movementType != squadMovementType) {
                continue;
            }
            
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
        let units = enumerate(this.settlementController.Settlement.Units);
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
                this.settlementController.Debug(`Unit ${unit.ToString()} is marked for reinforcements`);
            }
        }

        if (freeUnits.length == 0) {
            return;
        }

        let clusters = this.clusterizeUnitsByMovementType(freeUnits);

        for (let cluster of clusters) {
            let movementType = this.getUnitMovementType(cluster[0]);
            let weakestSquad = this.getWeakestReinforceableSquad(movementType, true);

            if (weakestSquad != null) {
                weakestSquad.AddUnits(cluster);

                for (let unit of cluster) {
                    this.unitsInSquads.set(unit.Id, unit);
                }
            }
            else {
                let newSquad = this.createSquad(cluster);
                this.reinforcementSquads.push(newSquad);
            }
        }
    }

    private reinforceSquadsByReinforcementSquads(): void {
        let usedReinforcementSquads: Array<MaraControllableSquad> = [];

        for (let squad of this.reinforcementSquads) {
            let movementType = this.getUnitMovementType(squad.Units[0]);
            let weakestSquad = this.getWeakestReinforceableSquad(movementType, false);

            if (!weakestSquad) {
                continue;
            }

            weakestSquad.AddUnits(squad.Units);
            usedReinforcementSquads.push(squad);
        }

        this.reinforcementSquads = this.reinforcementSquads.filter(
            (value) => {return usedReinforcementSquads.indexOf(value) < 0}
        );
    }

    private calcTotalUnitsStrength(units: Array<any>): number {
        let totalStrength = 0;
        units.forEach((value, index, array) => {totalStrength += MaraUtils.GetUnitStrength(value)});
        
        return totalStrength;
    }

    private createSquadsFromUnits(units: Array<any>): Array<MaraControllableSquad> {
        let unitClusters = this.clusterizeUnitsByMovementType(units);
        let result: Array<MaraControllableSquad> = [];

        for (let cluster of unitClusters) {
            let squads = this.createSquadsFromHomogeneousUnits(cluster);
            result.push(...squads);
        }
        
        return result;
    }

    private getUnitMovementType(unit: any) {
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

        return `${moveType}:${speedGroupCode}`;
    }

    private clusterizeUnitsByMovementType(units: Array<any>): Array<Array<any>> {
        let clusters = new Map<string, Array<any>>();

        for (let unit of units) {
            let clusterKey = this.getUnitMovementType(unit);
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
            this.settlementController.Debug(`Added unit ${unit.ToString()} into squad`);

            if (currentSquadStrength >= this.settlementController.Settings.Squads.MinStrength) {
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
        this.settlementController.Debug(`Issuing attack command`);

        for (let squad of this.offensiveSquads) {
            this.settlementController.Debug(`Squad attacking`);
            squad.Attack(this.currentTarget.Cell);
        }
    }

    private updateSquads(): void {
        this.offensiveSquads = this.offensiveSquads.filter((squad) => {return squad.Units.length > 0});
        this.defensiveSquads = this.defensiveSquads.filter((squad) => {return squad.Units.length > 0});
        this.reinforcementSquads = this.reinforcementSquads.filter((squad) => {return squad.Units.length > 0});
        this.settlementController.HostileAttackingSquads = this.settlementController.HostileAttackingSquads.filter((squad) => {return squad.Units.length > 0});

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
        return this.settlementController.GetSettlementLocation();
    }

    private getRetreatLocation(): SettlementLocation | null {
        return this.getPullbackLocation();
    }

    private updateDefenseTargets(): void {
        if (this.settlementController.HostileAttackingSquads.length == 0) {
            return;
        }
        
        let attackers = this.settlementController.StrategyController.OrderAttackersByDangerLevel();
        
        let attackerIndex = 0;
        let attackerLocation = attackers[attackerIndex].GetLocation();
        let attackerStrength = attackers[attackerIndex].Strength;
        let accumulatedStrength = 0;

        let settlementLocation = this.settlementController.GetSettlementLocation();

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