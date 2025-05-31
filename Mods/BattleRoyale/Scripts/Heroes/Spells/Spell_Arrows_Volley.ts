import { HordeColor, createPF } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { Stride_Color, ShotParams, UnitMapLayer } from "library/game-logic/horde-types";
import { Cell } from "../../Core/Cell";
import { IHero } from "../IHero";
import { ISpell } from "./ISpell";
import { ITargetPointSpell } from "./ITargetPointSpell";
import { GameSettlement } from "../../Core/GameSettlement";
import { BuildingTemplate } from "../../Units/IFactory";

export class Spell_Arrows_Volley extends ITargetPointSpell {
    private static _MaxDistance : number = 6;

    protected static _CfgUid    : string = "Hero_Arrows_Volley";
    protected static _AnimationsCatalogRef : string = "#AnimCatalog_Command_arrows_volley";
    protected static _EffectStrideColor     : Stride_Color = new Stride_Color(250, 216, 170, 255);
    protected static _EffectHordeColor      : HordeColor = new HordeColor(255, 250, 216, 170);
    protected static _Name        : string = "Залп стрел";
    protected static _Description : string = "Запускает стрелу в выбранном направлении до "
        + Spell_Arrows_Volley._MaxDistance + " клеток. Всего 4 заряда. Перезарядка 2 секунды.";

    constructor (cell: Cell) {
        super(cell);

        this._charges      = 4;
        this._reloadPeriod = 100;
    }

    protected _OnEveryTickActivated(gameTickNum: number): boolean {
        super._OnEveryTickActivated(gameTickNum);

        var hero     = this._hero as IHero;
        var heroCell = Cell.ConvertHordePoint(hero.hordeUnit.Cell);
        var moveVec  = this._targetCell.Minus(heroCell);

        // максимальная дистанция
        var distance = moveVec.Length_Chebyshev();
        if (distance > Spell_Arrows_Volley._MaxDistance) {
            moveVec = moveVec.Scale(Spell_Arrows_Volley._MaxDistance / distance).Round();
        }

        var targetCell = heroCell.Add(moveVec);

        var bulletConfig = HordeContentApi.GetBulletConfig("#BulletConfig_Arrow");
        var bulletShotParams = ShotParams.CreateInstance();
        ScriptUtils.SetValue(bulletShotParams, "Damage", 4);
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
