import { log } from "library/common/logging";
import { createPoint } from "library/common/primitives";
import { Int32T } from "library/dotnet/dotnet-types";
import { mergeFlags } from "library/dotnet/dotnet-utils";
import { BulletConfig, UnitConfig } from "library/game-logic/horde-types";
import { getUnitProfessionParams, UnitProfession, UnitProducerProfessionParams } from "library/game-logic/unit-professions";

export function CreateUnitConfig(baseConfigUid: string, newConfigUid: string) : UnitConfig {
    if (HordeContentApi.HasUnitConfig(newConfigUid)) {
        //log.info("GET baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.GetUnitConfig(newConfigUid);
    } else {
        //log.info("CREATE baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig(baseConfigUid), newConfigUid) as UnitConfig;
    }
}

export function CreateBulletConfig(baseConfigUid: string, newConfigUid: string) : BulletConfig{
    if (HordeContentApi.HasBulletConfig(newConfigUid)) {
        //log.info("GET baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.GetBulletConfig(newConfigUid);
    } else {
        //log.info("CREATE baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.CloneConfig(HordeContentApi.GetBulletConfig(baseConfigUid), newConfigUid) as BulletConfig;
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

/**
 * Складывает массив enum-флагов в один флаг.
 * Функция нужна из-за того, что здесь в js не получается использовать перегруженный оператор "|".
 * 
 * @param flagsType тип флага. Задаётся отдельно, т.к. нельзя использовать "GetType()" без GodMode.
 * @param flags массив флагов, которые нужно объединить
 */
export function removeFlags(flagsType: object, flagsInput: any, ...removeFlagsArray: any[]): any {
    let mask = 0;
    for (let f of removeFlagsArray) {
        mask |= host.cast(Int32T, f) as number;
    }
    mask = ~mask;

    return host.cast(flagsType, (flagsInput as number) & mask);
}

export function formatStringStrict(template: string, params: any[]): string {
    return template.replace(/\{(\d+)\}/g, (_, index) => 
        params[Number(index)] !== undefined ? params[Number(index)] : "N/A"
    );
}

/** добавить профессию найма юнитов, если была добавлена, то установит точки выхода и очистит список построек */
export function CfgAddUnitProducer(Cfg: UnitConfig) {
    // даем профессию найм войнов при отсутствии
    if (!getUnitProfessionParams(Cfg, UnitProfession.UnitProducer)) {
        var donorCfg = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Barrack")) as UnitConfig;
        var prof_unitProducer = getUnitProfessionParams(donorCfg, UnitProfession.UnitProducer);
        Cfg.ProfessionParams.Item.set(UnitProfession.UnitProducer, prof_unitProducer);
        
        if (Cfg.BuildingConfig == null) {
            ScriptUtils.SetValue(Cfg, "BuildingConfig", donorCfg.BuildingConfig);
        }

        // добавляем точки выхода
        if (Cfg.BuildingConfig.EmergePoint == null) {
            ScriptUtils.SetValue(Cfg.BuildingConfig, "EmergePoint", createPoint(0, 0));
        }
        if (Cfg.BuildingConfig.EmergePoint2 == null) {
            ScriptUtils.SetValue(Cfg.BuildingConfig, "EmergePoint2", createPoint(0, 0));
        }

        // очищаем список
        var producerParams = Cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        // @ts-expect-error
        var produceList    = producerParams.CanProduceList;
        produceList.Clear();

        HordeContentApi.RemoveConfig(donorCfg);
    }
}