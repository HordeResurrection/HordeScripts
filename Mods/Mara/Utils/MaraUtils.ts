import { Mara, MaraLogLevel } from "Mara/Mara";
import { MaraSquad } from "Mara/Subcontrollers/Squads/MaraSquad";
import { createBox, createPoint } from "library/common/primitives";
import { UnitFlags, UnitCommand, AllContent } from "library/game-logic/horde-types";
import { UnitProfession } from "library/game-logic/unit-professions";
import { AssignOrderMode, PlayerVirtualInput, VirtualSelectUnitsMode } from "library/mastermind/virtual-input";
import { enumerate, eNext } from "./Common";
import { generateCellInSpiral } from "library/common/position-tools";

export class MaraSettlementData {
    public Settlement: any;
    public MasterMind: any;
    public Player: any;

    constructor(settlement, masterMind, player) {
        this.Settlement = settlement;
        this.MasterMind = masterMind;
        this.Player = player;
    }
}

const DEFAULT_UNIT_SEARCH_RADIUS = 3;

class DotnetHolder {
    private static realScena;
    
    public static get RealScena() {
        if (!DotnetHolder.realScena) {
            DotnetHolder.realScena = ActiveScena.GetRealScena();
        }

        return DotnetHolder.realScena;
    }

    private static unitsMap;
    
    public static get UnitsMap() {
        if (!DotnetHolder.unitsMap) {
            DotnetHolder.unitsMap = ActiveScena.GetRealScena().UnitsMap;
        }
        
        return DotnetHolder.unitsMap;
    }

    private static landscapeMap;
    
    public static get LandscapeMap() {
        if (!DotnetHolder.landscapeMap) {
            DotnetHolder.landscapeMap = ActiveScena.GetRealScena().LandscapeMap;
        }
        
        return DotnetHolder.landscapeMap;
    }
}

export class MaraProfiler {
    private message: string;
    private callCount: number;
    private executionTime: number;

    constructor(message: string) {
        this.message = message;
        this.callCount = 0;
        this.executionTime = 0;
    }

    public Print(): void {
        Mara.Debug(this.message + ` took ${this.executionTime} ms, call count: ${this.callCount}`);
    }

    public Profile(call: () => void): void {
        let startTime = Date.now();
        call();
        this.executionTime += Date.now() - startTime;
        this.callCount++;
    }
}

let TileType = HCL.HordeClassLibrary.HordeContent.Configs.Tiles.Stuff.TileType;
export type UnitComposition = Map<string, number>;

export class MaraUtils {
    static GetSettlementsSquadsFromUnits(
        units: Array<any>, 
        settlements: Array<any>,
        radius: number = DEFAULT_UNIT_SEARCH_RADIUS,
        unitFilter?: (unit: any) => boolean
    ): Array<MaraSquad> {
        let processedUnitIds = new Set<number>();
        let result: Array<MaraSquad> = [];
        
        for (let unit of units) {
            if (processedUnitIds.has(unit.Id)) {
                continue;
            }

            let squad = MaraUtils.constructMaraSquad(unit, processedUnitIds, settlements, radius, unitFilter);
            result.push(squad);
        }

        return result;
    }
    
    private static constructMaraSquad(
        unit: any,
        processedUnitIds: Set<number>, 
        settlements: Array<any>,
        radius: number = DEFAULT_UNIT_SEARCH_RADIUS,
        unitFilter?: (unit: any) => boolean
    ): MaraSquad {
        let unitSettlement = unit.Owner;
        
        let newUnits: any[] = [unit];
        let currentUnits: any[] = [];
        let units: any[] = [];

        do {
            units.push(...newUnits);
            currentUnits = [...newUnits];
            
            newUnits = [];
            let newUnitIds = new Set<number>();

            for (let curUnit of currentUnits) {
                if (processedUnitIds.has(curUnit.Id)) {
                    continue;
                }

                processedUnitIds.add(curUnit.Id);

                let friends = MaraUtils.GetSettlementUnitsInArea(curUnit.CellCenter, radius, settlements, unitFilter);

                friends = friends.filter((unit) => {
                    return  unit.Owner === unitSettlement && 
                        !processedUnitIds.has(unit.Id) &&
                        currentUnits.indexOf(unit) == -1
                });

                for (let friend of friends) {
                    if (!newUnitIds.has(friend.Id)) {
                        newUnits.push(friend);
                        newUnitIds.add(friend.Id);
                    }
                }
            }
        }
        while (newUnits.length > 0);

        return new MaraSquad(units);
    }
    
