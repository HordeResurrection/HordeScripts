import { spawnString } from "library/game-logic/decoration-spawn";
import HordeExampleBase from "./base-example";
import { createHordeColor, createPoint } from "library/common/primitives";
import { DrawLayer, FontUtils } from "library/game-logic/horde-types";

/**
 * Пример отбражения строки на поле боя.
 */
export class Example_StringDecoration extends HordeExampleBase {
    private decorationString: any;
    private center: {x, y};
    private startTick: number;

    /**
     * Конструктор.
     */
    public constructor() {
        super("String decoration");

        this.center = {x: 600, y: 600};
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
        let position = createPoint(this.center.x, this.center.y);
        this.decorationString = spawnString(ActiveScena, "Привет ОРДА !!!", position);
        this.globalStorage.decorationString = this.decorationString;

        // Установка параметров
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
        const TTL = 2000;

        let t = gameTickNum - this.startTick;
        if (t >= TTL) {
            this.decorationString.Free();
            return;
        }

        let a = 2 * pi * t / T;
        let r = 10 + 2 * a;

        let x = Math.floor(r * Math.cos(a));
        let y = Math.floor(r * Math.sin(a));

        this.decorationString.Text = `Привет ОРДА !!!\nЭто что? Буквы в Орде?!\n${Math.floor((TTL - t) / 10) / 10}`;
        this.decorationString.PositionInt = createPoint(this.center.x + x, this.center.y + y);
    }
}
