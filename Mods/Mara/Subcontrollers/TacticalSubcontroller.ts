import { MaraSettlementController } from "Mara/MaraSettlementController";
import { SettlementClusterLocation } from "../Common/Settlement/SettlementClusterLocation";
import { MaraUtils } from "Mara/MaraUtils";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraControllableSquad } from "./Squads/MaraControllableSquad";
import { MaraRect } from "../Common/MaraRect";
import { MaraPoint } from "../Common/MaraPoint";
import { MaraUnitCacheItem } from "../Common/Cache/MaraUnitCacheItem";
import { MaraUnitConfigCache } from "../Common/Cache/MaraUnitConfigCache";

export class TacticalSubcontroller extends MaraSubcontroller {
    private offensiveSquads: Array<MaraControllableSquad> = [];
    private defensiveSquads: Array<MaraControllableSquad> = [];
    private militiaSquads: Array<MaraControllableSquad> = [];
    private reinforcementSquads: Array<MaraControllableSquad> = [];
    private initialOffensiveSquadCount: number;
    private unitsInSquads: Map<number, MaraUnitCacheItem> = new Map<number, MaraUnitCacheItem>();

    private currentTarget: MaraUnitCacheItem | null;
    private attackPath: Array<MaraPoint>;

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

    public get SquadsSettings(): any {
        return this.settlementController.Settings.Squads;
    }

    private get allSquads(): Array<MaraControllableSquad> {
        return [...this.offensiveSquads, ...this.defensiveSquads, ...this.reinforcementSquads, ...this.militiaSquads];
    }

    Tick(tickNumber: number): void {
        for (let squad of this.settlementController.HostileAttackingSquads) {
            squad.Tick(tickNumber);
        }

        for (let squad of this.allSquads) {
            squad.Tick(tickNumber);
        }
        
        if (tickNumber % 10 == 0) {
            this.updateSquads();
            this.settlementController.State.TacticalControllerTick();
        }
    }

    AttackTick(): void {
        this.reinforceSquads();
        
        if (this.currentTarget!.Unit.IsAlive) {
            let pullbackLocations = this.getPullbackLocations();

            for (let squad of this.offensiveSquads) {
                if (pullbackLocations.length > 0) {
                    if (squad.CombativityIndex < this.settlementController.Settings.Squads.MinCombativityIndex) {
                        this.sendSquadToOneOfLocations(squad, pullbackLocations);
                    }
                }

                if (squad.IsIdle() && squad.CombativityIndex >= 1) {
                    squad.Attack(this.attackPath);
                }
            }
        }
    }

    DefendTick(): void {
        this.reinforceSquads();

        if (this.needRetreat()) {
            this.Retreat();
        }

        if (!this.canDefend()) {
            this.makeMilitia();
        }

        this.updateDefenseTargets();
    }

    IdleTick(): void {
        let retreatLocations = this.getRetreatLocations();

        if (retreatLocations.length > 0) {
            for (let squad of this.allSquads) {
                if (squad.IsIdle()) {
                    this.sendSquadToOneOfLocations(squad, retreatLocations);
                }
            }
        }
    }

    Attack(target: MaraUnitCacheItem): void {
        this.currentTarget = target;
        this.settlementController.Debug(`Selected '${this.currentTarget.Unit.Name}' as attack target`);

        let settlementLocation = this.settlementController.GetSettlementLocation();
        let targetPoint = this.currentTarget.UnitCell;

        if (settlementLocation) {
            let path = this.settlementController.StrategyController.GetPath(
                settlementLocation.Center,
                targetPoint
            );

            if (path.length > 1) {
                this.attackPath = path.slice(1);
            }
            else {
                this.attackPath = path;
            }
        }
        else {
            this.attackPath = [this.currentTarget.UnitCell];
        }

        this.settlementController.Debug(`Selected as attack path:`);
        
        for (let point of this.attackPath) {
            this.settlementController.Debug(point.ToString());
        }

        if (this.settlementController.Settings.Squads.DebugSquads) {
            MaraUtils.DrawPath(this.attackPath, this.settlementController.Settlement.SettlementColor);
        }
        
        this.issueAttackCommand();
    }

    Defend(): void {
        this.settlementController.Debug(`Proceeding to defend`);
        this.currentTarget = null;

        if (
            this.allSquads.length == 0
        ) {
            this.ComposeSquads();
        }
        
        if (this.needRetreat()) {
            this.Retreat();
        }

        this.updateDefenseTargets();
    }