    static GetSettlementUnitsInArea(
        cell: any, 
        radius: number, 
        enemySettelements: Array<any>,
        unitFilter?: (unit: any) => boolean
    ): Array<any> {
        let units = MaraUtils.GetUnitsInArea(cell, radius, unitFilter);
        let enemies = units.filter((unit) => {
            return enemySettelements.indexOf(unit.Owner) > -1 && unit.IsAlive && unit.Cfg.HasNotFlags(UnitFlags.Passive)
        });

        return enemies;
    }

    // This has neat side effect that resulting cells are ordered from closest to farthest from center
    static FindCells(
        center: {X: number; Y: number;}, 
        radius: number, 
        filter: (cell: any) => boolean
    ): Array<any> {
        let result: any[] = [];
        
        let generator = generateCellInSpiral(center.X, center.Y);
        let cell: any;
        for (cell = generator.next(); !cell.done; cell = generator.next()) {
            if (MaraUtils.ChebyshevDistance(cell.value, center) > radius) {
                return result;
            }

            if ( filter(cell.value) ) {
                result.push(cell.value);
            }
        }

        return result;
    }
    
    static GetTileType(point: {X: number; Y: number;}): any {
        if (
            0 <= point.X && point.X < DotnetHolder.RealScena.Size.Width &&
            0 <= point.Y && point.Y < DotnetHolder.RealScena.Size.Height
        ) {
            let tile = DotnetHolder.LandscapeMap.Item.get(point.X, point.Y);

            return tile.Cfg.Type;
        }
        else {
            return null;
        }
    }
    
    static GetUnitsInArea(cell: any, radius: number, unitFilter?: (unit: any) => boolean): Array<any> {
        let box = createBox(cell.X - radius, cell.Y - radius, 0, cell.X + radius, cell.Y + radius, 2);
        let unitsInBox = ScriptUtils.Invoke(DotnetHolder.RealScena.UnitsMap.UnitsTree, "GetUnitsInBox", box);
        let count = ScriptUtils.GetValue(unitsInBox, "Count");
        let units = ScriptUtils.GetValue(unitsInBox, "Units");

        let unitsIds = new Set<number>();
        let result = new Array<any>();

        for (let index = 0; index < count; ++index) {
            let unit = units[index];

            if (unit == null) {
                continue;
            }

            if (unitsIds.has(unit.Id)) {
                continue;
            }

            if (unitFilter && !unitFilter(unit)) {
                continue;
            }

            unitsIds.add(unit.Id);
            result.push(unit);
        }

        return result;
    }
    
    static PrintMap(map: UnitComposition) {
        map.forEach(
            (value, key, m) => {
                Mara.Log(MaraLogLevel.Debug, `${key}: ${value}`);
            }
        )
    }
    
    static IncrementMapItem(map: UnitComposition, key: string): void {
        MaraUtils.AddToMapItem(map, key, 1);
    }

    static AddToMapItem(map: UnitComposition, key: string, value: number): void {
        if (map.has(key)) {
            map.set(key, (map.get(key) ?? 0) + value);
        }
        else {
            map.set(key, value);
        }
    }

    static SubstractCompositionLists(
        minuend: UnitComposition, 
        subtrahend: UnitComposition
    ): UnitComposition {
        let newList = new Map<string, number>();

        minuend.forEach(
            (value, key, map) => {
                if (subtrahend.has(key)) {
                    let newCount = value - (subtrahend.get(key) ?? 0);
                    
                    if (newCount > 0) {
                        newList.set(key, newCount);
                    }
                }
                else {
                    newList.set(key, value);
                }
            }
        );

        return newList;
    }
    
