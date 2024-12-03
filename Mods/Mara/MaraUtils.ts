import { Mara, MaraLogLevel } from "Mara/Mara";
import { MaraSquad } from "Mara/Subcontrollers/Squads/MaraSquad";
import { createPoint } from "library/common/primitives";
import { UnitFlags, UnitCommand, AllContent, UnitConfig, UnitQueryFlag, UnitSpecification, DrawLayer, FontUtils, GeometryCanvas, Stride_Color, Stride_Vector2 } from "library/game-logic/horde-types";
import { UnitProfession } from "library/game-logic/unit-professions";
import { AssignOrderMode, PlayerVirtualInput, VirtualSelectUnitsMode } from "library/mastermind/virtual-input";
import { MaraProductionRequest } from "./Common/MaraProductionRequest";
import { MaraPoint } from "./Common/MaraPoint";
import { generateCellInSpiral } from "library/common/position-tools";
import { ProduceRequest, ProduceRequestParameters } from "library/mastermind/matermind-types";
import { enumerate, eNext } from "library/dotnet/dotnet-utils";
import { MaraSettlementData } from "./Common/Settlement/MaraSettlementData";
import { AllowedCompositionItem } from "./Common/AllowedCompositionItem";
import { NonUniformRandomSelectItem } from "./Common/NonUniformRandomSelectItem";
import { UnitComposition } from "./Common/UnitComposition";
import { MaraRect } from "./Common/MaraRect";
import { spawnGeometry, spawnString } from "library/game-logic/decoration-spawn";
import { MaraUnitCache } from "./Common/Cache/MaraUnitCache";
import { MaraUnitConfigCache } from "./Common/Cache/MaraUnitConfigCache";
import { MaraUnitCacheItem } from "./Common/Cache/MaraUnitCacheItem";

const DEFAULT_UNIT_SEARCH_RADIUS = 3;

const AlmostDefeatCondition = HCL.HordeClassLibrary.World.Settlements.Existence.AlmostDefeatCondition;
const ResourceType = HCL.HordeClassLibrary.World.Objects.Tiles.ResourceTileType;
const GeometryPresets = HCL.HordeClassLibrary.World.Geometry.GeometryPresets;

export const BuildTrackerType = xHost.type(ScriptUtils.GetTypeByName("HordeResurrection.Intellect.Requests.Trackers.UnitProducing.BuildTracker", "HordeResurrection.Intellect"));

export { AlmostDefeatCondition }
export { ResourceType }

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
            DotnetHolder.unitsMap = DotnetHolder.RealScena.UnitsMap;
        }
        
        return DotnetHolder.unitsMap;
    }

    private static landscapeMap;
    
    public static get LandscapeMap() {
        if (!DotnetHolder.landscapeMap) {
            DotnetHolder.landscapeMap = DotnetHolder.RealScena.LandscapeMap;
        }
        
        return DotnetHolder.landscapeMap;
    }

    private static resourceMap;

    public static get ResourceMap() {
        if (!DotnetHolder.resourceMap) {
            DotnetHolder.resourceMap = DotnetHolder.RealScena.ResourcesMap;
        }
        
        return DotnetHolder.resourceMap;
    }
}

export class MaraUtils {
    //#region Horde Data
    static GetScena(): any {
        return DotnetHolder.RealScena;
    }

    static GetScenaWidth(): number {
        return DotnetHolder.RealScena.Size.Width;
    }

    static GetScenaHeigth(): number {
        return DotnetHolder.RealScena.Size.Height;
    }

    static GetCellResourceData(x: number, y: number): any {
        return DotnetHolder.ResourceMap.Item.get(x, y);
    }

