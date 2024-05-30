import { log } from "library/common/logging";
import { generateCellInSpiral } from "library/common/position-tools";
import { createPoint } from "library/common/primitives";
import { PointCommandArgs } from "library/game-logic/horde-types";
import { Cell } from "./Types/Geometry";

export function CreateConfig(baseConfigUid: string, newConfigUid: string) {
    if (HordeContentApi.HasUnitConfig(newConfigUid)) {
        log.info("GET baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.GetUnitConfig(newConfigUid);
    } else {
        log.info("CREATE baseConfigUid ", baseConfigUid, " newConfigUid ", newConfigUid);
        return HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig(baseConfigUid), newConfigUid);
    }
}

export function UnitGiveOrder(unit: any, cell: Cell, command: any, orderMode: any) {
    // позиция для атаки цели
    var goalPosition;
    {
        var generator = generateCellInSpiral(cell.X, cell.Y);
        for (goalPosition = generator.next(); !goalPosition.done; goalPosition = generator.next()) {
            if (unitCanBePlacedByRealMap(unit.Cfg, goalPosition.value.X, goalPosition.value.Y)) {
                break;
            }
        }
    }
    var pointCommandArgs = new PointCommandArgs(createPoint(goalPosition.value.X, goalPosition.value.Y), command, orderMode);
    // отдаем приказ
    unit.Cfg.GetOrderDelegate(unit, pointCommandArgs);
}

export function unitCanBePlacedByRealMap(uCfg, x, y) {
    return uCfg.CanBePlacedByRealMap(ActiveScena.GetRealScena(), x, y);
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