    Retreat(): void {
        let retreatLocations = this.getRetreatLocations();

        if (retreatLocations.length > 0) {
            for (let squad of this.offensiveSquads) {
                this.sendSquadToOneOfLocations(squad, retreatLocations);
            }

            if (this.offensiveSquads.length > 0) {
                this.settlementController.Debug(`Retreating`);
            }
        }
    }

    ComposeSquads(): void {
        this.settlementController.Debug(`Composing squads`);
        
        this.offensiveSquads = [];
        this.defensiveSquads = [];
        this.reinforcementSquads = [];
        this.DismissMilitia();
        this.unitsInSquads = new Map<number, MaraUnitCacheItem>();

        let units = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        let combatUnits: Array<MaraUnitCacheItem> = [];
        
        for (let unit of units) {
            if (this.isCombatUnit(unit) && unit.Unit.IsAlive) {
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
        let defensiveUnits: Array<MaraUnitCacheItem> = [];
        
        for (unitIndex = 0; unitIndex < combatUnits.length; unitIndex ++) {
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

    DismissMilitia(): void {
        for (let squad of this.militiaSquads) {
            for (let unit of squad.Units) {
                this.settlementController.ReservedUnitsData.FreeUnit(unit);
            }
        }
        this.militiaSquads = [];
    }

    DebugSquad(message: string) {
        if (this.settlementController.Settings.Squads.DebugSquads) {
            this.settlementController.Debug(message);
        }
    }

    private needRetreat(): boolean {
        let defensiveStrength = 0;
        this.defensiveSquads.forEach((squad) => {defensiveStrength += squad.Strength});

        let enemyStrength = 0;
        this.settlementController.HostileAttackingSquads.forEach((squad) => {enemyStrength += squad.Strength});

        return defensiveStrength < enemyStrength;
    }

    private canDefend(): boolean {
        return this.allSquads.length > 0;
    }

    private makeMilitia(): void {
        let allUnits = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        let militiaUnits = allUnits.filter((value) => {
            return MaraUtils.IsArmedConfigId(value.UnitCfgId) && 
            !this.isBuilding(value) &&
            !this.settlementController.ReservedUnitsData.IsUnitReserved(value)
        });

        this.militiaSquads.push(...this.createSquadsFromUnits(militiaUnits));
        
        for (let unit of militiaUnits) {
            this.settlementController.ReservedUnitsData.ReserveUnit(unit);
        }
    }

    private reinforceSquads(): void {
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
            weakestSquad = this.findWeakestReinforceableSquad(this.reinforcementSquads, squadMovementType, (s) => s.IsIdle());
        }

        return weakestSquad;
    }

    private sendSquadToOneOfLocations(squad: MaraControllableSquad, locations: Array<SettlementClusterLocation>): void {
        if (locations.length == 0) {
            return;
        }

        let closestLocation: SettlementClusterLocation | null = null;
        let minDistance = Infinity;

        let squadLocation = squad.GetLocation();

        for (let location of locations) {
            let distance = MaraUtils.ChebyshevDistance(squadLocation.Point, location.Center);

            if (distance < minDistance) {
                closestLocation = location;
                minDistance = distance;
            }
        }

        if (!squad.CurrentMovementPoint || !MaraUtils.IsPointsEqual(squad.CurrentMovementPoint, closestLocation!.Center)) {
            if (
                !closestLocation!.BoundingRect.IsPointInside(squadLocation.Point)
            ) {
                let spread = squad.MinSpread * 3;
                let minDimension = Math.min(closestLocation!.BoundingRect.Width, closestLocation!.BoundingRect.Heigth);
                let precision = Math.max(minDimension - spread, 0);
                
                let movementPoint = new MaraPoint(closestLocation!.Center.X, closestLocation!.Center.Y);
                squad.Move([movementPoint], precision / 2);
            }
        }
    }

    private findWeakestReinforceableSquad(
        squads: Array<MaraControllableSquad>, 
        squadMovementType: string,
        squadFilter?: (squad: MaraControllableSquad) => boolean
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
        let units = MaraUtils.GetAllSettlementUnits(this.settlementController.Settlement);
        let freeUnits: Array<MaraUnitCacheItem> = [];
        
        for (let unit of units) {
            if (
                !this.unitsInSquads.has(unit.UnitId) &&
                this.isCombatUnit(unit) && 
                !this.isBuilding(unit) && 
                unit.Unit.IsAlive
            ) {
                freeUnits.push(unit);
                this.settlementController.Debug(`Unit ${unit.Unit.ToString()} is marked for reinforcements`);
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
                this.DebugSquad(`Reinforced squad ${weakestSquad.ToString()} by units ${cluster.map((value) => value.Unit.ToString()).join("\n")}`);

                for (let unit of cluster) {
                    this.unitsInSquads.set(unit.UnitId, unit);
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
            this.DebugSquad(`Reinforced squad ${weakestSquad.ToString()} by units ${squad.Units.map((value) => value.Unit.ToString()).join("\n")}`);

            usedReinforcementSquads.push(squad);
        }

        this.reinforcementSquads = this.reinforcementSquads.filter(
            (value) => {return usedReinforcementSquads.indexOf(value) < 0}
        );
    }

    private calcTotalUnitsStrength(units: Array<MaraUnitCacheItem>): number {
        let totalStrength = 0;
        units.forEach((value, index, array) => {totalStrength += MaraUtils.GetUnitStrength(value)});
        
        return totalStrength;
    }

    private createSquadsFromUnits(units: Array<MaraUnitCacheItem>): Array<MaraControllableSquad> {
        let unitClusters = this.clusterizeUnitsByMovementType(units);
        let result: Array<MaraControllableSquad> = [];

        for (let cluster of unitClusters) {
            let squads = this.createSquadsFromHomogeneousUnits(cluster);
            result.push(...squads);
        }
        
        return result;
    }

    private getUnitMovementType(unit: MaraUnitCacheItem): string {
        let speedsThresholds = this.settlementController.Settings.CombatSettings.UnitSpeedClusterizationThresholds;
        let unitCfgId = unit.UnitCfgId;
        
        let unitSpeed = MaraUnitConfigCache.GetConfigProperty(unitCfgId, (cfg) => cfg.Speeds.Grass as number, "GrassSpeed") as number;
        let speedGroupCode: number | null = null;

        for (let i = 0; i < speedsThresholds.length; i++) {
            if (unitSpeed <= speedsThresholds[i]) {
                speedGroupCode = i;
                break;
            }
        }

        if (speedGroupCode == null) {
            speedGroupCode = speedsThresholds.length;
        }

        let moveType = "";
        
        moveType += this.speedToMoveTypeFlag(MaraUnitConfigCache.GetConfigProperty(unitCfgId, (cfg) => cfg.Speeds.Grass as number,  "GrassSpeed") as number);
        moveType += this.speedToMoveTypeFlag(MaraUnitConfigCache.GetConfigProperty(unitCfgId, (cfg) => cfg.Speeds.Forest as number, "ForestSpeed") as number);
        moveType += this.speedToMoveTypeFlag(MaraUnitConfigCache.GetConfigProperty(unitCfgId, (cfg) => cfg.Speeds.Water as number,  "WaterSpeed") as number);
        moveType += this.speedToMoveTypeFlag(MaraUnitConfigCache.GetConfigProperty(unitCfgId, (cfg) => cfg.Speeds.Marsh as number,  "MarshSpeed") as number);
        moveType += this.speedToMoveTypeFlag(MaraUnitConfigCache.GetConfigProperty(unitCfgId, (cfg) => cfg.Speeds.Sand as number,   "SandSpeed") as number);
        moveType += this.speedToMoveTypeFlag(MaraUnitConfigCache.GetConfigProperty(unitCfgId, (cfg) => cfg.Speeds.Mounts as number, "MountsSpeed") as number);
        moveType += this.speedToMoveTypeFlag(MaraUnitConfigCache.GetConfigProperty(unitCfgId, (cfg) => cfg.Speeds.Road as number,   "RoadSpeed") as number);
        moveType += this.speedToMoveTypeFlag(MaraUnitConfigCache.GetConfigProperty(unitCfgId, (cfg) => cfg.Speeds.Ice as number,    "IceSpeed") as number);

        return `${moveType}:${speedGroupCode}`;
    }

    private speedToMoveTypeFlag(speed: number): string {
        if (speed > 0) {
            return "1";
        }
        else {
            return "0";
        }
    }

    private clusterizeUnitsByMovementType(units: Array<MaraUnitCacheItem>): Array<Array<MaraUnitCacheItem>> {
        let clusters = new Map<string, Array<MaraUnitCacheItem>>();

        for (let unit of units) {
            let clusterKey = this.getUnitMovementType(unit);
            let cluster: Array<MaraUnitCacheItem>;
            
            if (clusters.has(clusterKey)) {
                cluster = clusters.get(clusterKey)!;
            }
            else {
                cluster = new Array<MaraUnitCacheItem>();
            }

            cluster.push(unit);
            clusters.set(clusterKey, cluster);
        }
        
        return Array.from(clusters.values());
    }

    private createSquadsFromHomogeneousUnits(units: Array<MaraUnitCacheItem>): Array<MaraControllableSquad> {
        let squadUnits: Array<MaraUnitCacheItem> = [];
        let squads: Array<MaraControllableSquad> = [];
        let currentSquadStrength = 0;

        for (let unit of units) {
            currentSquadStrength += MaraUtils.GetUnitStrength(unit);
            squadUnits.push(unit);

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

    private createSquad(units: Array<MaraUnitCacheItem>): MaraControllableSquad {
        let squad = new MaraControllableSquad(units, this);
        
        for (let unit of units) {
            this.unitsInSquads.set(unit.UnitId, unit);
        }

        return squad;
    }

    private issueAttackCommand(): void {
        this.settlementController.Debug(`Issuing attack command`);

        for (let squad of this.offensiveSquads) {
            squad.Attack(this.attackPath);
        }
    }

    private updateSquads(): void {
        this.offensiveSquads = this.offensiveSquads.filter((squad) => {return squad.Units.length > 0});
        this.defensiveSquads = this.defensiveSquads.filter((squad) => {return squad.Units.length > 0});
        this.reinforcementSquads = this.reinforcementSquads.filter((squad) => {return squad.Units.length > 0});
        this.militiaSquads = this.militiaSquads.filter((squad) => {return squad.Units.length > 0});
        this.settlementController.HostileAttackingSquads = this.settlementController.HostileAttackingSquads.filter((squad) => {return squad.Units.length > 0});

        if (this.unitsInSquads != null) {
            let filteredUnits = new Map<number, MaraUnitCacheItem>();
            
            this.unitsInSquads.forEach(
                (value, key, map) => {
                    if (value.Unit.IsAlive) {
                        filteredUnits.set(key, value)
                    }
                }
            );

            this.unitsInSquads = filteredUnits;
        }
    }

    private isCombatUnit(unit: MaraUnitCacheItem): boolean {
        return MaraUtils.IsCombatConfigId(unit.UnitCfgId);
    }

    private isBuilding(unit: MaraUnitCacheItem): boolean {
        return MaraUtils.IsBuildingConfigId(unit.UnitCfgId);
    }

    private getPullbackLocations(): Array<SettlementClusterLocation> {
        let result: Array<SettlementClusterLocation> = [];
        let settlementLocation = this.settlementController.GetSettlementLocation();

        if (settlementLocation) {
            result.push(settlementLocation);
        }

        for (let expand of this.settlementController.Expands) {
            let radius = Math.max(
                this.settlementController.Settings.ResourceMining.WoodcuttingRadius, 
                this.settlementController.Settings.ResourceMining.MiningRadius
            );
            
            let expandLocation = new SettlementClusterLocation(
                expand, 
                MaraRect.CreateFromPoint(expand, radius)
            );

            result.push(expandLocation);
        }

        return result;
    }

    private getRetreatLocations(): Array<SettlementClusterLocation> {
        return this.getPullbackLocations();
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
        let defendingSquadGroup: Array<MaraControllableSquad> = [];

        let settlementLocation = this.settlementController.GetSettlementLocation();

        if (!settlementLocation) { //everything is lost :(
            return;
        }

        for (let squad of this.allSquads) {
            if (!settlementLocation.BoundingRect.IsPointInside(squad.GetLocation().Point)) {
                continue;
            }
            
            defendingSquadGroup.push(squad);
            accumulatedStrength += squad.Strength;

            if (accumulatedStrength > attackerStrength) {
                // if accumulated strength is less than attacker's, this won't fire and squads of the last batch shall do nothing
                for (let squad of defendingSquadGroup) {
                    squad.Attack([attackerLocation.Point]);
                }
                
                attackerIndex++;

                if (attackerIndex == attackers.length) {
                    return;
                }

                attackerLocation = attackers[attackerIndex].GetLocation();
                attackerStrength = attackers[attackerIndex].Strength;
                accumulatedStrength = 0;
                defendingSquadGroup = [];
            }
        }
    }
}