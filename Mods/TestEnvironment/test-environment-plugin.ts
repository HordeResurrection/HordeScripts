import HordePluginBase from "plugins/base-plugin";


/**
 * Плагин для тестов и отладочных действий.
 */
export class TestEnvironmentPlugin extends HordePluginBase {
    startTick: number;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Test environment");
        this.startTick = DataStorage.gameTickNum;
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        // Empty
    }

    /**
     * Метод выполняется каждый игровой такт.
     */
    public onEveryTick(gameTickNum: number) {
        // Empty
    }
}

