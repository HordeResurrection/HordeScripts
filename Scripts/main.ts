import "/library/dotnet/dotnet-utils.ts"
import { log } from "library/common/logging";
import { activePlugins } from "active-plugins";
import { registerExamples } from "examples-runner";


/**
 * Этот блок выполняется только при первом запуске скрипт-машины, т.е. только один раз сразу после загрузки сцены.
 * Здесь следует выполнять инициализацию глобальных переменных, которые НЕ будут очищаться при hot-reload.
 */
if (DataStorage.initialized === undefined) {

    DataStorage.plugins = {};
    DataStorage.reloadCounter = 0;
    DataStorage.initialized = true;
}


/**
 * Вызывается до вызова "onFirstRun()" при первом запуске скрипт-машины, а так же при hot-reload
 */
export function onInitialization() {
    // Setup globals
    DataStorage.reloadCounter = ++DataStorage.reloadCounter || 1;
    DataStorage.scriptWorkTicks = 0;
    DataStorage.gameTickNum = Battle.GameTimer.GameFramesCounter;

    // Установка дебаг-параметров
    ScriptMachineDebugApi.SetHotReloadOnFileChanging(false);  // автоматическая перезагрузка скрипта при изменении файла

    // Инициализация плагинов
    activePlugins.clear();
    activePlugins.registerDefaultPlugins();

    // Регистрация примеров. Настройка запускаемых примеров находится в файле "examples-runner.ts"
    registerExamples();
}


/**
 * Вызывается при первом запуске скрипт-машины, а так же при hot-reload
 */
export function onFirstRun() {
    log.info("Scripts running... (Start number:", DataStorage.reloadCounter, ")");

    // Запук плагинов
    activePlugins.onFirstRun();
}


/**
 * Вызывается каждый игровой такт
 */
export function onEveryTick(gameTickNum: number) {
    // Update globals
    DataStorage.scriptWorkTicks += 1;
    DataStorage.gameTickNum = gameTickNum;

    // Работа плагинов
    activePlugins.onEveryTick(gameTickNum);
}
