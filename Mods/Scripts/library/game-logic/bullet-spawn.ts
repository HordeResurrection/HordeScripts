import { Point2D } from "library/common/primitives";
import { BulletConfig, BulletEmittingArgs, ShotParams, Unit, UnitArmament, UnitMapLayer } from "./horde-types";

/**
 * Создание одного снаряда в заданных координатах.
 * 
 * Возвращает созданный снаряд.
 */
export function spawnBullet(
    sourceUnit: Unit,
    targetUnit: Unit | null,
    sourceArmament: UnitArmament | null,
    bullCfg: BulletConfig,
    ShotParams: ShotParams,
    launchPos: Point2D,
    targetPos: Point2D,
    targetLayer: UnitMapLayer
) {
    let emittingArgs = new BulletEmittingArgs();
    ScriptUtils.SetValue(emittingArgs, "SourceUnit", sourceUnit);
    ScriptUtils.SetValue(emittingArgs, "TargetUnit", targetUnit);
    ScriptUtils.SetValue(emittingArgs, "SourceArmament", sourceArmament);
    ScriptUtils.SetValue(emittingArgs, "BulletConfig", bullCfg);
    ScriptUtils.SetValue(emittingArgs, "ShotParams", ShotParams);
    ScriptUtils.SetValue(emittingArgs, "LaunchPosition", launchPos);
    ScriptUtils.SetValue(emittingArgs, "TargetPosition", targetPos);
    ScriptUtils.SetValue(emittingArgs, "TargetLayer", targetLayer);

    let emittingArgsVar = host.newVar(BulletEmittingArgs);
    emittingArgsVar.value = emittingArgs;

    let bull = bullCfg.CreateInstance(emittingArgsVar.ref);
    sourceUnit.Scena.ObjectController.RegisterBullet(bull);

    return bull;
}
