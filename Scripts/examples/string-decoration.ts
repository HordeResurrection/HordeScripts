import { spawnString } from "library/game-logic/decoration-spawn";
import HordeExampleBase from "./base-example";
import { createHordeColor, createPoint } from "library/common/primitives";
import { DrawLayer, FontUtils } from "library/game-logic/horde-types";

/**
 * Пример отбражения строки на поле боя.
 */
export class Example_StringDecoration extends HordeExampleBase {
    private decorationString: any;
    private center: any;
    private startTick: number;

    /**
     * Конструктор.
     */
    public constructor() {
        super("String decoration");

        this.center = createPoint(600, 600);
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        this.logMessageOnRun();

        this.startTick = DataStorage.gameTickNum;

        // Удаляем предыдущую строку (если был hotreload)
        if (this.globalStorage.decorationString)
            this.globalStorage.decorationString.Free();
        
        // Создаём новую строку
        let position = this.center;
        let ticksToLive = 2000;
        this.decorationString = spawnString(ActiveScena, "Привет ОРДА !!!", position, ticksToLive);
        this.globalStorage.decorationString = this.decorationString;

        // Установка графических параметров
        this.decorationString.Height = 18;
        this.decorationString.Color = createHordeColor(255, 100, 255, 100);
        this.decorationString.DrawLayer = DrawLayer.Birds;  // Отображать поверх всех юнитов
        
        // Выбор шрифта:
        this.decorationString.Font = FontUtils.DefaultFont;        // Шрифт Северного Ветра (нельзя изменить высоту букв)
        this.decorationString.Font = FontUtils.DefaultVectorFont;  // Шрифт, что используется в чате
        // Если потребуется использование других шрифтов, то расскажу отдельно
    }

    /**
     * Метод выполняется каждый игровой такт.
     */
    public onEveryTick(gameTickNum: number) {
        const pi = 3.14;
        const T = 500;

        let t = gameTickNum - this.startTick;
        let a = 2 * pi * t / T;
        let r = 10 + 2 * a;

        let x = Math.floor(r * Math.cos(a));
        let y = Math.floor(r * Math.sin(a));

        let ttl = this.decorationString.TicksToLive;
        this.decorationString.Text = `Привет ОРДА !!!\nЭто что? Буквы в Орде?!\n${Math.floor(ttl / 10) / 10}`;
        this.decorationString.PositionInt = createPoint(this.center.X + x, this.center.Y + y);
    }
}
