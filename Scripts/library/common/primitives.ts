
// ===================================================
// --- Простые объекты

const PrimitivesNS = HordePrimitives.HordeResurrection.Basic.Primitives;
export const Point2D = PrimitivesNS.Geometry.Point2D;
export const Size2D = PrimitivesNS.Geometry.Size2D;
export const Rect2D = PrimitivesNS.Geometry.Rect2D;
export const Box3D = PrimitivesNS.Geometry.Box3D;
export const PreciseFraction = PrimitivesNS.PreciseFraction;
export const HordeColor = PrimitivesNS.HordeColor;

/**
 * Создаёт объект HordeColor.
 * ClearScript почему-то не увидел имеющийся конструктор, где все цвета задаются аргументами, поэтому сделал через присваивание полей.
 */
export function createHordeColor(a: number, r: number, g: number, b: number) {
    let color = host.newObj(HordeColor);
    color.A = a;
    color.R = r;
    color.G = g;
    color.B = b;
    return color;
}

/**
 * Создаёт объект Point2D
 */
export function createPoint(x: number, y: number) {
    return host.newObj(Point2D, x, y);
}

/**
 * Создаёт объект Rect2D
 */
export function createRect(x: number, y: number, w: number, h: number) {
    return host.newObj(Rect2D, x, y, w, h);
}

/**
 * Создаёт объект Box3D
 */
export function createBox(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
    return host.newObj(Box3D, x1, y1, z1, x2, y2, z2);
}

/**
 * Создаёт объект PreciseFraction
 * Это дробные числа с определенной, не плавающей точностью (сейчас это 3 знака после запятой)
 */
export function createPF(i: number, f: number) {
    return host.newObj(PreciseFraction, i, f);
}

// ===================================================
// --- Игровые объекты

export const ResourcesAmount = HCL.HordeClassLibrary.World.Simple.ResourcesAmount;

/**
 * Создаёт объект ResourcesAmount, в котором задано количество ресурсов.
 */
export function createResourcesAmount(gold: number, metal: number, lumber: number, people: number) {
    return host.newObj(ResourcesAmount, gold, metal, lumber, people);
}
