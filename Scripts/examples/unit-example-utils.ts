import { createPoint } from "library/common/primitives";
import { UnitDirection } from "library/game-logic/horde-types";
import { spawnUnit } from "library/game-logic/unit-spawn";

// ==============================================================
// --- Утилиты

/**
 * Возвращает предыдущего или создаёт нового юнита для теста.
 */
export function getOrCreateTestUnit(plugin) {
    let unit = plugin.globalStorage.unitForExample;
    if (unit && unit.IsAlive) {
        return unit;
    }

    return createUnitForTest(plugin);
}


/**
 * Создаёт юнита для теста.
 */
export function createUnitForTest(plugin) {
    let testCell = createPoint(5, 5);

    let realScena = ActiveScena.GetRealScena();
    let unit = realScena.UnitsMap.GetUpperUnit(testCell);
    if (unit) {
        return unit;
    }

    let oleg = realScena.Settlements.Item.get('0');  // Олег
    unit = spawnUnit(oleg, HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer"), testCell, UnitDirection.RightDown);
    plugin.globalStorage.unitForExample = unit;
    if (!unit) {
        return null;
    }

    plugin.log.info('Создан новый юнит для теста!', unit);
    return unit;
}
