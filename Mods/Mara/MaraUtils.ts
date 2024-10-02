import { Mara, MaraLogLevel } from "Mara/Mara";
import { MaraSquad } from "Mara/Subcontrollers/Squads/MaraSquad";
import { createBox, createPoint } from "library/common/primitives";
import { UnitFlags, UnitCommand, AllContent, UnitConfig, UnitQueryFlag, UnitSpecification } from "library/game-logic/horde-types";
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

const DEFAULT_UNIT_SEARCH_RADIUS = 3;

const TileType = HCL.HordeClassLibrary.HordeContent.Configs.Tiles.Stuff.TileType;
const AlmostDefeatCondition = HCL.HordeClassLibrary.World.Settlements.Existence.AlmostDefeatCondition;
const ResourceType = HCL.HordeClassLibrary.World.Objects.Tiles.ResourceTileType;

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

class AttackAbilityCache {}

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

    static IsSettlementDefeated(settlement: any): boolean {
        return settlement.Existence.IsTotalDefeat || settlement.Existence.IsAlmostDefeat;
    }

    static IsNetworkMode(): boolean {
        let NetworkController = HordeEngine.HordeResurrection.Engine.Logic.Main.NetworkController;
        
        return NetworkController.NetWorker != null;
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
        units: Array<any>, 
        settlements: Array<any>,
        unitFilter?: (unit: any) => boolean,
        radius: number = DEFAULT_UNIT_SEARCH_RADIUS,
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

        let newUnitsPresent = true;
        let currentSquad = new MaraSquad([unit]);
        
        while (newUnitsPresent) {
            let squadLocation = currentSquad.GetLocation();
            let newRadius = radius + squadLocation.Spread / 2;

            let newUnits = MaraUtils.GetSettlementUnitsAroundPoint(
                squadLocation.SpreadCenter, 
                newRadius,
                settlements,
                unitFilter
            );

            newUnits = newUnits.filter((unit) => {
                return unit.Owner === unitSettlement && 
                    !processedUnitIds.has(unit.Id)
            });

            if (newUnits.length == currentSquad.Units.length) {
                newUnitsPresent = false;
            }
            else {
                currentSquad = new MaraSquad(newUnits);
            }
        }

        for (let unit of currentSquad.Units) {
            processedUnitIds.add(unit.Id);
        }

        return currentSquad;
    }

    static GetSettlementUnitsAroundPoint(
        point: any,
        radius: number,
        settelements: Array<any>,
        unitFilter?: (unit: any) => boolean,
        includeUnalive?: boolean
    ): Array<any> {
        return MaraUtils.GetSettlementUnitsInArea(
            MaraRect.CreateFromPoint(new MaraPoint(point.X, point.Y), radius),
            settelements,
            unitFilter,
            includeUnalive
        );
    }
    
    static GetSettlementUnitsInArea(
        rect: MaraRect,
        settelements: Array<any>,
        unitFilter?: (unit: any) => boolean,
        includeUnalive?: boolean
    ): Array<any> {
        let units = MaraUtils.GetUnitsInArea(rect, unitFilter);
        units = units.filter((unit) => {
            return (
                (settelements.length == 0 || settelements.indexOf(unit.Owner) > -1) && 
                (unit.IsAlive || includeUnalive) && 
                unit.Cfg.HasNotFlags(UnitFlags.Passive)
            );
        });

        return units;
    }

    static GetAllSettlementUnits(settlement: any): Array<any> {
        let units = enumerate(settlement.Units);
        let unit;
        let result: Array<any> = [];
        
        while ((unit = eNext(units)) !== undefined) {
            if (unit.IsAlive) {
                result.push(unit);
            }
        }

        return result;
    }

    static GetUnitsAroundPoint(point: any, radius: number, unitFilter?: (unit: any) => boolean): Array<any> {
        return MaraUtils.GetUnitsInArea(
            MaraRect.CreateFromPoint(new MaraPoint(point.X, point.Y), radius),
            unitFilter
        );
    }
    
    static GetUnitsInArea(rect: MaraRect, unitFilter?: (unit: any) => boolean): Array<any> {
        let box = createBox(
            Math.round(rect.TopLeft.X), 
            Math.round(rect.TopLeft.Y), 
            0, 
            Math.round(rect.BottomRight.X), 
            Math.round(rect.BottomRight.Y), 
            2
        );

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

    static GetUnit(cell: any): any {
        let unitsMap = DotnetHolder.UnitsMap;
        return unitsMap.GetUpperUnit(cell.X, cell.Y);
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

    static GetUnitsBoundingRect(units: Array<any>): MaraRect {
        let topPoint: MaraPoint = new MaraPoint(Infinity, Infinity);
        let bottomPoint: MaraPoint = new MaraPoint(0, 0);
        let leftPoint: MaraPoint = new MaraPoint(Infinity, Infinity);
        let rightPoint: MaraPoint = new MaraPoint(0, 0);

        for (let unit of units) {
            if (unit.Cell.Y < topPoint.Y) {
                topPoint = new MaraPoint(unit.Cell.X, unit.Cell.Y);
            }

            if (unit.Cell.X < leftPoint.X) {
                leftPoint = new MaraPoint(unit.Cell.X, unit.Cell.Y);
            }

            if (unit.Cell.Y + unit.Cfg.Size.Height > bottomPoint.Y) {
                bottomPoint = new MaraPoint(unit.Cell.X, unit.Cell.Y + unit.Cfg.Size.Height);
            }

            if (unit.Cell.X + unit.Cfg.Size.Width > rightPoint.X) {
                rightPoint = new MaraPoint(unit.Cell.X + unit.Cfg.Size.Width, unit.Cell.Y);
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
        let unitsMap = DotnetHolder.UnitsMap;
        
        let generator = generateCellInSpiral(point.X, point.Y);
        let cell: any;
        for (cell = generator.next(); !cell.done; cell = generator.next()) {
            let unit = unitsMap.GetUpperUnit(cell.value.X, cell.value.Y);
            
            if (!unit) {
                let resultCell = cell.value;
                let neighbors = MaraUtils.GetUnitsAroundPoint(resultCell, 1);

                let isTargetedCell = false;

                for (let neighbor of neighbors) {
                    if (neighbor.MoveToCell) {
                        if (
                            neighbor.MoveToCell.X == resultCell.X && 
                            neighbor.MoveToCell.Y == resultCell.Y
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
        let endCol = Math.min(center.X + radius, DotnetHolder.RealScena.Size.Width);
        
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
        units: Array<any>, 
        player: any, 
        location: any, 
        isReplaceMode: boolean = true, 
        ignoreUnits: boolean = true
    ): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.Attack, isReplaceMode, ignoreUnits);
    }

    static IssueMoveCommand(units: Array<any>, player: any, location: any, isReplaceMode: boolean = true): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.MoveToPoint, isReplaceMode);
    }

    static IssueCaptureCommand(units: Array<any>, player: any, location: any, isReplaceMode: boolean = true): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.Capture, isReplaceMode);
    }

    static IssueHarvestLumberCommand(units: Array<any>, player: any, location: any, isReplaceMode: boolean = true): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.HarvestLumber, isReplaceMode);
    }

    static IssueMineCommand(units: Array<any>, player: any, location: any, isReplaceMode: boolean = true): void {
        MaraUtils.issuePointBasedCommand(units, player, location, UnitCommand.Mine, isReplaceMode);
    }

    static IssueSelfDestructCommand(units: Array<any>, player: any) {
        MaraUtils.issueOneClickCommand(units, player, UnitCommand.DestroySelf);
    }

    private static issueOneClickCommand(units: Array<any>, player: any, command: any): void {
        let virtualInput = MaraUtils.playersInput[player];
        
        if (!virtualInput) {
            virtualInput = new PlayerVirtualInput(player);
            MaraUtils.playersInput[player] = virtualInput;
        }

        let unitIds = units.map((unit) => unit.Id);
        virtualInput.selectUnitsById(unitIds, VirtualSelectUnitsMode.Select);
        virtualInput.oneClickCommand(command);
    }

    private static issuePointBasedCommand(
        units: Array<any>, 
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
        let unitIds = units.map((unit) => unit.Id);
        
        virtualInput.selectUnitsById(unitIds, VirtualSelectUnitsMode.Select);
        virtualInput.pointBasedCommand(createPoint(location.X, location.Y), command, mode, ignoreUnits);
        virtualInput.commit();
    }

    private static playersInput = {};
    //#endregion
    
    //#region Pathfinding
    static IsCellReachable(cell: any, unit: any): boolean {
        return unit.MapMind.CheckPathTo(createPoint(cell.X, cell.Y), false).Found;
    }

    static IsPathExists(fromCell: MaraPoint, toCell: MaraPoint, unitCfg: any, pathFinder: any): boolean {
        let from = createPoint(fromCell.X, fromCell.Y);
        let to = createPoint(toCell.X, toCell.Y);
        
        return pathFinder.checkPath(unitCfg, from, to);
    }
    //#endregion
    
    //#region Unit Properties
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

    static GetUnitStrength(unit: any): number {
        let unitCfg = unit.Cfg;

        if (this.IsArmedConfig(unitCfg) && unit.IsAlive) {
            let maxStrength = MaraUtils.GetConfigStrength(unitCfg);

            return maxStrength * (unit.Health / unitCfg.MaxHealth);
        }
        else {
            return 0;
        }
    }

    private static attackAbilityCache = new AttackAbilityCache();

    static CanAttack(sourceUnit: any, targetUnit: any): boolean {
        let sourceCfgId = sourceUnit.Cfg.Uid;
        let targetCfgId = targetUnit.Cfg.Uid;

        let result: boolean = MaraUtils.attackAbilityCache[sourceCfgId + targetCfgId];

        if (result == null) {
            result = sourceUnit.BattleMind.CanAttackTarget(targetUnit);
            MaraUtils.attackAbilityCache[sourceCfgId + targetCfgId] = result;
        }

        return result;
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
        let cfg = MaraUtils.GetUnitConfig(cfgId);
        return MaraUtils.IsAllDamagerConfig(cfg);
    }

    static IsAllDamagerConfig(unitConfig: any): boolean {
        let mainArmament = unitConfig.MainArmament;

        if (mainArmament) {
            return mainArmament.BulletConfig.DisallowedTargets == UnitQueryFlag.None;
        }
        else {
            return false;
        }
    }

    static IsArmedConfig(unitConfig: any): boolean {
        let mainArmament = unitConfig.MainArmament;
        return mainArmament != null;
    }

    static IsArmedConfigId(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId);
        return MaraUtils.IsArmedConfig(cfg);
    }

    static IsCombatConfig(unitConfig: any): boolean {
        let mainArmament = unitConfig.MainArmament;
        let isHarvester = MaraUtils.configHasProfession(unitConfig, UnitProfession.Harvester);

        return mainArmament != null && !isHarvester;
    }

    static IsCombatConfigId(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId);
        return MaraUtils.IsCombatConfig(cfg);
    }

    static IsCapturingConfig(unitConfig: any): boolean {
        return unitConfig.AllowedCommands.ContainsKey(UnitCommand.Capture);
    }

    static IsCapturingConfigId(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId);
        return MaraUtils.IsCapturingConfig(cfg);
    }

    static IsProducerConfig(cfg: any): boolean {
        return MaraUtils.configHasProfession(cfg, UnitProfession.UnitProducer);
    }

    static IsTechConfig(cfg: any): boolean {
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
        let cfg = MaraUtils.GetUnitConfig(cfgId);
        return MaraUtils.IsBuildingConfig(cfg);
    }

    static IsBuildingConfig(cfg: any): boolean {
        return cfg.BuildingConfig != null && cfg.HasNotFlags(UnitFlags.Passive);
    }

    static IsMineConfig(unitConfig: any): boolean {
        return MaraUtils.configHasProfession(unitConfig, UnitProfession.Mine);
    }

    static IsMineConfigId(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId)
        return MaraUtils.IsMineConfig(cfg);
    }

    static IsSawmillConfig(unitConfig: any): boolean {
        return MaraUtils.configHasProfession(unitConfig, UnitProfession.Sawmill);
    }

    static IsSawmillConfigId(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId)
        return MaraUtils.IsSawmillConfig(cfg);
    }

    static IsHarvesterConfig(unitConfig: any): boolean {
        return MaraUtils.configHasProfession(unitConfig, UnitProfession.Harvester);
    }

    static IsHarvesterConfigId(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId)
        return MaraUtils.IsHarvesterConfig(cfg);
    }

    static IsHousingConfig(unitConfig: any): boolean {
        return unitConfig.ProducedPeople > 0 && !MaraUtils.IsMetalStockConfig(unitConfig);
    }

    static IsHousingConfigId(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId)
        return MaraUtils.IsHousingConfig(cfg);
    }

    static IsMetalStockConfig(unitConfig: any): boolean {
        return MaraUtils.configHasProfession(unitConfig, UnitProfession.MetalStock);
    }

    static IsMetalStockConfigId(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId);
        return MaraUtils.IsMetalStockConfig(cfg);
    }

    static IsDevelopmentBoosterConfig(unitConfig: any): boolean {
        return unitConfig.Specification.HasFlag(UnitSpecification.MaxGrowthSpeedIncrease);
    }

    static IsDevelopmentBoosterConfigId(cfgId: string): boolean {
        let cfg = MaraUtils.GetUnitConfig(cfgId);
        return MaraUtils.IsDevelopmentBoosterConfig(cfg);
    }

    static GetAllSawmillConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.IsSawmillConfig);
    }

    static GetAllMineConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.IsMineConfig);
    }

    static GetAllHarvesterConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.IsHarvesterConfig);
    }

    static GetAllHousingConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.IsHousingConfig);
    }

    static GetAllMetalStockConfigIds(settlement: any): Array<string> {
        return MaraUtils.GetAllConfigIds(settlement, MaraUtils.IsMetalStockConfig);
    }

    static GetAllConfigIds(settlement: any, configFilter: (config: any) => boolean): Array<string> {
        let result: Array<string> = [];

        ForEach(AllContent.UnitConfigs.Configs, kv => {
            let cfgId = kv.Key;
            let uCfg = kv.Value;
            
            if (
                configFilter(uCfg) &&
                settlement.TechTree.HypotheticalProducts.CanProduce(uCfg)
            ) {
                result.push(cfgId);
            }
        });

        return result;
    }

    static GetConfigStrength(unitConfig: any): number {
        if (MaraUtils.IsArmedConfig(unitConfig)) {
            return unitConfig.MaxHealth * (unitConfig.Shield + 1);
        }
        else {
            return 0;
        }
    }
    //#endregion
    
    //#region General Utils
    static ChebyshevDistance(cell1: any, cell2: any): number {
        const xDiff = Math.abs(cell1.X - cell2.X);
        const yDiff = Math.abs(cell1.Y - cell2.Y);

        return Math.max(xDiff, yDiff);
    }

    static IsPointsEqual(point1: any, point2: any): boolean {
        return point1.X == point2.X && point1.Y == point2.Y;
    }

    static RequestMasterMindProduction(productionRequest: MaraProductionRequest, masterMind: any, checkDuplicate: boolean = false): boolean {
        let cfg = MaraUtils.GetUnitConfig(productionRequest.ConfigId);

        let produceRequestParameters = new ProduceRequestParameters(cfg, 1);
        produceRequestParameters.CheckExistsRequest = checkDuplicate;
        produceRequestParameters.AllowAuxiliaryProduceRequests = false;
        produceRequestParameters.Producer = productionRequest.Executor;
        
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
}