import { generateCellInSpiral } from "library/common/position-tools";
import { createBox, createPoint } from "library/common/primitives";
import { PointCommandArgs, UnitCommand } from "library/game-logic/horde-types";
import { getUnitProfessionParams, UnitProfession } from "library/game-logic/unit-professions";

const SpawnUnitParameters = HCL.HordeClassLibrary.World.Objects.Units.SpawnUnitParameters;

/** метрика измерения расстояния */
export enum MetricType {
    L1 = 0,
    L2
}

/** расстояние L1 между 2 точками */ 
export function distance_L1 (x1:number, y1:number, x2:number, y2:number) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
/** расстояние L2 между 2 точками */ 
export function distance_L2 (x1:number, y1:number, x2:number, y2:number) {
    return Math.sqrt((x1 - x2)*(x1 - x2) + (y1 - y2)*(y1 - y2));
}
/** получить текущее время в миллисекундах */
export function getCurrentTime () {
    return new Date().getTime();
}

/** добавить профессию найма юнитов */
export function CfgAddUnitProducer(Cfg: any) {
    // даем профессию найм войнов при отсутствии
    if (!getUnitProfessionParams(Cfg, UnitProfession.UnitProducer)) {
        var donorCfg = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Barrack"));
        var prof_unitProducer = getUnitProfessionParams(donorCfg, UnitProfession.UnitProducer);
        Cfg.ProfessionParams.Item.set(UnitProfession.UnitProducer, prof_unitProducer);
        
        if (Cfg.BuildingConfig.EmergePoint == null) {
            ScriptUtils.SetValue(Cfg.BuildingConfig, "EmergePoint", createPoint(0, 0));
        }
        if (Cfg.BuildingConfig.EmergePoint2 == null) {
            ScriptUtils.SetValue(Cfg.BuildingConfig, "EmergePoint2", createPoint(0, 0));
        }
        HordeContentApi.RemoveConfig(donorCfg);
    }
}

/** установить скорость */
export function CfgSetSpeed(cfg: any, speeds: Map<TileType, number>) {
    var tileTypes = speeds.keys();
    for (var tileType = tileTypes.next(); !tileType.done; tileType = tileTypes.next()) {
        cfg.Speeds.Item.set(tileType.value, speeds.get(tileType.value));
    }
};

/** отдать юниту команду в ближайшую свободную точку */
export function UnitGiveOrder (unit: any, point: Cell, unitCommant: any, assignOrderMode: any) {
    var commandsMind       = unit.CommandsMind;
    var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");

    if (disallowedCommands.ContainsKey(unitCommant)) disallowedCommands.Remove(unitCommant);

    //UnitAllowCommands(unit);
    // позиция для атаки цели
    var goalPosition;
    {
        var generator = generateCellInSpiral(point.X, point.Y);
        for (goalPosition = generator.next(); !goalPosition.done; goalPosition = generator.next()) {
            if (unit.Cfg.CanBePlacedByRealMap(ActiveScena.GetRealScena(), goalPosition.value.X, goalPosition.value.Y)) {
                break;
            }
        }
    }
    var pointCommandArgs = new PointCommandArgs(createPoint(goalPosition.value.X, goalPosition.value.Y), unitCommant, assignOrderMode);
    // отдаем приказ
    unit.Cfg.GetOrderDelegate(unit, pointCommandArgs);
    //UnitDisallowCommands(unit);

    disallowedCommands.Add(unitCommant, 1);
}

/** запретить управление юнитом */
export function UnitDisallowCommands(unit: any) {
    var commandsMind       = unit.CommandsMind;
    var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");
    disallowedCommands.Add(UnitCommand.MoveToPoint, 1);
    disallowedCommands.Add(UnitCommand.HoldPosition, 1);
    disallowedCommands.Add(UnitCommand.Attack, 1);
    disallowedCommands.Add(UnitCommand.Capture, 1);
    disallowedCommands.Add(UnitCommand.StepAway, 1);
    disallowedCommands.Add(UnitCommand.Cancel, 1);
}

/** разрешить управление юнитом */
export function UnitAllowCommands(unit: any) {
    var commandsMind       = unit.CommandsMind;
    var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");
    if (disallowedCommands.ContainsKey(UnitCommand.MoveToPoint)) disallowedCommands.Remove(UnitCommand.MoveToPoint);
    if (disallowedCommands.ContainsKey(UnitCommand.HoldPosition)) disallowedCommands.Remove(UnitCommand.HoldPosition);
    if (disallowedCommands.ContainsKey(UnitCommand.Attack)) disallowedCommands.Remove(UnitCommand.Attack);
    if (disallowedCommands.ContainsKey(UnitCommand.Capture)) disallowedCommands.Remove(UnitCommand.Capture);
    if (disallowedCommands.ContainsKey(UnitCommand.StepAway)) disallowedCommands.Remove(UnitCommand.StepAway);
    if (disallowedCommands.ContainsKey(UnitCommand.Cancel)) disallowedCommands.Remove(UnitCommand.Cancel);
}

export class Cell {
    X:number;
    Y:number;

    public constructor(X:number, Y:number) {
        this.X = X;
        this.Y = Y;
    };
}

/** полигон из точек по часовой стрелке! */
export class Polygon {
    // набор точек задающие полигон
    cells: Array<Cell>;

    public constructor(points:Array<Cell>) {
        this.cells = points;
    }

    /** флаг, что точка лежит внутри полигона */
    public IsCellInside(px:number, py:number) {
        if (this.cells.length < 3) {
            return false;
        }

        var inside = true;
        for (var cellNum = 0, prevCellNum = this.cells.length - 1;
            cellNum < this.cells.length;
            prevCellNum = cellNum, cellNum++) {
            var vectorProduct = (this.cells[cellNum].X - this.cells[prevCellNum].X) * (py - this.cells[prevCellNum].Y)
                - (this.cells[cellNum].Y - this.cells[prevCellNum].Y) * (px - this.cells[prevCellNum].X);

            if (vectorProduct < 0) {
                inside = false;
                break;
            }
        }

        return inside;
    }
};

export class Rectangle {
    xs: number;
    ys: number;
    xe: number;
    ye: number;

    constructor (xs: number, ys: number, xe: number, ye: number) {
        this.xs = xs;
        this.ys = ys;
        this.xe = xe;
        this.ye = ye;
    }
}

export function GetUnitsInArea(rect: Rectangle): Array<any> {
    let box = createBox(rect.xs, rect.ys, 0, rect.xe, rect.ye, 2);
    let unitsInBox = ScriptUtils.Invoke(ActiveScena.GetRealScena().UnitsMap.UnitsTree, "GetUnitsInBox", box);
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

        unitsIds.add(unit.Id);
        result.push(unit);
    }

    return result;
}

export function spawnUnits(settlement, uCfg, uCount, direction, generator) {
    let spawnParams = new SpawnUnitParameters();
    spawnParams.ProductUnitConfig = uCfg;
    spawnParams.Direction = direction;

    let outSpawnedUnits: any[] = [];
    for (let position = generator.next(); !position.done && outSpawnedUnits.length < uCount; position = generator.next()) {
        if (uCfg.CanBePlacedByRealMap(ActiveScena.GetRealScena(), position.value.X, position.value.Y)) {
            spawnParams.Cell = createPoint(position.value.X, position.value.Y);
            outSpawnedUnits.push(settlement.Units.SpawnUnit(spawnParams));
        }
    }

    return outSpawnedUnits;
}
