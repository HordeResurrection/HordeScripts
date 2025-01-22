
// ===================================================
// --- Простые объекты

export const Point2D = HordePrimitives.HordeResurrection.Basic.Primitives.Geometry.Point2D;
export type Point2D = HordeResurrection.Basic.Primitives.Geometry.Point2D;
export const Size2D = HordePrimitives.HordeResurrection.Basic.Primitives.Geometry.Size2D;
export type Size2D = HordeResurrection.Basic.Primitives.Geometry.Size2D;
export const Rect2D = HordePrimitives.HordeResurrection.Basic.Primitives.Geometry.Rect2D;
export type Rect2D = HordeResurrection.Basic.Primitives.Geometry.Rect2D;
export const Box3D = HordePrimitives.HordeResurrection.Basic.Primitives.Geometry.Box3D;
export type Box3D = HordeResurrection.Basic.Primitives.Geometry.Box3D;
export const PreciseFraction = HordePrimitives.HordeResurrection.Basic.Primitives.PreciseFraction;
export type PreciseFraction = HordeResurrection.Basic.Primitives.PreciseFraction;
export const HordeColor = HordePrimitives.HordeResurrection.Basic.Primitives.HordeColor;
export type HordeColor = HordeResurrection.Basic.Primitives.HordeColor;

/**
 * Создаёт объект HordeColor.
 * ClearScript почему-то не увидел имеющийся конструктор, где все цвета задаются аргументами, поэтому сделал через присваивание полей.
 */
export function createHordeColor(a: number, r: number, g: number, b: number): HordeColor {
    let color = new HordeColor();
    color.A = a;
    color.R = r;
    color.G = g;
    color.B = b;
    return color;
}

/**
 * Создаёт объект Point2D
 */
export function createPoint(x: number, y: number): Point2D {
    return new Point2D(x, y);
}

/**
 * Создаёт объект Rect2D
 */
export function createRect(x: number, y: number, w: number, h: number): Rect2D {
    return new Rect2D(x, y, w, h);
}

/**
 * Создаёт объект Box3D
 */
export function createBox(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): Box3D {
    return new Box3D(x1, y1, z1, x2, y2, z2);
}

/**
 * Создаёт объект PreciseFraction
 * Это дробные числа с определенной, не плавающей точностью (сейчас это 3 знака после запятой)
 */
export function createPF(i: number, f: number): PreciseFraction {
    return new PreciseFraction(i, f);
}

// ===================================================
// --- Игровые объекты

export const ResourcesAmount = HordeClassLibrary.World.Simple.ResourcesAmount;
export type ResourcesAmount = HordeClassLibrary.World.Simple.ResourcesAmount;

/**
 * Создаёт объект ResourcesAmount, в котором задано количество ресурсов.
 */
export function createResourcesAmount(gold: number, metal: number, lumber: number, people: number): ResourcesAmount {
    return new ResourcesAmount(gold, metal, lumber, people);
}
