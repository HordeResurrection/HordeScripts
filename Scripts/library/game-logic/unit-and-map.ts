import { createBox, Point2D } from "library/common/primitives";
import { KnownUnit, Settlement, Unit, UnitConfig } from "./horde-types";


// ===================================================
// --- Взаимодействие юнитов и карты

/**
 * Можно ли установить юнита с таким конфигом в заданную точку?
 * (Тут используется актуальные данные карты)
 */
export function unitCanBePlacedByRealMap(uCfg: UnitConfig, x: number, y: number) {
    return uCfg.CanBePlacedByRealMap(ActiveScena.GetRealScena(), x, y);
}

/**
 * Можно ли установить юнита с таким конфигом в заданную точку согласно известной карте?
 * (Т.е. учитывается туман войны и другие виды вИдения)
 */
export function unitCanBePlacedByKnownMap(uCfg: UnitConfig, settlement: Settlement, x: number, y: number) {
    return uCfg.CanBePlacedByKnownMap(settlement, x, y);
}

/**
 * Скорость юнита в указанной точке карты.
 * (Тут используется актуальные данные карты)
 */
export function unitSpeedAtCellByRealMap(unit: Unit, cell: Point2D) {
    let unitVar = host.newVar(Unit);
    return unit.MapMind.SpeedAtCellByRealMap(cell, unitVar.out)

    // В переменной unitVar находится юнит, если тут кто-то стоит и мешается
    // На возвращаемую скорость это не влияет
}

/**
 * Скорость юнита в указанной точке карты согласно известной карте.
 * (Т.е. учитывается туман войны и другие виды вИдения)
 */
export function unitSpeedAtCellByKnownMap(unit: Unit, cell: Point2D) {
    let knownUnitVar = host.newVar(KnownUnit);
    return unit.MapMind.SpeedAtCellByKnownMap(cell, knownUnitVar.out)

    // В переменной knownUnitVar находится known-юнит, если тут кто-то стоит и мешается
    // На возвращаемую скорость это не влияет
}

/**
 * Может ли юнит дойти к указанной точке?
 * (Тут учитывается туман войны и другие виды вИдения)
 */
export function unitCheckPathTo(unit: Unit, cell: Point2D) {
    return unit.MapMind.CheckPathTo(cell, false).Found;
}

/**
 * Телепортировать юнита
 */
export function unitTeleport(unit: Unit, cell: Point2D) {
    unit.MapMind.TeleportToCell(cell);
    return unit.Cell == cell;
}


/**
 * Функция возвращает юнитов по очереди от самого ближайшего, к самому дальнему.
 * 
 * Если юнит находится в нескольких клетках, то будет возвращен несколько раз (здания и юниты в движении)
 * Но внутренняя часть здания перечисляться не будет (например, две центральные клетки деревянного замка)
 * 
 * @param cell центр
 * @param radius радиус квадрата поиска
 */
export function* iterateOverUnitsInBox(cell: Point2D, radius: number) {
    let box = createBox(cell.X - radius, cell.Y - radius, 0, cell.X + radius - 1, cell.Y + radius - 1, 2);
    let unitsInBox = ActiveScena.UnitsMap.UnitsTree.GetUnitsInBox(box);
    
    let count = unitsInBox.Count;
    if (count == 0) {
        return;
    }

    let units = unitsInBox.Units;
    // let positions = ScriptUtils.GetValue(unitsInBox, "Positions");

    for (let index = 0; index < count; ++index) {
        let unit = units[index];
        if (unit == null) {
            continue;
        }

        // Координаты клетки из который был "взят юнит". Может быть актуально при переборе зданий и движущихся юнитов
        // let x = positions[index * 3];
        // let y = positions[index * 3 + 1];
        // let layer = positions[index * 3 + 2];

        yield unit;
    }
}
