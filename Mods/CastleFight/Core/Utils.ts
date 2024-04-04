import { generateCellInSpiral } from "library/common/position-tools";
import { createBox, createPoint } from "library/common/primitives";
import { PointCommandArgs, UnitCommand } from "library/game-logic/horde-types";
import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { getUnitProfessionParams, UnitProfession } from "library/game-logic/unit-professions";

/** расстояние L1 между 2 точками */ 
export function distanceBetweenPoints (x1:number, y1:number, x2:number, y2:number) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
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

/** отдать юниту команду в ближайшую свободную точку */
export function UnitGiveOrder (unit: any, point: Point, unitCommant: any, assignOrderMode: any) {
    UnitAllowCommands(unit);
    // позиция для атаки цели
    var goalPosition;
    {
        var generator = generateCellInSpiral(point.X, point.Y);
        for (goalPosition = generator.next(); !goalPosition.done; goalPosition = generator.next()) {
            if (unitCanBePlacedByRealMap(unit.Cfg, goalPosition.value.X, goalPosition.value.Y)) {
                break;
            }
        }
    }
    var pointCommandArgs = new PointCommandArgs(createPoint(goalPosition.value.X, goalPosition.value.Y), unitCommant, assignOrderMode);
    // отдаем приказ
    unit.Cfg.GetOrderDelegate(unit, pointCommandArgs);
    UnitDisallowCommands(unit);
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

export class Point {
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
    points: Array<Point>;

    public constructor(points:Array<Point>) {
        this.points = points;
    }

    /** флаг, что точка лежит внутри полигона */
    public IsPointInside(px:number, py:number) {
        if (this.points.length < 3) {
            return false;
        }

        var inside = true;
        for (var pointNum = 0, prevPointNum = this.points.length - 1;
            pointNum < this.points.length;
            prevPointNum = pointNum, pointNum++) {
            var vectorProduct = (this.points[pointNum].X - this.points[prevPointNum].X) * (py - this.points[prevPointNum].Y)
                - (this.points[pointNum].Y - this.points[prevPointNum].Y) * (px - this.points[prevPointNum].X);

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
