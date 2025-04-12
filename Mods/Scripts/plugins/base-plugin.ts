import { Logger } from "library/common/logging";

/**
 * Базовый класс для плагина.
 */
export default class HordePluginBase {

    // --- Fields -----------------------------------------------

    public name: string;
    public displayName: string;
    public log: Logger;
    public globalStorage: any;  // Хранилище переменных, которое не обнуляется при hot reload

    // --- Initialization -----------------------------------------------

    public constructor(displayName: string) {
        this.displayName = displayName;
        this.name = this.constructor.name;

        this.globalStorage = this.getOrCreateStorage();
        this.log = this.createLogger();
    }

    private createLogger() {
        let log = new Logger();
        log.msgPrefix = `[${this.name}] `;
        return log;
    }

    private getOrCreateStorage() {
        if (DataStorage.plugins[this.name] === undefined) {
            DataStorage.plugins[this.name] = {};
        }
        return DataStorage.plugins[this.name];
    }

    // --- Virtual Methods -----------------------------------------------

    public onFirstRun() {

    }

    public onEveryTick(gameTickNum: number) {

    }
}


/**
 * Заготовка для создания плагина.
 */
export class PLUGIN_TEMPLATE extends HordePluginBase {

    /**
     * Конструктор.
     */
    public constructor() {
        super("__PLUGIN_NAME__");
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {

    }

    /**
     * Метод выполняется каждый игровой такт.
     */
    public onEveryTick(gameTickNum: number) {

    }
}