    static SetContains(
        set: UnitComposition, 
        subset: UnitComposition
    ): boolean {
        let isContain = true;

        subset.forEach( //using forEach here because keys(), values() or entries() return empty iterators for some reason
            (val, key, m) => {
                if ( !set.has(key) ) {
                    isContain = false;
                }
                else if ((set.get(key) ?? 0) < val) {
                    isContain = false;
                }    
            }
        )

        return isContain;
    }

    static GetAllSettlements(): Array<any> {
        let result: Array<any> = [];

        for (let player of Players) {
            result.push(player.GetRealPlayer().GetRealSettlement());
        }
        
        return result;
    }

    static GetAllPlayers(): Array<{index: string, player: any}> {
        let result: Array<any> = [];

        for (let i in Players) {
            let player = Players[i];
            result.push({index: i, player: player});
        }
        
        return result;
    }

    static GetSettlementData(playerId: string): MaraSettlementData | null {
        let realPlayer = Players[playerId].GetRealPlayer();
        if (!realPlayer) {
            return null;
        }

        let settlement = realPlayer.GetRealSettlement();
        let masterMind = ScriptUtils.GetValue(realPlayer, "MasterMind");

        return new MaraSettlementData(settlement, masterMind, realPlayer);
    }

    static GetUnit(cell: any): any {
        let unitsMap = DotnetHolder.UnitsMap;
        return unitsMap.GetUpperUnit(cell.X, cell.Y);
    }

    // finds a free cell nearest to given
    static FindFreeCell(point): any {
        let unitsMap = DotnetHolder.UnitsMap;
        
        let generator = generateCellInSpiral(point.X, point.Y);
        let cell: any;
        for (cell = generator.next(); !cell.done; cell = generator.next()) {
            let unit = unitsMap.GetUpperUnit(cell.value.X, cell.value.Y);
            if (!unit) {
                return {X: cell.value.X, Y: cell.value.Y};
            }
        }

        return null;
    }

    static IssueAttackCommand(unit: any, player: any, location: any, isReplaceMode: boolean = true) {
        MaraUtils.issueCommand(unit, player, location, UnitCommand.Attack, isReplaceMode);
    }

    static IssueMoveCommand(unit: any, player: any, location: any, isReplaceMode: boolean = true) {
        MaraUtils.issueCommand(unit, player, location, UnitCommand.MoveToPoint, isReplaceMode);
    }

    private static issueCommand(unit: any, player: any, location: any, command: any, isReplaceMode: boolean = true) {
        let mode = isReplaceMode ? AssignOrderMode.Replace : AssignOrderMode.Queue;
        
        if (!(player in MaraUtils.playersInput)) {
            MaraUtils.playersInput[player] = new PlayerVirtualInput(player);
        }

        let virtualInput = MaraUtils.playersInput[player];
        virtualInput.selectUnitsById([unit.Id], VirtualSelectUnitsMode.Select);
        virtualInput.pointBasedCommand(createPoint(location.X, location.Y), command, mode);
        virtualInput.commit();
    }
    static playersInput = {};

    static Random(masterMind: any, max: number, min: number = 0) {
        let rnd = masterMind.Randomizer;
        return rnd.RandomNumber(min, max);
    }

    static GetUnitConfig(configId: string): any {
        return HordeContentApi.GetUnitConfig(configId);
    }

    static RequestMasterMindProduction(configId: string, productionDepartment: any, checkDuplicate: boolean = false) {
        let cfg = MaraUtils.GetUnitConfig(configId);
        
        return productionDepartment.AddRequestToProduce(cfg, 1, null, checkDuplicate);
    }

    static ConfigHasProfession(unitConfig: any, profession: any): boolean {
        let professionParams = unitConfig.GetProfessionParams(profession, true);

        return (professionParams != null);
    }

    static ChebyshevDistance(cell1: any, cell2: any): number {
        const xDiff = Math.abs(cell1.X - cell2.X);
        const yDiff = Math.abs(cell1.Y - cell2.Y);

        return Math.max(xDiff, yDiff);
    }

