import { spawnGeometry } from "library/game-logic/decoration-spawn";
import HordeExampleBase from "./base-example";
import { createPoint } from "library/common/primitives";
import { GeometryCanvas, GeometryVisualEffect, Stride_Color, Stride_Vector2, UnitHealthLevel } from "library/game-logic/horde-types";

/**
 * Пример отбражения геометрии на поле боя.
 */
export class Example_GeometryDecoration extends HordeExampleBase {
    private geometryDecoration: any;
    private center: any;
    private startTick: number;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Geometry decoration");

        this.center = createPoint(500, 500);
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        this.logMessageOnRun();

        this.startTick = DataStorage.gameTickNum;

        // Удаляем предыдущую декорацию (если был hotreload)
        if (this.globalStorage.geometryDecoration)
            this.globalStorage.geometryDecoration.Free();
        
        // Создаём буфер геометрии (данные для видеокарты)
        let geometryBuffer = this._makeGeometry(new Stride_Color(0x88, 0xf0, 0xf0), 1.0, true);

        // Создаём новую декорацию (объект в игре)
        let position = this.center;
        let ticksToLive = GeometryVisualEffect.InfiniteTTL;
        this.geometryDecoration = spawnGeometry(ActiveScena, geometryBuffer, position, ticksToLive);
        this.globalStorage.geometryDecoration = this.geometryDecoration;
    }

    /**
     * Метод выполняется каждый игровой такт.
     */
    public onEveryTick(gameTickNum: number) {
        
        // Перемещение декорации
        let t = DataStorage.gameTickNum - this.startTick;
        if ((t / 10) % 200 < 100) {
            this.geometryDecoration.Position = createPoint(Math.floor(this.center.X + (t / 10) % 100), this.center.Y);
        } else {
            this.geometryDecoration.Position = createPoint(Math.floor(this.center.X + 100 - (t / 10) % 100), this.center.Y);
        }

        // Пересоздание буфера геометрии с учетом течения времени - имитация движения
        let geometryBuffer = this._makeGeometry(new Stride_Color(0x88, 0xf0, 0xf0), 1.0, true);
        this.geometryDecoration.GeometryBuffer = geometryBuffer;
        
        // Внимание!
        // Пересоздание геометрии каждый такт может оказаться тяжелой операцией.
        // По возможности следует кешировать буфер геометрии.
    }

    /**
     * Код для формирования низкоуровневого буфера с геометрией.
     */
    private _makeGeometry(color, thickness: number, antiAliased: boolean) {

        let t = DataStorage.gameTickNum - this.startTick;
        let position = this._getRadialPosition(t, 100);

        // Объект для низкоуровневого формирования геометрии
        let geometryCanvas = new GeometryCanvas();

        // Рисуем линию
        geometryCanvas.DrawLine(new Stride_Vector2(0, 0), position, color, thickness, antiAliased);

        // Рисуем окружность
        geometryCanvas.DrawCircleFast(position, 7, color, thickness, false);

        // Можно использовать встроенные заготовки, но для них уже заранее заданы цвет, толщина линий и другие параметры.
        // (Таким же образом можно делать и свои заготовки)
        const UnitInForestTemplates = xHost.type(ScriptUtils.GetTypeByName("HordeResurrection.Game.Render.GeometryCanvas.UnitInForestTemplates", "HordeResurrection.Game"));
        let inForestGeometryBuffer = UnitInForestTemplates.GetFigure(UnitHealthLevel.Good);
        for (let i = 0; i < 12; i++) {
            geometryCanvas.PlaceTemplateAt(inForestGeometryBuffer, this._getRadialPosition(i * 40, 10 + (t + i * 10) % 100));
        }

        // Результат - буфер с вершинами и индексами для видеокарты
        let geometryBuffer = geometryCanvas.GetBuffers();

        return geometryBuffer;
    }

    private _getRadialPosition(t: number, r: number) {
        const pi = 3.14;
        const T = 480;

        let a = 2 * pi * t / T;
        let x = Math.floor(r * Math.cos(a));
        let y = Math.floor(r * Math.sin(a));

        return new Stride_Vector2(x, y);
    }
}