    static GetAllSettlements(): Array<any> {
        let result: Array<any> = [];

        ForEach(
            DotnetHolder.RealScena.Settlements,
            (s) => result.push(s)
        );
        
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

    static IsSettlementDefeated(settlement: any): boolean {
        return settlement.Existence.IsTotalDefeat || settlement.Existence.IsAlmostDefeat;
    }

    static MakeAllowedCfgItems(cfgIds: string[], currentComposition: UnitComposition, settlement: any): AllowedCompositionItem[] {
        let allowedCfgItems = new Array<AllowedCompositionItem>();
        
        for (let cfgId of cfgIds) {
            let cfg = MaraUtils.GetUnitConfig(cfgId);
            
            let currentUnitCount = currentComposition.get(cfgId) ?? 0;
            let unitCountLimit = settlement.RulesOverseer.GetCurrentLimitForUnit(cfg) ?? Infinity;
            let maxUnitCount = Math.max(unitCountLimit - currentUnitCount, 0);

            if (maxUnitCount > 0) {
                allowedCfgItems.push(new AllowedCompositionItem(cfg, maxUnitCount));
            }
        }

        return allowedCfgItems;
    }

    static GetSettlementCensusModel(settlement: any): any {
        return ScriptUtils.GetValue(settlement.Census, "Model");
    }
    //#endregion
    
    //#region Squads and Unit Search
    static GetSettlementsSquadsFromUnits(
        units: Array<MaraUnitCacheItem>, 
        settlements: Array<any>,
        unitFilter?: (unit: MaraUnitCacheItem) => boolean,
        radius: number = DEFAULT_UNIT_SEARCH_RADIUS,
    ): Array<MaraSquad> {
        let processedUnitIds = new Set<number>();
        let result: Array<MaraSquad> = [];
        
        for (let unit of units) {
            if (processedUnitIds.has(unit.UnitId)) {
                continue;
            }

            let squad = MaraUtils.constructMaraSquad(unit, processedUnitIds, settlements, radius, unitFilter);

            if (squad.Units.length > 0) {
                result.push(squad);
            }
        }

        return result;
    }
    
    private static constructMaraSquad(
        unit: MaraUnitCacheItem,
        processedUnitIds: Set<number>, 
        settlements: Array<any>,
        radius: number = DEFAULT_UNIT_SEARCH_RADIUS,
        unitFilter?: (unit: MaraUnitCacheItem) => boolean
    ): MaraSquad {
        let unitSettlement = unit.UnitOwner;

        let newUnitsPresent = true;
        let currentSquad = new MaraSquad([unit]);
        
        while (newUnitsPresent) {
            let squadLocation = currentSquad.GetLocation();
            let newRadius = radius + Math.round(squadLocation.Spread / 2);

            let newUnits = MaraUtils.GetSettlementUnitsAroundPoint(
                squadLocation.SpreadCenter, 
                newRadius,
                settlements,
                unitFilter
            );

            newUnits = newUnits.filter((cacheItem) => {
                return cacheItem.UnitOwner == unitSettlement && 
                    !processedUnitIds.has(cacheItem.UnitId)
            });

            if (newUnits.length == currentSquad.Units.length) {
                newUnitsPresent = false;
            }
            else {
                currentSquad = new MaraSquad(newUnits);
            }
        }

        for (let unit of currentSquad.Units) {
            processedUnitIds.add(unit.UnitId);
        }

        return currentSquad;
    }

    static GetSettlementUnitsAroundPoint(
        point: any,
        radius: number,
        settelements?: Array<any>,
        unitFilter?: (unit: MaraUnitCacheItem) => boolean,
        includeUnalive?: boolean
    ): Array<MaraUnitCacheItem> {
        return MaraUtils.GetSettlementUnitsInArea(
            MaraRect.CreateFromPoint(new MaraPoint(point.X, point.Y), radius),
            settelements,
            unitFilter,
            includeUnalive
        );
    }
    
    static GetSettlementUnitsInArea(
        rect: MaraRect,
        settelements?: Array<any>,
        unitFilter?: (unit: MaraUnitCacheItem) => boolean,
        includeUnalive?: boolean
    ): Array<MaraUnitCacheItem> {
        let units: Array<MaraUnitCacheItem>;

        if (settelements) {
            units = MaraUnitCache.GetSettlementsUnitsInArea(rect, settelements, unitFilter);
        }
        else {
            units = MaraUnitCache.GetAllUnitsInArea(rect, unitFilter);
        }

        units = units.filter((cacheItem) => {
            return (
                (cacheItem.Unit.IsAlive || includeUnalive) && 
                MaraUtils.IsActiveConfigId(cacheItem.UnitCfgId)
            );
        });

        return units;
    }

    static GetAllSettlementUnits(settlement: any): Array<MaraUnitCacheItem> {
        return MaraUnitCache.GetAllSettlementUnits(settlement);
    }

    static GetUnitsAroundPoint(point: any, radius: number, unitFilter?: (unit: MaraUnitCacheItem) => boolean): Array<MaraUnitCacheItem> {
        return MaraUtils.GetUnitsInArea(
            MaraRect.CreateFromPoint(new MaraPoint(point.X, point.Y), radius),
            unitFilter
        );
    }
    
    static GetUnitsInArea(rect: MaraRect, unitFilter?: (unit: MaraUnitCacheItem) => boolean): Array<MaraUnitCacheItem> {
        return MaraUnitCache.GetAllUnitsInArea(rect, unitFilter);
    }

    static GetUnit(cell: any): MaraUnitCacheItem | null {
        let point = new MaraPoint(cell.X, cell.Y);
        let rect = new MaraRect(point, point);
        
        let cacheItems = MaraUnitCache.GetAllUnitsInArea(rect);

        if (cacheItems.length > 0) {
            let upperUnit = MaraUtils.FindExtremum(cacheItems, (a, b) => {return a.UnitMapLayer - b.UnitMapLayer})!;
            
            return upperUnit;
        }
        else {
            return null;
        }
    }
    //#endregion
    
    //#region Cells & Tiles
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

    static GetBoundingRect(points: Array<MaraPoint>): MaraRect {
        let topPoint: MaraPoint = new MaraPoint(Infinity, Infinity);
        let bottomPoint: MaraPoint = new MaraPoint(0, 0);
        let leftPoint: MaraPoint = new MaraPoint(Infinity, Infinity);
        let rightPoint: MaraPoint = new MaraPoint(0, 0);

        for (let point of points) {
            if (point.Y < topPoint.Y) {
                topPoint = point;
            }

            if (point.X < leftPoint.X) {
                leftPoint = point;
            }

            if (point.Y > bottomPoint.Y) {
                bottomPoint = point;
            }

            if (point.X > rightPoint.X) {
                rightPoint = point;
            }
        }

        return new MaraRect(
            new MaraPoint(leftPoint.X, topPoint.Y),
            new MaraPoint(rightPoint.X, bottomPoint.Y)
        );
    }

    static GetUnitsBoundingRect(units: Array<MaraUnitCacheItem>): MaraRect {
        let topPoint: MaraPoint = new MaraPoint(Infinity, Infinity);
        let bottomPoint: MaraPoint = new MaraPoint(0, 0);
        let leftPoint: MaraPoint = new MaraPoint(Infinity, Infinity);
        let rightPoint: MaraPoint = new MaraPoint(0, 0);

        for (let unit of units) {
            if (unit.UnitCell.Y < topPoint.Y) {
                topPoint = unit.UnitCell;
            }

            if (unit.UnitCell.X < leftPoint.X) {
                leftPoint = unit.UnitCell;
            }

            if (unit.UnitRect.BottomRight.Y > bottomPoint.Y) {
                bottomPoint = unit.UnitRect.BottomRight;
            }

            if (unit.UnitRect.BottomRight.X > rightPoint.X) {
                rightPoint = unit.UnitRect.BottomRight;
            }
        }

        return new MaraRect(
            new MaraPoint(leftPoint.X, topPoint.Y),
            new MaraPoint(rightPoint.X, bottomPoint.Y)
        );
    }

    static FindClosestCell(
        center: {X: number; Y: number;}, 
        radius: number, 
        predicate: (cell: any) => boolean
    ): MaraPoint | null {
        let generator = generateCellInSpiral(center.X, center.Y);
        let cell: any;

        for (cell = generator.next(); !cell.done; cell = generator.next()) {
            if (MaraUtils.ChebyshevDistance(cell.value, center) > radius) {
                return null;
            }

            if ( predicate(cell.value) ) {
                return new MaraPoint(cell.value.X, cell.value.Y);
            }
        }

        return null;
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

    // finds a free cell nearest to given
    static FindFreeCell(point: any): any {
        let generator = generateCellInSpiral(point.X, point.Y);
        let cell: any;

        for (cell = generator.next(); !cell.done; cell = generator.next()) {
            let unit = MaraUtils.GetUnit(cell.value);
            
            if (!unit) {
                let resultCell = cell.value;
                let neighbors = MaraUtils.GetUnitsAroundPoint(resultCell, 1);

                let isTargetedCell = false;

                for (let neighbor of neighbors) {
                    if (neighbor.Unit.MoveToCell) {
                        if (
                            neighbor.Unit.MoveToCell.X == resultCell.X && 
                            neighbor.Unit.MoveToCell.Y == resultCell.Y
                        ) {
                            isTargetedCell = true;
                            break;
                        }
                    }
                }
                
                if (!isTargetedCell) {
                    return {X: resultCell.X, Y: resultCell.Y};
                }
            }
        }

        return null;
    }

    static ForEachCell(center: any, radius: any, action: (cell: any) => void): void {
        let endRow = Math.min(center.Y + radius, DotnetHolder.RealScena.Size.Height - 1);
        let endCol = Math.min(center.X + radius, DotnetHolder.RealScena.Size.Width - 1);
        
        for (
            let row = Math.max(center.Y - radius, 0);
            row <= endRow;
            row ++
        ) {
            for (
                let col = Math.max(center.X - radius, 0);
                col <= endCol;
                col ++
            ) {
                action({X: col, Y: row});
            }
        }
    }

    static WaveOverCells(
        cells: MaraPoint[], 
        waveContinueCondition: (cell: MaraPoint, neighbourCell: MaraPoint) => boolean,
        onFrontFinish: (cells: MaraPoint[]) => void,
        onWaveFinish: (cells: MaraPoint[]) => void
    ): void {
        let cellsIndex = new Set(cells.map((cell) => cell.ToString()));
        let processedCells = new Set<string>();
        
        for (let initialCell of cells) {
            if (!waveContinueCondition(initialCell, initialCell)) {
                continue;
            }
            
            let nextCells: Array<MaraPoint> = [initialCell];
            let waveCells: Array<MaraPoint> = [];
    
            while (nextCells.length > 0) {
                let currentCells = [...nextCells];
                nextCells = [];
                let curIterationCells: MaraPoint[] = [];
    
                for (let cell of currentCells) {
                    let cellStr = cell.ToString();
                    
                    if (processedCells.has(cellStr)) {
                        continue;
                    }
    
                    processedCells.add(cellStr);
    
                    if (cellsIndex.has(cellStr)) {
                        curIterationCells.push(cell);
    
                        MaraUtils.ForEachCell(
                            cell, 
                            1, 
                            (nextCell) => {
                                let point = new MaraPoint(nextCell.X, nextCell.Y);
    
                                if (
                                    cellsIndex.has(point.ToString()) && 
                                    !processedCells.has(point.ToString()) &&
                                    point.X == cell.X || point.Y == cell.Y
                                ) {
                                    if (waveContinueCondition(cell, point)) {
                                        nextCells.push(point);
                                    }
                                }
                            }
                        );
                    }
                }
    
                onFrontFinish(curIterationCells);
                waveCells.push(...curIterationCells);
            }
    
            onWaveFinish(waveCells);
        }
    }
    //#endregion
    
    //#region Unit Composition Data Structure
    static PrintMap(map: UnitComposition): void {
        map.forEach(
            (value, key, m) => {
                Mara.Log(MaraLogLevel.Debug, `${key}: ${value}`);
            }
        )
    }

    static IncrementMapItem(map: UnitComposition, key: string): void {
        MaraUtils.AddToMapItem(map, key, 1);
    }

    static DecrementMapItem(map: UnitComposition, key: string): void {
        if (map.has(key)) {
            map.set(key, Math.max(map.get(key)! - 1, 0));
        }
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
    //#endregion
    
    //#region RNG Utils
    static Random(masterMind: any, max: number, min: number = 0) {
        let rnd = masterMind.Randomizer;
        return rnd.RandomNumber(min, max);
    }

    static RandomSelect<Type>(masterMind: any, items: Array<Type>): Type | null {
        let index = 0; 
        
        if (items.length == 0) {
            return null;
        } 
        else if (items.length > 1) {
            index = MaraUtils.Random(masterMind, items.length - 1);
        }

        return items[index];
    }

    static NonUniformRandomSelect<Type extends NonUniformRandomSelectItem>(
        masterMind: any, 
        items:Array<Type>
    ): Type | null {
        if (items.length == 0) {
            return null;
        }
        
        let upperBound = 0;

        for (let item of items) {
            upperBound += item.Weight;
        }

        let pick = MaraUtils.Random(masterMind, upperBound);

        let accumulatedBound = 0;

        for (let item of items) {
            accumulatedBound += item.Weight;

            if (pick <= accumulatedBound) {
                return item;
            }
        }

        return items[0];
    }
    //#endregion
    
    //#region Tech Chain
    private static techGetter(cfg: any, settlement: any): any {
        return settlement.TechTree.GetUnmetRequirements(cfg);
    }
    
    private static productionGetter(cfg: any, settlement: any): any {
        let listType = xHost.type('System.Collections.Generic.List');
        let configType = UnitConfig;
        let list = host.newObj(listType(configType), 0);
    
        settlement.TechTree.HypotheticalProducts.WhoCanProduce(cfg, list);
    
        return list;
    }
    
    private static getChain(cfg: any, settlement: any, chain: Map<string, any>, nextLevelGetter: (cfg: any, settlement: any) => Array<any>): void {
        let nextLevel = nextLevelGetter(cfg, settlement);
    
        ForEach(nextLevel, (item) => {
                if (!chain.has(item.Uid)) {
                    chain.set(item.Uid, item);
                    MaraUtils.getChain(item, settlement, chain, nextLevelGetter);
                }
            }
        );
    }
    
    public static GetCfgIdProductionChain(cfgId: string, settlement: any): Array<any> {
        let chain = new Map<string, any>();
        let config = MaraUtils.GetUnitConfig(cfgId);
    
        MaraUtils.getChain(config, settlement, chain, MaraUtils.productionGetter);
    
        if (chain.size == 0) {
            return [];
        }
    
        MaraUtils.getChain(config, settlement, chain, MaraUtils.techGetter);
    
        return Array.from(chain.values());
    }
    //#endregion
    
    //#region Unit Commands
    static IssueAttackCommand(
        units: Array<MaraUnitCacheItem>, 
        player: any, 
        location: any, 
        isReplaceMode: boolean = true, 
        ignoreUnits: boolean = true
    ): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.Attack, isReplaceMode, ignoreUnits);
    }

    static IssueMoveCommand(units: Array<MaraUnitCacheItem>, player: any, location: any, isReplaceMode: boolean = true): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.MoveToPoint, isReplaceMode);
    }

    static IssueCaptureCommand(units: Array<MaraUnitCacheItem>, player: any, location: any, isReplaceMode: boolean = true): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.Capture, isReplaceMode);
    }

    static IssueHarvestLumberCommand(units: Array<MaraUnitCacheItem>, player: any, location: any, isReplaceMode: boolean = true): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.HarvestLumber, isReplaceMode);
    }

    static IssueMineCommand(units: Array<MaraUnitCacheItem>, player: any, location: any, isReplaceMode: boolean = true): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.Mine, isReplaceMode);
    }

    static IssueSelfDestructCommand(units: Array<MaraUnitCacheItem>, player: any) {
        MaraUtils.issueOneClickCommand(units, player, UnitCommand.DestroySelf);
    }

    private static issueOneClickCommand(units: Array<MaraUnitCacheItem>, player: any, command: any): void {
        let virtualInput = MaraUtils.playersInput[player];
        
        if (!virtualInput) {
            virtualInput = new PlayerVirtualInput(player);
            MaraUtils.playersInput[player] = virtualInput;
        }

        let unitIds = units.map((unit) => unit.UnitId);
        virtualInput.selectUnitsById(unitIds, VirtualSelectUnitsMode.Select);
        virtualInput.oneClickCommand(command);
    }

    private static issuePointBasedCommand(
        units: Array<MaraUnitCacheItem>, 
        player: any, 
        location: any, 
        command: any, 
        isReplaceMode: boolean = true,
        ignoreUnits: boolean = false
    ): void {
        let virtualInput = MaraUtils.playersInput[player];
        
        if (!virtualInput) {
            virtualInput = new PlayerVirtualInput(player);
            MaraUtils.playersInput[player] = virtualInput;
        }

        let mode = isReplaceMode ? AssignOrderMode.Replace : AssignOrderMode.Queue;
        let unitIds = units.map((unit) => unit.UnitId);
        
        virtualInput.selectUnitsById(unitIds, VirtualSelectUnitsMode.Select);
        virtualInput.pointBasedCommand(createPoint(location.X, location.Y), command, mode, ignoreUnits);
        virtualInput.commit();
    }

    private static playersInput = {};
    //#endregion
    
    //#region Pathfinding
    static IsCellReachable(cell: any, unit: MaraUnitCacheItem): boolean {
        return unit.Unit.MapMind.CheckPathTo(createPoint(cell.X, cell.Y), false).Found;
    }

    static IsPathExists(fromCell: MaraPoint, toCell: MaraPoint, unitCfg: any, pathFinder: any): boolean {
        let from = createPoint(fromCell.X, fromCell.Y);
        let to = createPoint(toCell.X, toCell.Y);
        
        return pathFinder.checkPath(unitCfg, from, to);
    }
    //#endregion
    
    //#region Unit Properties
    static GetUnitTarget(unit: MaraUnitCacheItem): any {
        let action = unit.Unit.OrdersMind.ActiveAct;

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

    static GetUnitPathLength(unit: MaraUnitCacheItem): number | null {
        let action = unit.Unit.OrdersMind.ActiveAct;

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

    static GetUnitStrength(unit: MaraUnitCacheItem): number {
        let maxStrength = MaraUtils.GetConfigIdStrength(unit.UnitCfgId);
        let maxHealth = MaraUtils.GetConfigIdMaxHealth(unit.UnitCfgId);

        return maxStrength * (unit.Unit.Health / maxHealth);
    }

    static CanAttack(sourceUnit: MaraUnitCacheItem, targetUnit: MaraUnitCacheItem): boolean {
        let sourceCfgId = sourceUnit.UnitCfgId;
        let targetCfgId = targetUnit.UnitCfgId;

        let result: boolean | undefined = MaraUnitConfigCache.GetCanAttack(sourceCfgId, targetCfgId);

        if (result == undefined) {
            result = sourceUnit.Unit.BattleMind.CanAttackTarget(targetUnit.Unit);
            MaraUnitConfigCache.SetCanAttack(sourceCfgId, targetCfgId, result as boolean);
        }

        return result!;
    }
    //#endregion
    
    //#region Unit Configs
    static GetUnitConfig(configId: string): any {
        return HordeContentApi.GetUnitConfig(configId);
    }

    private static configHasProfession(unitConfig: any, profession: any): boolean {
        let professionParams = unitConfig.GetProfessionParams(profession, true);

        return (professionParams != null);
    }

    static IsAllDamagerConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isAllDamagerConfig, "isAllDamagerConfig") as boolean;
    }

    private static isAllDamagerConfig(unitConfig: any): boolean {
        let mainArmament = unitConfig.MainArmament;

        if (mainArmament) {
            return mainArmament.BulletConfig.DisallowedTargets == UnitQueryFlag.None;
        }
        else {
            return false;
        }
    }

    static IsActiveConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isActiveConfig, "isActiveConfig") as boolean;
    }

    private static isActiveConfig(unitConfig: any): boolean {
        return unitConfig.HasNotFlags(UnitFlags.Passive);
    }

    static IsArmedConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isArmedConfig, "isArmedConfig") as boolean;
    }

    private static isArmedConfig(unitConfig: any): boolean {
        let mainArmament = unitConfig.MainArmament;
        return mainArmament != null;
    }

    static IsCombatConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isCombatConfig, "isCombatConfig") as boolean;
    }

    private static isCombatConfig(unitConfig: any): boolean {
        let mainArmament = unitConfig.MainArmament;
        let isHarvester = MaraUtils.configHasProfession(unitConfig, UnitProfession.Harvester);

        return mainArmament != null && !isHarvester;
    }

    static IsCapturingConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isCapturingConfig, "isCapturingConfig") as boolean;
    }

    private static isCapturingConfig(unitConfig: any): boolean {
        return unitConfig.AllowedCommands.ContainsKey(UnitCommand.Capture);
    }

    static IsProducerConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isProducerConfig, "isProducerConfig") as boolean;
    }

    private static isProducerConfig(cfg: any): boolean {
        return MaraUtils.configHasProfession(cfg, UnitProfession.UnitProducer);
    }

    static IsTechConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isTechConfig, "isTechConfig") as boolean;
    }

    private static isTechConfig(cfg: any): boolean {
        let unitConfigs = enumerate(AllContent.UnitConfigs.Configs);
        let kv;
        
        while ((kv = eNext(unitConfigs)) !== undefined) {
            let config = kv.Value;

            let productionRequirements = enumerate(config.TechConfig?.Requirements);
            let requirementConfig;

            while ((requirementConfig = eNext(productionRequirements)) !== undefined) {
                if (requirementConfig.Uid == cfg.Uid) {
                    return true;
                }
            }
        }
        
        return false;
    }

    static IsBuildingConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isBuildingConfig, "isBuildingConfig") as boolean;
    }

    private static isBuildingConfig(unitConfig: any): boolean {
        return unitConfig.BuildingConfig != null && unitConfig.HasNotFlags(UnitFlags.Passive);
    }

    static IsMineConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isMineConfig, "isMineConfig") as boolean;
    }

    private static isMineConfig(unitConfig: any): boolean {
        return MaraUtils.configHasProfession(unitConfig, UnitProfession.Mine);
    }

    static IsSawmillConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isSawmillConfig, "isSawmillConfig") as boolean;
    }

    private static isSawmillConfig(unitConfig: any): boolean {
        return MaraUtils.configHasProfession(unitConfig, UnitProfession.Sawmill);
    }

    static IsHarvesterConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isHarvesterConfig, "isHarvesterConfig") as boolean;
    }

    private static isHarvesterConfig(unitConfig: any): boolean {
        return MaraUtils.configHasProfession(unitConfig, UnitProfession.Harvester);
    }

    static IsHousingConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isHousingConfig, "isHousingConfig") as boolean;
    }

    private static isHousingConfig(unitConfig: any): boolean {
        return unitConfig.ProducedPeople > 0 && !MaraUtils.isMetalStockConfig(unitConfig);
    }

    static IsMetalStockConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isMetalStockConfig, "isMetalStockConfig") as boolean;
    }

    private static isMetalStockConfig(unitConfig: any): boolean {
        return MaraUtils.configHasProfession(unitConfig, UnitProfession.MetalStock);
    }

    static IsEconomyBoosterConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isEconomyBoosterConfig, "isDevelopmentBoosterConfig") as boolean;
    }

    private static isEconomyBoosterConfig(unitConfig: any): boolean {
        return unitConfig.Specification.HasFlag(UnitSpecification.MaxGrowthSpeedIncrease);
    }

    static IsHealerConfigId(cfgId: string): boolean {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.isHealerConfig, "isHealerConfig") as boolean;
    }

    private static isHealerConfig(unitConfig: any): boolean {
        // this is wrong, but we don't have a decent way to detect healing capabilities of a unit,
        // so this'll have to do
        return unitConfig.Specification.HasFlag(UnitSpecification.Church);
    }

    static GetAllSawmillConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.isSawmillConfig, "isSawmillConfig");
    }

    static GetAllMineConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.isMineConfig, "isMineConfig");
    }

    static GetAllHarvesterConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.isHarvesterConfig, "isHarvesterConfig");
    }

    static GetAllHousingConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.isHousingConfig, "isHousingConfig");
    }

    static GetAllMetalStockConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.isMetalStockConfig, "isMetalStockConfig");
    }

    static GetAllEconomyBoosterConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.isEconomyBoosterConfig, "isDevelopmentBoosterConfig");
    }

    static GetAllHealerConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.isHealerConfig, "isHealerConfig");
    }

    static GetAllConfigIds(settlement: any, configFilter: (config: any) => boolean, propertyName: string): Array<string> {
        let result: Array<string> = [];

        let allConfigs = MaraUnitConfigCache.GetAllConfigs();

        allConfigs.forEach((uCfg, cfgId) => {
            let propertyValue = MaraUnitConfigCache.GetConfigProperty(cfgId, configFilter, propertyName) as boolean;
            
            if (
                propertyValue &&
                settlement.TechTree.HypotheticalProducts.CanProduce(uCfg)
            ) {
                result.push(cfgId);
            }
        });

        return result;
    }

    static GetConfigIdStrength(cfgId: string): number {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.configStrength, "configStrength") as number
    }

    private static configStrength(unitConfig: any): number {
        if (MaraUtils.isArmedConfig(unitConfig)) {
            return unitConfig.MaxHealth * (unitConfig.Shield + 1);
        }
        else {
            return 0;
        }
    }

    static GetConfigIdMaxHealth(cfgId: string): number {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.configMaxHealth, "configMaxHealth") as number
    }

    private static configMaxHealth(unitConfig: any): number {
        return unitConfig.MaxHealth;
    }

    static GetConfigIdHeight(cfgId: string): number {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.configHeight, "configMaxHealth") as number
    }

    private static configHeight(unitConfig: any): number {
        return unitConfig.Size.Height;
    }

    static GetConfigIdWidth(cfgId: string): number {
        return MaraUnitConfigCache.GetConfigProperty(cfgId, MaraUtils.configWidth, "configMaxHealth") as number
    }

    private static configWidth(unitConfig: any): number {
        return unitConfig.Size.Width;
    }
    //#endregion
    
    //#region General Utils
    static ChebyshevDistance(cell1: any, cell2: any): number {
        const xDiff = Math.abs(cell1.X - cell2.X);
        const yDiff = Math.abs(cell1.Y - cell2.Y);

        return Math.max(xDiff, yDiff);
    }

    static EuclidDistance(cell1: any, cell2: any): number {
        return Math.sqrt(
            (cell1.X - cell2.X) ** 2 +
            (cell1.Y - cell2.Y) ** 2
        )
    }

    static FindExtremum<Type>(
        items: Array<Type>, 
        compareFunc: (a: Type, b: Type) => number
    ): Type | null {
        if (items.length == 0) {
            return null;
        }
    
        let result = items[0];
    
        for (let item of items) {
            let compareResult = compareFunc(item, result);
    
            if (compareResult > 0) {
                result = item;
            }
        }
    
        return result;
    }

    // Bresenham algorithm to pixelize straight lines are used here
    // see https://ru.wikipedia.org/wiki/Алгоритм_Брезенхэма for details
    private static bresenhamLine(start: MaraPoint, end: MaraPoint): Array<MaraPoint> {
        let xDelta = Math.abs(end.X - start.X);
        let yDelta = Math.abs(end.Y - start.Y);
        
        let error = 0;
        let errDelta = yDelta + 1;
        
        let y = start.Y;
        let yDir = Math.sign(end.Y - start.Y);

        let result: Array<MaraPoint> = [];

        for (let x = start.X; x <= end.X; x ++) {
            result.push(new MaraPoint(x, y));

            error = error + errDelta;

            if (error >= xDelta + 1) {
                y += yDir;
                error -= xDelta + 1;
            }
        }

        return result;
    }

    static MakeLine(point1: MaraPoint, point2: MaraPoint): Array<MaraPoint> {
        if (point1.X == point2.X) {
            let result: Array<MaraPoint> = [];
            let yDelta = Math.sign(point2.Y - point1.Y);
            
            for (let y = point1.Y; y != point2.Y; y += yDelta) {
                result.push(new MaraPoint(point1.X, y));
            }

            result.push(new MaraPoint(point1.X, point2.Y));

            return result;
        }
        else {
            let result: Array<MaraPoint> = [];

            if (Math.abs(point1.X - point2.X) < Math.abs(point1.Y - point2.Y)) {
                let cells = MaraUtils.MakeLine(new MaraPoint(point1.Y, point1.X), new MaraPoint(point2.Y, point2.X));
                result = cells.map((cell) => new MaraPoint(cell.Y, cell.X));
            }
            else {
                if (point2.X > point1.X) {
                    result = MaraUtils.bresenhamLine(point1, point2);
                }
                else {
                    result = MaraUtils.bresenhamLine(point2, point1);
                }
            }

            // update result so that all cells are strictly connected via sides, not diagonals
            // let newCells: Array<MaraPoint> = [];

            // for (let i = 0; i < result.length - 1; i ++) {
            //     let curCell = result[i];
            //     let nextCell = result[i + 1];

            //     if (
            //         curCell.X != nextCell.X && 
            //         curCell.Y != nextCell.Y
            //     ) {
            //         let xDelta = Math.sign(nextCell.X - curCell.X);

            //         newCells.push(
            //             new MaraPoint(curCell.X + xDelta, curCell.Y)
            //         );
            //     }
            // }

            // result.push(...newCells);

            return result;
        }
    }

    static IsPointsEqual(point1: any, point2: any): boolean {
        return point1.X == point2.X && point1.Y == point2.Y;
    }

    static RequestMasterMindProduction(productionRequest: MaraProductionRequest, masterMind: any, checkDuplicate: boolean = false): boolean {
        let cfg = MaraUtils.GetUnitConfig(productionRequest.ConfigId);

        let produceRequestParameters = new ProduceRequestParameters(cfg, 1);
        produceRequestParameters.CheckExistsRequest = checkDuplicate;
        produceRequestParameters.AllowAuxiliaryProduceRequests = false;
        produceRequestParameters.Producer = productionRequest.Executor!.Unit;
        
        if (productionRequest.Point) {
            produceRequestParameters.TargetCell = createPoint(productionRequest.Point.X, productionRequest.Point.Y);
        }

        produceRequestParameters.MaxRetargetAttempts = productionRequest.Precision;
        produceRequestParameters.DisableBuildPlaceChecking = productionRequest.Precision == 0;

        let addedRequest = host.newVar(ProduceRequest);
        
        if (masterMind.ProductionDepartment.AddRequestToProduce(produceRequestParameters, addedRequest.out)) {
            productionRequest.MasterMindRequest = addedRequest;
            return true;
        }
        else {
            return false;
        }
    }

    static GetPropertyValue(object: any, propertyName: string): any {
        return ScriptUtils.GetValue(object, propertyName);
    }

    static CastToType(object: any, type: any): any {
        try {
            return host.cast(type, object);
        }
        catch (e) {
            return null;
        }
    }
    //#endregion

    //#region Debug Utils
    static TextOnMap(text: string, cell: MaraPoint, color: any): void {
        let position = GeometryPresets.CellToCenterPosition(createPoint(cell.X, cell.Y));
        let ticksToLive = 2000;
        let decorationString = spawnString(ActiveScena, text, position, ticksToLive);
    
        decorationString.Color = color;
        decorationString.Height = 18;
        decorationString.DrawLayer = DrawLayer.Birds;
        decorationString.Font = FontUtils.DefaultVectorFont;
    }

    static DrawLineOnScena(from: MaraPoint, to: MaraPoint, lineColor?: any): void {
        const thickness = 2.0;
        
        // Caaaanvas wings of death.
        // Prepare to meet your fate.
        let geometryCanvas = new GeometryCanvas();

        let fromPosition = GeometryPresets.CellToCenterPosition(createPoint(from.X, from.Y));
        let toPosition = GeometryPresets.CellToCenterPosition(createPoint(to.X, to.Y));
        
        let color: any;

        if (!lineColor) {
            color = new Stride_Color(0xff, 0x00, 0x00);
        }
        else {
            color = new Stride_Color(lineColor.R, lineColor.G, lineColor.B);
        }
        
        geometryCanvas.DrawLine(new Stride_Vector2(fromPosition.X, fromPosition.Y), new Stride_Vector2(toPosition.X, toPosition.Y), color, thickness, false);

        let geometryBuffer = geometryCanvas.GetBuffers();

        let ticksToLive = 2000;
        spawnGeometry(ActiveScena, geometryBuffer, createPoint(0, 0), ticksToLive);
    }

    static DrawPath(path:Array<MaraPoint>, color: any): void {
        for (let i = 0; i < path.length - 1; i ++) {
            this.DrawLineOnScena(path[i], path[i + 1], color);
        }
    }
    //#endregion
}