import { HordeColor } from "library/common/primitives";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { Stride_Color, BulletConfig, VisualEffectConfig, ACommandArgs, UnitFlags, DiplomacyStatus, UnitMapLayer, UnitHurtType } from "library/game-logic/horde-types";
import { Cell } from "../../Types/Geometry";
import { unitCanBePlacedByRealMap } from "../../Utils";
import { ISpell } from "../ISpell";

export class Spell_fiery_dash extends ISpell {
    protected static _ButtonUid                     : string = "Spell_fiery_dash";
    protected static _ButtonAnimationsCatalogUid    : string = "#AnimCatalog_Command_fiery_dash";
    protected static _EffectStrideColor             : Stride_Color = new Stride_Color(228, 18, 47, 255);
    protected static _EffectHordeColor              : HordeColor = new HordeColor(255, 228, 18, 47);

    private static _FireDashMaxDistancePerLevel   : Array<number> = [
        10, 11, 12, 13, 14, 15, 16, 17, 18, 19
    ];
    private static _FireDashAddDamagePerLevel : Array<number> = [
        0, 0, 1, 1, 2, 2, 3, 3, 4, 4
    ];
    private static _FireDashWidthPerLevel : Array<number> = [
        1, 1, 1, 1, 1, 3, 3, 3, 3, 5
    ];
    private static _FireConfig : BulletConfig = HordeContentApi.GetBulletConfig("#BulletConfig_Fire");
    private static _FireDashEffect : VisualEffectConfig = HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleRedDust");

    protected static _MaxLevel                      : number = 9;
    protected static _NamePrefix                    : string = "Огненный рывок";
    protected static _DescriptionTemplate           : string = 
        "Делает рывок в сторону взгляда, максимум на {0} клеток, поджигая все на своем пути, дополнительно наносит {1} огненного урона, ширина воздействия {2}.";
    protected static _DescriptionParamsPerLevel     : Array<Array<any>> = [
        this._FireDashMaxDistancePerLevel, this._FireDashAddDamagePerLevel, this._FireDashWidthPerLevel
    ];

    ///////////////////////////////////

    public Activate(activateArgs: ACommandArgs): boolean {
        if (super.Activate(activateArgs)) {
            var heroCell   = Cell.ConvertHordePoint(this._caster.unit.Cell);
            var moveVec    = this._caster.DirectionVector();
            var targetCell = heroCell.Add(moveVec.Scale(Spell_fiery_dash._FireDashMaxDistancePerLevel[this.level])).Round();
            while (!(targetCell.X == heroCell.X && targetCell.Y == heroCell.Y)) {
                var hordeCell = targetCell.ToHordePoint();
                if (unitCanBePlacedByRealMap(this._caster.unit.Cfg, hordeCell.X, hordeCell.Y)
                    && this._caster.unit.MapMind.CheckPathTo(hordeCell, false).Found) {    
                    break;
                }

                targetCell = targetCell.Minus(moveVec).Round();
            }

            var dashCells : Array<Cell> = [new Cell(heroCell.X, heroCell.Y)];
            var moveNormalVec = new Cell(-moveVec.Y, moveVec.X);
            for (var i = 0; i < (Spell_fiery_dash._FireDashWidthPerLevel[this.level] - 1) / 2; i++) {
                dashCells.push(dashCells[0].Add(moveNormalVec.Scale(i + 1)).Round());
                dashCells.push(dashCells[0].Add(moveNormalVec.Scale(-(i + 1))).Round());
            }

            while (!(targetCell.X == dashCells[0].X && targetCell.Y == dashCells[0].Y)) {
                for (var i = 0; i < dashCells.length; i++) {
                    var dashPoint = dashCells[i].Scale(32).Add(new Cell(16, 16)).ToHordePoint();
                    spawnDecoration(
                        ActiveScena.GetRealScena(),
                        Spell_fiery_dash._FireDashEffect,
                        dashPoint);
                    var upperHordeUnit = ActiveScena.UnitsMap.GetUpperUnit(dashCells[i].ToHordePoint());
                    if (upperHordeUnit
                        && !upperHordeUnit.Cfg.Flags.HasFlag(UnitFlags.FireResistant)
                        && this._caster.unit.Owner.Diplomacy.GetDiplomacyStatus(upperHordeUnit.Owner) == DiplomacyStatus.War) {
                        HordeClassLibrary.World.Objects.Bullets.Implementations.Fire.BaseFireBullet.MakeFire(
                            this._caster.unit, dashPoint, UnitMapLayer.Main, Spell_fiery_dash._FireConfig);
                        upperHordeUnit.BattleMind.TakeDamage(
                            Spell_fiery_dash._FireDashAddDamagePerLevel[this.level] + upperHordeUnit.Cfg.Shield,
                            UnitHurtType.Any);
                    }
                    dashCells[i] = dashCells[i].Add(moveVec).Round();
                }
            }

            this._caster.unit.MapMind.TeleportToCell(targetCell.ToHordePoint());

            return true;
        } else {
            return false;
        }
    }

    protected _OnEveryTickActivated(gameTickNum: number): boolean {
        super._OnEveryTickActivated(gameTickNum);

        return false;
    }
}
