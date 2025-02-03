import { createPoint } from "library/common/primitives";
import { Unit, UnitDirection } from "library/game-logic/horde-types";
import { spawnUnit } from "library/game-logic/unit-spawn";
import HordePluginBase from "plugins/base-plugin";

// ==============================================================
// --- Утилиты

/**
 * Возвращает предыдущего или создаёт нового юнита для теста.
 */
export function getOrCreateTestUnit(plugin: HordePluginBase): Unit | null {
    let unit = plugin.globalStorage.unitForExample;
    if (unit && unit.IsAlive) {
        return unit;
    }

    return createUnitForTest(plugin);
}


/**
 * Создаёт юнита для теста.
 */
export function createUnitForTest(plugin: HordePluginBase): Unit | null {
    let testCell = createPoint(5, 5);

    let unit = ActiveScena.UnitsMap.GetUpperUnit(testCell);
    if (unit) {
        return unit;
    }

    let oleg = ActiveScena.Settlements.Item.get('0');  // Олег
    unit = spawnUnit(oleg, HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer"), testCell, UnitDirection.RightDown);
    plugin.globalStorage.unitForExample = unit;
    if (!unit) {
        return null;
    }

    plugin.log.info('Создан новый юнит для теста!', unit);
    return unit;
}
