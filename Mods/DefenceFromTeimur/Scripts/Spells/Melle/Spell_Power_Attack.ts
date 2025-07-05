import { BattleController, Unit, UnitConfig, UnitHurtType, VisualEffectConfig } from "library/game-logic/horde-types";
import { IPassiveSpell } from "../IPassiveSpell";
import { SpellState } from "../ISpell";
import { GlobalVars } from "../../GlobalData";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { Cell } from "../../Types/Geometry";
import { log } from "library/common/logging";

export class Spell_Power_Attack extends IPassiveSpell {
    protected static _ButtonUid                     : string = "Spell_Power_Attack";
    protected static _ButtonAnimationsCatalogUid    : string = "#AnimCatalog_Command_Power_Attack";
    protected static _SpellPreferredProductListPosition : Cell = new Cell(3, 0);

    protected static _ChargesCountPerLevel          : Array<number> = [ 5, 10, 15, 20, 30];

    protected static _AddDamage : number = 10;
    private static _PowerAttackEffect : VisualEffectConfig = HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_Blood");

    protected static _MaxLevel                      : number = 4;
    protected static _NamePrefix                    : string = "Усиленная атака";
    protected static _DescriptionTemplate           : string = "Пассивка. Каждая атака отнимает заряд и наносит дополнительно " + Spell_Power_Attack._AddDamage + " урона.";

    public OnCauseDamage(VictimUnit: Unit, Damage: number, EffectiveDamage: number, HurtType: UnitHurtType) {
        super.OnCauseDamage(VictimUnit, Damage, EffectiveDamage, HurtType);
        if (!(this._state == SpellState.READY || this._state == SpellState.ACTIVATED)) {
            return;
        }

        if (HurtType == UnitHurtType.Mele) {
            this._caster.unit.BattleMind.CauseDamage(VictimUnit,
                Spell_Power_Attack._AddDamage,
                UnitHurtType.Heavy);
            // VictimUnit.BattleMind.TakeDamage(Spell_Power_Attack._AddDamage, UnitHurtType.Mele);
            // this._caster.OnCauseDamage(this,
            //     {
            //         VictimUnit: VictimUnit,
            //         Damage: Spell_Power_Attack._AddDamage,
            //         EffectiveDamage: Math.max(0, Spell_Power_Attack._AddDamage - VictimUnit.Cfg.Shield),
            //         HurtType : UnitHurtType.Heavy
            //     });

            var decorCell = Cell.ConvertHordePoint(VictimUnit.Cell).Scale(32);
            for (var x = 0; x <= 32; x += 32) {
                for (var y = 0; y <= 32; y += 32) {
                    spawnDecoration(
                        ActiveScena.GetRealScena(),
                        Spell_Power_Attack._PowerAttackEffect,
                        decorCell.Add(new Cell(x, y)).ToHordePoint());
                }
            }

            var chargeReloadTick = BattleController.GameTimer.GameFramesCounter
                - GlobalVars.startGameTickNum
                + this.constructor['_ChargesReloadTime'];
            this._charges--;
            this._chargesReloadTicks.push(chargeReloadTick);

            if (this._charges == 0) {
                this._caster.unit.CommandsMind.RemoveAddedCommand(this.GetUnitCommand());
                this._state = SpellState.WAIT_CHARGE;
            }
        }
    }
}
