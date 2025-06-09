import { ScriptUnitWorkerGetOrder, ScriptUnitWorkerCanBePlaced, ScriptUnitWorkerState, BulletConfig, BaseBullet, BulletEmittingArgs, UnitConfig, UnitState, Unit, ACommandArgs, Settlement, Scena } from "./horde-types";


// ===================================================
// --- Bullets

/**
 * Установить инициализирующий обработчик для снаряда.
 */
export function setBulletInitializeWorker(
    baseName: string,
    bulletCfg: BulletConfig,
    workerFunc: (bull: BaseBullet, emitArgs: BulletEmittingArgs) => void
) {
    const workerName = baseName + '_InitializeBullet';
    const workerTypeName = "InitializeFuncName";
    setBulletWorker(bulletCfg, workerTypeName, workerName, workerFunc);
}

/**
 * Установить обработчик снаряда на каждый такт.
 */
export function setBulletProcessWorker(
    baseName: string,
    bulletCfg: BulletConfig,
    workerFunc: (bull: BaseBullet) => void
) {
    const workerName = baseName + '_ProcessBullet';
    const workerTypeName = "ProcessFuncName";
    setBulletWorker(bulletCfg, workerTypeName, workerName, workerFunc);
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
    // Запись функции-обработчика в реестр
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
    baseName: string,
    unitCfg: UnitConfig,
    unitState: UnitState,
    workerFunc: (unit: Unit) => void
) {
    const workerName = `${baseName}_${unitState}Worker`

    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    UnitWorkersRegistry.Register(workerName, workerFunc);

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
    baseName: string,
    unitCfg: UnitConfig,
    workerFunc: (unit: Unit, cmdArgs: ACommandArgs) => boolean
) {
    const workerName = `${baseName}_GetOrderWorker`

    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    UnitWorkersRegistry.Register(workerName, workerFunc);

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
    baseName: string,
    unitCfg: UnitConfig,
    func_canBePlacedByKnownMap: (settlement: Settlement, uCfg: UnitConfig, x: number, y: number, size1x1: boolean, considerUnit: boolean) => void,
    func_canBePlacedByRealMap: (scena: Scena, uCfg: UnitConfig, x: number, y: number, size1x1: boolean, considerUnit: boolean) => void
) {
    const name_canBePlacedByKnownMap = `${baseName}_CanBePlacedByKnownMap`;
    const name_canBePlacedByRealMap = `${baseName}_CanBePlacedByRealMap`;

    // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
    UnitWorkersRegistry.Register(name_canBePlacedByKnownMap, func_canBePlacedByKnownMap);
    UnitWorkersRegistry.Register(name_canBePlacedByRealMap, func_canBePlacedByRealMap);

    // Объект-обработчик
    const workerObject = new ScriptUnitWorkerCanBePlaced();
    ScriptUtils.SetValue(workerObject, "ByKnownMapFuncName", name_canBePlacedByKnownMap);
    ScriptUtils.SetValue(workerObject, "ByRealMapFuncName", name_canBePlacedByRealMap);

    // Установка обработчика в конфиг
    ScriptUtils.SetValue(unitCfg, "CanBePlacedWorker", workerObject);
}
