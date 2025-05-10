import { Cell } from "../../Core/Cell";
import { IHero } from "../IHero";
import { ISpell, SpellState } from "./ISpell";
import { createPF } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { ShotParams, UnitMapLayer } from "library/game-logic/horde-types";

export class Spell_Fireball extends ISpell {
    private static _MaxDistance : number = 10;

    protected _name        : string = "Запуск огненного шара";
    protected _description : string = "Запускает огненный шар в выбранном направлении до "
        + Spell_Fireball._MaxDistance + " клеток.";

    public OnEveryTick(gameTickNum: number): boolean {
        if (!ISpell.prototype.OnEveryTick.call(this, gameTickNum)) {
            return false;
        }

        if (this._state == SpellState.ACTIVATED) {
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

            this._state = SpellState.END;
        }

        return true;
    }
}
