import { ScriptUnitWorkerGetOrder, ScriptUnitWorkerCanBePlaced, ScriptUnitWorkerState } from "./horde-types";


// ===================================================
// --- Bullets

/**
 * Установить инициализирующий обработчик для снаряда на основе метода из плагина.
 */
export function setBulletInitializeWorker(plugin, bulletCfg, workerFunc) {
    const workerName = plugin.name + '_InitializeBullet'
    const workerTypeName = "InitializeFuncName";
    const workerWrapper = (bull, emitArgs) => workerFunc.call(plugin, bull, emitArgs);
    setBulletWorker(bulletCfg, workerTypeName, workerName, workerWrapper);
}

/**
 * Установить обработчик снаряда на каждый такт на основе метода из плагина.
 */
export function setBulletProcessWorker(plugin, bulletCfg, workerFunc) {
    const workerName = plugin.name + '_ProcessBullet'
    const workerTypeName = "ProcessFuncName";
    const workerWrapper = (bull) => workerFunc.call(plugin, bull);
    setBulletWorker(bulletCfg, workerTypeName, workerName, workerWrapper);
}

/**
 * Вспомогательный метод для установки обработчика на основе произвольной функции.
 * 
 * Примечание: эту функцию можно использовать для задания обработчика без привязки к плагину.
 */
export function setBulletWorker(bulletCfg, workerTypeName: string, workerName: string, workerFunc){
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
export function setUnitStateWorker(plugin, unitCfg, unitState, workerFunc) {
    const workerName = `${plugin.name}_${unitState}Worker`

    // Обертка для метода из плагина, чтобы работал "this"
    const workerWrapper = (u) => workerFunc.call(plugin, u);

    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    UnitWorkersRegistry.Register(workerName, workerWrapper);

    // Объект-обработчик
    const workerObject = host.newObj(ScriptUnitWorkerState);
    
    // Установка функции-обработчика
    ScriptUtils.SetValue(workerObject, "FuncName", workerName);

    // Установка обработчика в конфиг
    const stateWorkers = ScriptUtils.GetValue(unitCfg, "StateWorkers");
    stateWorkers.Item.set(unitState, workerObject);
}

/**
 * Установить обработчик получения приказа для юнита на основе метода из плагина.
 */
export function setUnitGetOrderWorker(plugin, unitCfg, workerFunc) {
    const workerName = `${plugin.name}_GetOrderWorker`

    // Обертка для метода из плагина, чтобы работал "this"
    const workerWrapper = (u, cmdArgs) => workerFunc.call(plugin, u, cmdArgs);

    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    UnitWorkersRegistry.Register(workerName, workerWrapper);

    // Объект-обработчик
    const workerObject = host.newObj(ScriptUnitWorkerGetOrder);
    
    // Установка функции-обработчика
    ScriptUtils.SetValue(workerObject, "FuncName", workerName);

    // Установка обработчика в конфиг
    unitCfg.GetOrderWorker = workerObject;
}

/**
 * Установить CanBePlaced-обработчик для юнита на основе метода из плагина.
 */
export function setUnitCanBePlacedWorker(plugin, unitCfg, func_canBePlacedByKnownMap, func_canBePlacedByRealMap) {
    const name_canBePlacedByKnownMap = `${plugin.name}_CanBePlacedByKnownMap`;
    const name_canBePlacedByRealMap = `${plugin.name}_CanBePlacedByRealMap`;

    // Обертка для метода из плагина, чтобы работал "this"
    const wrapper_canBePlacedByKnownMap = (settlement, uCfg, x, y, size1x1, considerUnit) => func_canBePlacedByKnownMap.call(plugin, settlement, uCfg, x, y, size1x1, considerUnit);
    const wrapper_canBePlacedByRealMap = (scena, uCfg, x, y, size1x1, considerUnit) => func_canBePlacedByRealMap.call(plugin, scena, uCfg, x, y, size1x1, considerUnit);

    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    UnitWorkersRegistry.Register(name_canBePlacedByKnownMap, wrapper_canBePlacedByKnownMap);
    UnitWorkersRegistry.Register(name_canBePlacedByRealMap, wrapper_canBePlacedByRealMap);

    // Объект-обработчик
    const workerObject = host.newObj(ScriptUnitWorkerCanBePlaced);
    ScriptUtils.SetValue(workerObject, "ByKnownMapFuncName", name_canBePlacedByKnownMap);
    ScriptUtils.SetValue(workerObject, "ByRealMapFuncName", name_canBePlacedByRealMap);

    // Установка обработчика в конфиг
    ScriptUtils.SetValue(unitCfg, "CanBePlacedWorker", workerObject);
}
