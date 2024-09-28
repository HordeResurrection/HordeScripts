
/**
 * Создание одного снаряда в заданных координатах.
 * 
 * Возвращает созданный снаряд.
 */
export function spawnBullet(sourceUnit, targetUnit, sourceArmament, bullCfg, ShotParams, launchPos, targetPos, targetLayer) {
    const csType = ScriptUtils.GetTypeByName("HordeClassLibrary.World.Objects.Bullets.BulletEmittingArgs, HordeClassLibrary");
    let emittingArgs = ScriptUtils.CreateInstance(csType);
    ScriptUtils.SetValue(emittingArgs, "SourceUnit", sourceUnit);
    ScriptUtils.SetValue(emittingArgs, "TargetUnit", targetUnit);
    ScriptUtils.SetValue(emittingArgs, "SourceArmament", sourceArmament);
    ScriptUtils.SetValue(emittingArgs, "BulletConfig", bullCfg);
    ScriptUtils.SetValue(emittingArgs, "ShotParams", ShotParams);
    ScriptUtils.SetValue(emittingArgs, "LaunchPosition", launchPos);
    ScriptUtils.SetValue(emittingArgs, "TargetPosition", targetPos);
    ScriptUtils.SetValue(emittingArgs, "TargetLayer", targetLayer);

    let emittingArgsVar = host.newVar(HCL.HordeClassLibrary.World.Objects.Bullets.BulletEmittingArgs);
    emittingArgsVar.value = emittingArgs;

    let bull = bullCfg.CreateInstance(emittingArgsVar.ref);
    sourceUnit.Scena.ObjectController.RegisterBullet(bull);

    return bull;
}
