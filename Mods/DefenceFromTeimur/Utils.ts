import { log } from "library/common/logging";
import { createPoint } from "library/common/primitives";

export function CreateUnitConfig(baseConfigUid: string, newConfigUid: string) {
    if (HordeContentApi.HasUnitConfig(newConfigUid)) {
        log.info("GET baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.GetUnitConfig(newConfigUid);
    } else {
        log.info("CREATE baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig(baseConfigUid), newConfigUid);
    }
}

export function CreateBulletConfig(baseConfigUid: string, newConfigUid: string) {
    if (HordeContentApi.HasBulletConfig(newConfigUid)) {
        log.info("GET baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.GetBulletConfig(newConfigUid);
    } else {
        log.info("CREATE baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.CloneConfig(HordeContentApi.GetBulletConfig(baseConfigUid), newConfigUid);
    }
}

export function unitCanBePlacedByRealMap(uCfg, x, y) {
    return uCfg.CanBePlacedByRealMap(ActiveScena.GetRealScena(), x, y);
}

export function ChebyshevDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

export function EuclidDistance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x1 - x2)*(x1 - x2) + (y1 - y2)*(y1 - y2));
}

export function L1Distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

const SpawnUnitParameters = HordeClassLibrary.World.Objects.Units.SpawnUnitParameters;
export function spawnUnits(settlement, uCfg, uCount, direction, generator) {
    let spawnParams = new SpawnUnitParameters();
    spawnParams.ProductUnitConfig = uCfg;
    spawnParams.Direction = direction;

    let outSpawnedUnits: any[] = [];
    for (let position = generator.next(); !position.done && outSpawnedUnits.length < uCount; position = generator.next()) {
        if (unitCanBePlacedByRealMap(uCfg, position.value.X, position.value.Y)) {
            spawnParams.Cell = createPoint(position.value.X, position.value.Y);
            outSpawnedUnits.push(settlement.Units.SpawnUnit(spawnParams));
        }
    }

    return outSpawnedUnits;
}
export function spawnUnit(settlement, uCfg, direction, position) {
    if (unitCanBePlacedByRealMap(uCfg, position.X, position.Y)) {
        let spawnParams = new SpawnUnitParameters();
        spawnParams.ProductUnitConfig = uCfg;
        spawnParams.Direction = direction;
        spawnParams.Cell = createPoint(position.X, position.Y);
        return settlement.Units.SpawnUnit(spawnParams);
    } else {
        return null;
    }
}

export function* generateRandomCellInRect(rectX, rectY, rectW, rectH) {
    let scenaWidth = ActiveScena.GetRealScena().Size.Width;
    let scenaHeight = ActiveScena.GetRealScena().Size.Height;
    // Рандомизатор
    let rnd = ActiveScena.GetRealScena().Context.Randomizer;

    rectX = Math.max(0, rectX);
    rectY = Math.max(0, rectY);
    rectW = Math.min(scenaWidth - rectX, rectW);
    rectH = Math.min(scenaHeight - rectY, rectH);

    let randomNumbers : Array<any> = [];
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
