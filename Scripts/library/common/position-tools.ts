import { Point2D } from "./primitives";

const GeometryPresets = HordeClassLibrary.World.Geometry.GeometryPresets;
type GeometryPresets = HordeClassLibrary.World.Geometry.GeometryPresets;

/**
 * Позицию в пикселях переводит в координаты клетки
 */
export function positionToCell(position: Point2D): Point2D {
    return GeometryPresets.PositionToCell(position);
}


/**
 * Переводит координаты клетки в позицию (т.е. координаты центра клетки в пикселях)
 */
export function cellToCenterPosition(cell: Point2D): Point2D {
    return GeometryPresets.CellToCenterPosition(cell);
}


/**
 * Генератор позиций вокруг точки по спирале в рамках сцены
 */
export function* generateCellInSpiral(centerX: number, centerY: number): Generator<{ X: number, Y: number }> {
    let scenaWidth = ActiveScena.GetRealScena().Size.Width;
    let scenaHeight = ActiveScena.GetRealScena().Size.Height;

    // проецируем точку внутрь сцены
    centerX = Math.min(Math.max(0, centerX), scenaWidth - 1);
    centerY = Math.min(Math.max(0, centerY), scenaHeight - 1);

    yield { X: centerX, Y: centerY };

    let x = 0;
    let y = 0;
    let spawnRadius = 1;

    // флаг, что позиции вышли за сцену
    let outside = false;
    while (!outside) {
        outside = true;

        // верхняя часть
        y = centerY - spawnRadius;
        if (y >= 0) {
            outside = false;
            let xStart = Math.max(centerX - spawnRadius, 0);
            let xEnd = Math.min(centerX + spawnRadius, scenaWidth - 1);
            for (x = xStart; x <= xEnd; x++) {
                yield { X: x, Y: y };
            }
        }

        // правая часть
        x = centerX + spawnRadius;
        if (x < scenaWidth) {
            outside = false;
            let yStart = Math.max(centerY - spawnRadius + 1, 0);
            let yEnd = Math.min(centerY + spawnRadius - 1, scenaHeight - 1);
            for (y = yEnd; y >= yStart; y--) {
                yield { X: x, Y: y };
            }
        }

        // нижняя часть
        y = centerY + spawnRadius;
        if (y < scenaHeight) {
            outside = false;
            let xStart = Math.max(centerX - spawnRadius, 0);
            let xEnd = Math.min(centerX + spawnRadius, scenaWidth - 1);
            for (x = xEnd; x >= xStart; x--) {
                yield { X: x, Y: y };
            }
        }

        // левая часть
        x = centerX - spawnRadius;
        if (x >= 0) {
            outside = false;
            let yStart = Math.max(centerY - spawnRadius + 1, 0);
            let yEnd = Math.min(centerY + spawnRadius - 1, scenaHeight - 1);
            for (y = yStart; y <= yEnd; y++) {
                yield { X: x, Y: y };
            }
        }

        spawnRadius++;
    }
    return;
}


/**
 * Генератор рандомных позиций в прямоугольнике в рамках сцены
 */
export function* generateRandomCellInRect(rectX: number, rectY: number, rectW: number, rectH: number): Generator<{ X: number, Y: number }> {
    let scenaWidth = ActiveScena.GetRealScena().Size.Width;
    let scenaHeight = ActiveScena.GetRealScena().Size.Height;
    // Рандомизатор
    let rnd = ActiveScena.GetRealScena().Context.Randomizer;

    rectX = Math.max(0, rectX);
    rectY = Math.max(0, rectY);
    rectW = Math.min(scenaWidth - rectX, rectW);
    rectH = Math.min(scenaHeight - rectY, rectH);

    let randomNumbers: { X: number, Y: number }[] = [];
    for (let x = rectX; x < rectX + rectW; x++) {
        for (let y = rectY; y < rectY + rectH; y++) {
            randomNumbers.push({ X: x, Y: y });
        }
    }

    while (randomNumbers.length > 0) {
        let num = rnd.RandomNumber(0, randomNumbers.length - 1);
        let randomNumber = randomNumbers[num];
        randomNumbers.splice(num, 1);
        yield randomNumber;
    }

    return;
}

export function* generateCellInRect(rectX: number, rectY: number, rectW: number, rectH: number): Generator<{ X: number, Y: number }> {
    let scenaWidth = ActiveScena.GetRealScena().Size.Width;
    let scenaHeight = ActiveScena.GetRealScena().Size.Height;

    rectX = Math.max(0, rectX);
    rectY = Math.max(0, rectY);
    rectW = Math.min(scenaWidth - rectX, rectW);
    rectH = Math.min(scenaHeight - rectY, rectH);

    for (var x = rectX; x < rectX + rectW; x++) {
        for (var y = rectY; y < rectY + rectH; y++) {
            yield { X: x, Y: y };
        }
    }

    return;
}
