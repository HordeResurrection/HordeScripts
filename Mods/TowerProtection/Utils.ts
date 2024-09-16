import { log } from "library/common/logging";
import { generateCellInSpiral } from "library/common/position-tools";
import { createPoint } from "library/common/primitives";
import { PointCommandArgs } from "library/game-logic/horde-types";
import { Cell } from "./Types/Geometry";
import { getUnitProfessionParams, UnitProfession } from "library/game-logic/unit-professions";

export function CreateUnitConfig(baseConfigUid: string, newConfigUid: string) {
    // при наличии конфига удаляем его
    if (HordeContentApi.HasUnitConfig(newConfigUid)) {
        //HordeContentApi.RemoveConfig(HordeContentApi.GetUnitConfig(newConfigUid));
        return HordeContentApi.GetUnitConfig(newConfigUid);
    }
    return HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig(baseConfigUid), newConfigUid);
}

export function CreateBulletConfig(baseConfigUid: string, newConfigUid: string) {
    // при наличии конфига удаляем его
    if (HordeContentApi.HasBulletConfig(newConfigUid)) {
        //HordeContentApi.RemoveConfig(HordeContentApi.GetBulletConfig(newConfigUid));
        return HordeContentApi.GetBulletConfig(newConfigUid);
    }
    return HordeContentApi.CloneConfig(HordeContentApi.GetBulletConfig(baseConfigUid), newConfigUid);
}

export function unitCanBePlacedByRealMap(uCfg, x, y) {
    return uCfg.CanBePlacedByRealMap(ActiveScena.GetRealScena(), x, y, false, true);
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

const SpawnUnitParameters = HCL.HordeClassLibrary.World.Objects.Units.SpawnUnitParameters;
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

/** добавить профессию найма юнитов */
export function CfgAddUnitProducer(Cfg: any) {
    // даем профессию найм войнов при отсутствии
    if (!getUnitProfessionParams(Cfg, UnitProfession.UnitProducer)) {
        var donorCfg = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Barrack"));
        var prof_unitProducer = getUnitProfessionParams(donorCfg, UnitProfession.UnitProducer);
        Cfg.ProfessionParams.Item.set(UnitProfession.UnitProducer, prof_unitProducer);
        
        // if (Cfg.BuildingConfig.EmergePoint == null) {
        //     ScriptUtils.SetValue(Cfg.BuildingConfig, "EmergePoint", createPoint(0, 0));
        // }
        // if (Cfg.BuildingConfig.EmergePoint2 == null) {
        //     ScriptUtils.SetValue(Cfg.BuildingConfig, "EmergePoint2", createPoint(0, 0));
        // }
        HordeContentApi.RemoveConfig(donorCfg);
    }
}