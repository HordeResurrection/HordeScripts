import { log } from "library/common/logging";
import { generateRandomCellInRect } from "library/common/position-tools";
import { createPoint, Point2D } from "library/common/primitives";
import { Settlement, Unit, UnitConfig, UnitDirection } from "./horde-types";
import { unitCanBePlacedByRealMap } from "./unit-and-map";


const SpawnUnitParameters = HordeClassLibrary.World.Objects.Units.SpawnUnitParameters;
type SpawnUnitParameters = HordeClassLibrary.World.Objects.Units.SpawnUnitParameters;

/**
 * Создание одного юнита в заданной клетке.
 * 
 * Возвращает созданного юнита.
 */
export function spawnUnit(settlement: Settlement, uCfg: UnitConfig, cell: Point2D, direction: UnitDirection) {
    let spawnParams = new SpawnUnitParameters();
    spawnParams.ProductUnitConfig = uCfg;
    spawnParams.Cell = cell;
    spawnParams.Direction = direction;

    let unit = settlement.Units.SpawnUnit(spawnParams);
    return unit;
}

/**
 * Создание uCount (может быть создано меньше, поскольку генератор конечный) юнитов согласно переданному generator - генератору позиций
 *
 * Возвращает список созданных юнитов.
 */
export function spawnUnits(settlement: Settlement, uCfg: UnitConfig, uCount: number, direction: UnitDirection, generator: any): Unit[] {
    let spawnParams = new SpawnUnitParameters();
    spawnParams.ProductUnitConfig = uCfg;
    spawnParams.Direction = direction;

    let outSpawnedUnits: Unit[] = [];
    for (let position = generator.next(); !position.done && outSpawnedUnits.length < uCount; position = generator.next()) {
        if (unitCanBePlacedByRealMap(uCfg, position.value.X, position.value.Y)) {
            spawnParams.Cell = createPoint(position.value.X, position.value.Y);
            outSpawnedUnits.push(settlement.Units.SpawnUnit(spawnParams));
        }
    }

    return outSpawnedUnits;
}


// ===================================================
// --- Test

export function test_spawnUnits() {
    let settlement_0 = ActiveScena.Settlements.Item.get('0');  // Олег
    let archerCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer");
    let spawnCounts = 100;
    let dir = UnitDirection.RightDown;

    let spawnedUnits = spawnUnits(settlement_0, archerCfg, spawnCounts, dir, generateRandomCellInRect(0, 0, 176, 22));

    log.info('Созданные юниты:');
    for (let unit of spawnedUnits) {
        log.info('-', unit);
    }

    return;
}