    static ForestCellFilter(cell: any): boolean {
        let unit = DotnetHolder.UnitsMap.GetUpperUnit(cell.X, cell.Y);

        if (unit) {
            return false;
        }

        let tileType = MaraUtils.GetTileType({X: cell.X, Y: cell.Y});

        return tileType == TileType.Forest;
    }

    static ForEachCell(center: any, radius: any, action: (cell: any) => void): void {
        let endRow = Math.min(center.Y + radius, DotnetHolder.RealScena.Size.Height);
        let endCol = Math.min(center.X + radius, DotnetHolder.RealScena.Size.Width)
        
        for (
            let row = Math.max(center.Y - radius, 0);
            row <= endRow;
            row++
        ) {
            for (
                let col = Math.max(center.X - radius, 0);
                col <= endCol;
                col++
            ) {
                action({X: col, Y: row});
            }
        }
    }

    static IsCellReachable(cell: any, unit: any): boolean {
        return unit.MapMind.CheckPathTo(createPoint(cell.X, cell.Y), false).Found;
    }

    static GetUnitTarget(unit: any): any {
        let action = unit.OrdersMind.ActiveAct;

        if (!action) {
            return null;
        }
        
        if (
            action.GetType() != 
                ScriptUtils.GetTypeByName("HordeClassLibrary.UnitComponents.OrdersSystem.Acts.ActAttackUnit", "HordeClassLibrary")
        ) {
            return null;
        }
        else {
            return action.Target;
        }
    }

    static GetUnitPathLength(unit: any): number | null {
        let action = unit.OrdersMind.ActiveAct;

        if (!action) {
            return null;
        }
        
        if (
            action.GetType() == 
                ScriptUtils.GetTypeByName("HordeClassLibrary.UnitComponents.OrdersSystem.Acts.ActMoveTo", "HordeClassLibrary")
        ) {
            return action.Solution?.Count;
        }
        else {
            return null;
        }
    }

    static IsSettlementDefeated(settlement: any): boolean {
        return settlement.Existence.IsTotalDefeat || settlement.Existence.IsAlmostDefeat;
    }

    static IsCombatConfig(unitConfig: any): boolean {
        let mainArmament = unitConfig.MainArmament;
        let isHarvester = MaraUtils.ConfigHasProfession(unitConfig, UnitProfession.Harvester);

        return mainArmament != null && !isHarvester;
    }

    static IsProducerConfig(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId);
        
        return MaraUtils.ConfigHasProfession(cfg, UnitProfession.UnitProducer);
    }

    static IsTechConfig(cfgId: string): boolean {
        let unitConfigs = enumerate(AllContent.UnitConfigs.Configs);
        let kv;
        
        while ((kv = eNext(unitConfigs)) !== undefined) {
            let config = kv.Value;

            let productionRequirements = enumerate(config.TechConfig?.Requirements);
            let requirementConfig;

            while ((requirementConfig = eNext(productionRequirements)) !== undefined) {
                if (requirementConfig.Uid == cfgId) {
                    return true;
                }
            }
        }
        
        return false;
    }

    static GetUnitStrength(unit: any): number {
        if (this.IsCombatConfig(unit.Cfg) && unit.IsAlive) {
            return Math.max(unit.Health, 0);
        }
        else {
            return 0;
        }
    }

    static GetConfigStrength(unitConfig: any): number {
        if (MaraUtils.IsCombatConfig(unitConfig)) {
            return unitConfig.MaxHealth;
        }
        else {
            return 0;
        }
    }

    static IsPointsEqual(point1: any, point2: any): boolean {
        return point1.X == point2.X && point1.Y == point2.Y;
    }

    static IsNetworkMode(): boolean {
        let NetworkController = HordeEngine.HordeResurrection.Engine.Logic.Main.NetworkController;
        
        return NetworkController.NetWorker != null;
    }

    static SetValue(object: any, propertyName: string, newValue: any): void {
        ScriptUtils.SetValue(object, propertyName, newValue);
    }
}