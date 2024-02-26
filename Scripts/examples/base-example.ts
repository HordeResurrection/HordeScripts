import HordePluginBase from "plugins/base-plugin";

/**
 * Базовый класс для скрипта-примера.
 */
export default class HordeExampleBase extends HordePluginBase {
    public exampleDisplayName: string;

    public constructor(exampleDisplayName: string) {
        super('[Example] ' + exampleDisplayName);
        this.exampleDisplayName = exampleDisplayName;
    }

    /**
     * Отображает сообщение, что пример запущен.
     */
    protected logMessageOnRun() {
        this.logi('> Запущен пример', '"' + this.exampleDisplayName + '"');
    }
}


/**
 * Заготовка для создания примера.
 */
export class Example_TEMPLATE extends HordeExampleBase {

    /**
     * Конструктор.
     */
    public constructor() {
        super("__NAME__");
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        this.logMessageOnRun();
    }

    /**
     * Метод выполняется каждый игровой такт.
     */
    public onEveryTick(gameTickNum: number) {
        
    }
}
