import HordePluginBase from "plugins/base-plugin";
import { ScriptUnitWorkerGetOrder, ScriptUnitWorkerCanBePlaced, ScriptUnitWorkerState, BulletConfig, BaseBullet, BulletEmittingArgs, UnitConfig, UnitState, Unit, ACommandArgs, Settlement, Scena } from "./horde-types";


// ===================================================
// --- Bullets

/**
 * Установить инициализирующий обработчик для снаряда на основе метода из плагина.
 */
export function setBulletInitializeWorker(
    plugin: HordePluginBase,
    bulletCfg: BulletConfig,
    workerFunc: (plugin: HordePluginBase, bull: BaseBullet, emitArgs: BulletEmittingArgs) => void
) {
    const workerName = plugin.name + '_InitializeBullet'
    const workerTypeName = "InitializeFuncName";
    const workerWrapper = (bull: BaseBullet, emitArgs: BulletEmittingArgs) => workerFunc.call(plugin, bull, emitArgs);
    setBulletWorker(bulletCfg, workerTypeName, workerName, workerWrapper);
}

/**
 * Установить обработчик снаряда на каждый такт на основе метода из плагина.
 */
export function setBulletProcessWorker(
    plugin: HordePluginBase,
    bulletCfg: BulletConfig,
    workerFunc: (plugin: HordePluginBase, bull: BaseBullet) => void
) {
    const workerName = plugin.name + '_ProcessBullet'
    const workerTypeName = "ProcessFuncName";
    const workerWrapper = (bull: BaseBullet) => workerFunc.call(plugin, bull);
    setBulletWorker(bulletCfg, workerTypeName, workerName, workerWrapper);
}

/**
 * Вспомогательный метод для установки обработчика на основе произвольной функции.
 * 
 * Примечание: эту функцию можно использовать для задания обработчика без привязки к плагину.
 */
export function setBulletWorker(
    bulletCfg: BulletConfig,
    workerTypeName: string,
    workerName: string,
    workerFunc: (...args: any[]) => void
) {
    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    BulletWorkersRegistry.Register(workerName, workerFunc);

    // Установка функции-обработчика в конфиг
    ScriptUtils.SetValue(bulletCfg.SpecialParams, workerTypeName, workerName);
}


// ===================================================
// --- Units

/**
 * Установить обработчик состояния юнита на основе метода из плагина.
 */
export function setUnitStateWorker(
    plugin: HordePluginBase,
    unitCfg: UnitConfig,
    unitState: UnitState,
    workerFunc: (plugin: HordePluginBase, unit: Unit) => void
) {
    const workerName = `${plugin.name}_${unitState}Worker`

    // Обертка для метода из плагина, чтобы работал "this"
    const workerWrapper = (u: Unit) => workerFunc.call(plugin, u);

    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    UnitWorkersRegistry.Register(workerName, workerWrapper);

    // Объект-обработчик
    const workerObject = new ScriptUnitWorkerState();

    // Установка функции-обработчика
    ScriptUtils.SetValue(workerObject, "FuncName", workerName);

    // Установка обработчика в конфиг
    const stateWorkers = ScriptUtils.GetValue(unitCfg, "StateWorkers");
    stateWorkers.Item.set(unitState, workerObject);
}

/**
 * Установить обработчик получения приказа для юнита на основе метода из плагина.
 */
export function setUnitGetOrderWorker(
    plugin: HordePluginBase,
    unitCfg: UnitConfig,
    workerFunc: (plugin: HordePluginBase, unit: Unit, cmdArgs: ACommandArgs) => boolean
) {
    const workerName = `${plugin.name}_GetOrderWorker`

    // Обертка для метода из плагина, чтобы работал "this"
    const workerWrapper = (u: Unit, cmdArgs: ACommandArgs) => workerFunc.call(plugin, u, cmdArgs);

    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    UnitWorkersRegistry.Register(workerName, workerWrapper);

    // Объект-обработчик
    const workerObject = new ScriptUnitWorkerGetOrder();

    // Установка функции-обработчика
    ScriptUtils.SetValue(workerObject, "FuncName", workerName);

    // Установка обработчика в конфиг
    ScriptUtils.SetValue(unitCfg, "GetOrderWorker", workerObject);
}

/**
 * Установить CanBePlaced-обработчик для юнита на основе метода из плагина.
 */
export function setUnitCanBePlacedWorker(
    plugin: HordePluginBase,
    unitCfg: UnitConfig,
    func_canBePlacedByKnownMap: (plugin: HordePluginBase, settlement: Settlement, uCfg: UnitConfig, x: number, y: number, size1x1: boolean, considerUnit: boolean) => void,
    func_canBePlacedByRealMap: (plugin: HordePluginBase, scena: Scena, uCfg: UnitConfig, x: number, y: number, size1x1: boolean, considerUnit: boolean) => void
) {
    const name_canBePlacedByKnownMap = `${plugin.name}_CanBePlacedByKnownMap`;
    const name_canBePlacedByRealMap = `${plugin.name}_CanBePlacedByRealMap`;

    // Обертки для методов из плагина, чтобы работал "this"
    const wrapper_canBePlacedByKnownMap = (
        settlement: Settlement, uCfg: UnitConfig, x: number, y: number, size1x1: boolean, considerUnit: boolean
    ) => func_canBePlacedByKnownMap.call(plugin, settlement, uCfg, x, y, size1x1, considerUnit);
    const wrapper_canBePlacedByRealMap = (
        scena: Scena, uCfg: UnitConfig, x: number, y: number, size1x1: boolean, considerUnit: boolean
    ) => func_canBePlacedByRealMap.call(plugin, scena, uCfg, x, y, size1x1, considerUnit);

    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    UnitWorkersRegistry.Register(name_canBePlacedByKnownMap, wrapper_canBePlacedByKnownMap);
    UnitWorkersRegistry.Register(name_canBePlacedByRealMap, wrapper_canBePlacedByRealMap);

    // Объект-обработчик
    const workerObject = new ScriptUnitWorkerCanBePlaced();
    ScriptUtils.SetValue(workerObject, "ByKnownMapFuncName", name_canBePlacedByKnownMap);
    ScriptUtils.SetValue(workerObject, "ByRealMapFuncName", name_canBePlacedByRealMap);

    // Установка обработчика в конфиг
    ScriptUtils.SetValue(unitCfg, "CanBePlacedWorker", workerObject);
}
