import { BattleController, Unit, UnitConfig, UnitHurtType, VisualEffectConfig } from "library/game-logic/horde-types";
import { IPassiveSpell } from "../IPassiveSpell";
import { SpellState } from "../ISpell";
import { GlobalVars } from "../../GlobalData";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { Cell } from "../../Types/Geometry";
import { log } from "library/common/logging";

export class Spell_Magic_shield extends IPassiveSpell {
    protected static _ButtonUid                     : string = "Spell_Magic_shield";
    protected static _ButtonAnimationsCatalogUid    : string = "#AnimCatalog_Command_Magic_shield";
    protected static _SpellPreferredProductListPosition : Cell = new Cell(3, 0);

    protected static _ChargesCountPerLevel          : Array<number> = [ 1, 2, 4, 6, 8 ];

    private static _ShieldEffect : VisualEffectConfig = HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_MagicBabble");

    protected static _MaxLevel                      : number = 4;
    protected static _NamePrefix                    : string = "Магический щит";
    protected static _DescriptionTemplate           : string = "Пассивка. Каждое получение урона отнимает заряд и невелирует урон.";

    public OnTakeDamage(AttackerUnit: Unit, EffectiveDamage: number, HurtType: UnitHurtType): void {
        super.OnTakeDamage(AttackerUnit, EffectiveDamage, HurtType);

        if (!(this._state == SpellState.READY || this._state == SpellState.ACTIVATED)) {
            return;
        }

        this._caster.unit.Health += EffectiveDamage;
        // тушим огонь
        if (HurtType == UnitHurtType.Fire) {

        }

        spawnDecoration(
            ActiveScena.GetRealScena(),
            Spell_Magic_shield._ShieldEffect,
            this._caster.unit.Position);

        // отнимаем заряд
        var chargeReloadTick = BattleController.GameTimer.GameFramesCounter
            - GlobalVars.startGameTickNum
            + this.constructor['_ChargesReloadTime'];
        this._charges--;
        this._chargesReloadTicks.push(chargeReloadTick);

        // заряды кончились
        if (this._charges == 0) {
            this._caster.unit.CommandsMind.RemoveAddedCommand(this.GetUnitCommand());
            this._state = SpellState.WAIT_CHARGE;
        }
    }
}
