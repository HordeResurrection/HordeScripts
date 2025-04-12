import HordePluginBase from "./base-plugin";


/**
 * Базовый класс для скрипта сцены.
 */
export default class ScenaScriptBase extends HordePluginBase {

    // --- Fields -----------------------------------------------

    public scenaName: string;

    // --- Initialization -----------------------------------------------

    public constructor(scenaName: string, displayName: string) {
        super(displayName);
        this.scenaName = scenaName;
    }
}


/**
 * Заготовка для создания скрипта сцены.
 */
export class SCENA_SCRIPT_TEMPLATE extends ScenaScriptBase {

    /**
     * Конструктор.
     */
    public constructor() {
        super("__SCENA_NAME__", "Главный скрипт сцены");
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
