import { spawnGeometry } from "library/game-logic/decoration-spawn";
import HordeExampleBase from "./base-example";
import { createPoint, Point2D } from "library/common/primitives";
import { GeometryCanvas, GeometryVisualEffect, Stride_Color, Stride_Vector2, UnitHealthLevel } from "library/game-logic/horde-types";

/**
 * Пример отбражения геометрии на поле боя.
 */
export class Example_GeometryDecoration extends HordeExampleBase {
    private geometryDecoration: GeometryVisualEffect;
    private center: Point2D;
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
        let geometryBuffer = this._makeGeometry();

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

        // Перемещение декорации.
        // Здесь код траектории по периметру треугольника
        const dist = 100;
        const stages = 3;
        let t = DataStorage.gameTickNum - this.startTick;
        let stage = Math.floor(((t / 10) % (stages * dist)) / dist);
        if (stage == 0) {
            this.geometryDecoration.Position = createPoint(
                Math.floor(this.center.X + (t / 10) % dist),
                this.center.Y
            );
        } else if (stage == 1) {
            this.geometryDecoration.Position = createPoint(
                this.center.X + dist,
                Math.floor(this.center.Y - (t / 10) % dist)
            );
        } else if (stage == 2) {
            this.geometryDecoration.Position = createPoint(
                Math.floor(this.center.X + dist - (t / 10) % dist),
                Math.floor(this.center.Y - dist + (t / 10) % dist),
            );
        }

        // Пересоздание буфера геометрии с учетом течения времени - имитация движения
        let geometryBuffer = this._makeGeometry();
        this.geometryDecoration.GeometryBuffer = geometryBuffer;

        // Внимание!
        // Пересоздание геометрии каждый такт может оказаться тяжелой операцией.
        // По возможности следует кешировать буфер геометрии.
    }

    /**
     * Код для формирования низкоуровневого буфера с геометрией.
     */
    private _makeGeometry() {

        const thickness = 1.0;
        const antiAliased = false;  // Можно установить сглаживание, но будет мыльно

        const N = 12;
        let t = DataStorage.gameTickNum - this.startTick;
        let position = this._getRadialPosition(t, 100);

        // Объект для низкоуровневого формирования геометрии
        let geometryCanvas = new GeometryCanvas();

        // Рисуем линию
        let color = new Stride_Color(0x88, 0xf0, 0xf0);
        geometryCanvas.DrawLine(new Stride_Vector2(0, 0), position, color, thickness, antiAliased);

        // Рисуем заполненный круг
        let radius = 7;
        let numSegments = 5;  // Если задать малое количество сегментов окружности, то получится правильный многоугольник
        color = new Stride_Color(0x88, 0xf0, 0xf0, 0xa0);
        geometryCanvas.DrawCircleFilled(position, radius, color, numSegments, antiAliased);

        // Можно использовать встроенные заготовки, но для них уже заранее заданы цвет, толщина линий и другие параметры.
        // (Таким же образом можно делать и свои заготовки)
        const UnitInForestTemplates = HordeGame.HordeResurrection.Game.Render.GeometryCanvas.UnitInForestTemplates;
        let inForestGeometryBuffer = UnitInForestTemplates.GetFigure(UnitHealthLevel.Good);
        for (let i = 0; i < N; i++) {
            position = this._getRadialPosition(i * 40, 10 + (t % 100 + i * 6) % 100);
            geometryCanvas.PlaceTemplateAt(inForestGeometryBuffer, position);
        }

        // Рисуем ломаную линию
        let points = host.newArr(Stride_Vector2, N) as Stride_Vector2[];
        for (let i = 0; i < N; i++) {
            position = this._getRadialPosition((i + t / 2) * 10, 120);
            points[i] = position;
        }
        color = new Stride_Color(0x88, 0xf0, 0xf0);
        geometryCanvas.DrawPolyLine(points, color, thickness * 2, antiAliased);

        // Рисуем заполненный четырехугольник
        let a = 8;
        let v1 = Stride_Vector2.Add(points[0], new Stride_Vector2(0, -a));
        let v2 = Stride_Vector2.Add(points[0], new Stride_Vector2(a, 0));
        let v3 = Stride_Vector2.Add(points[0], new Stride_Vector2(0, a));
        let v4 = Stride_Vector2.Add(points[0], new Stride_Vector2(-a, 0));
        color = new Stride_Color(0x88, 0xf0, 0xf0);
        geometryCanvas.DrawQuadFilled(v1, v2, v3, v4, color, antiAliased);

        // Рисуем окружность
        color = new Stride_Color(0x88, 0xf0, 0xf0);
        position = points[N - 1];
        radius = 5;
        geometryCanvas.DrawCircleFast(position, radius, color, thickness, antiAliased);

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
