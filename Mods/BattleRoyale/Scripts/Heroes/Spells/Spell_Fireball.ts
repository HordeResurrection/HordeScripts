import { Cell } from "../../Core/Cell";
import { IHero } from "../IHero";
import { ISpell, SpellState } from "./ISpell";
import { createPF, HordeColor } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { ShotParams, Stride_Color, UnitCommandConfig, UnitMapLayer } from "library/game-logic/horde-types";
import { ITargetPointSpell } from "./ITargetPointSpell";

export class Spell_Fireball extends ITargetPointSpell {
    private static _MaxDistance : number = 10;

    protected static _CfgUid                : string = "Hero_Fireball";
    protected static _AnimationsCatalogRef  : string = "#AnimCatalog_Command_fireball";
    protected static _EffectStrideColor     : Stride_Color = new Stride_Color(228, 18, 47, 255);
    protected static _EffectHordeColor      : HordeColor = new HordeColor(255, 228, 18, 47);
    protected static _Name                  : string = "Запуск огненного шара";
    protected static _Description           : string = "Запускает огненный шар в выбранном направлении до "
        + Spell_Fireball._MaxDistance + " клеток.";

    protected _OnEveryTickActivated(gameTickNum: number): boolean {
        super._OnEveryTickActivated(gameTickNum);

        var hero     = this._hero as IHero;
        var heroCell = Cell.ConvertHordePoint(hero.hordeUnit.Cell);
        var moveVec  = this._targetCell.Minus(heroCell);

        // максимальная дистанция
        var distance = moveVec.Length_Chebyshev();
        if (distance > Spell_Fireball._MaxDistance) {
            moveVec = moveVec.Scale(Spell_Fireball._MaxDistance / distance).Round();
        }

        var targetCell = heroCell.Add(moveVec);

        var bulletConfig = HordeContentApi.GetBulletConfig("#BulletConfig_Fireball");
        var bulletShotParams = ShotParams.CreateInstance();
        ScriptUtils.SetValue(bulletShotParams, "Damage", 10);
        ScriptUtils.SetValue(bulletShotParams, "AdditiveBulletSpeed", createPF(0, 0));
        spawnBullet(
            hero.hordeUnit,  // Игра будет считать, что именно этот юнит запустил снаряд
            null,
            null,
            bulletConfig,
            bulletShotParams,
            hero.hordeUnit.Position,
            targetCell.Scale(32).Add(new Cell(16, 16)).ToHordePoint(),
            UnitMapLayer.Main
        );

        return false;
    }
}
