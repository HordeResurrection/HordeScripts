import { BattleController, DiplomacyStatus, Unit, UnitConfig, UnitFlags, UnitHurtType, UnitMapLayer, VisualEffectConfig } from "library/game-logic/horde-types";
import { IPassiveSpell } from "../IPassiveSpell";
import { SpellState } from "../ISpell";
import { GlobalVars } from "../../GlobalData";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { Cell } from "../../Types/Geometry";
import { log } from "library/common/logging";
import { iterateOverUnitsInBox } from "library/game-logic/unit-and-map";
import { Spell_fear_attack } from "../Magic/Spell_fear_attack";
import { spawnBullet } from "library/game-logic/bullet-spawn";

export class Spell_Ricochet extends IPassiveSpell {
    protected static _ButtonUid                     : string = "Spell_Ricochet";
    protected static _ButtonAnimationsCatalogUid    : string = "#AnimCatalog_Command_Ricochet";
    protected static _SpellPreferredProductListPosition : Cell = new Cell(3, 0);

    protected static _ChargesCountPerLevel          : Array<number> = [ 10, 20, 30, 40, 60];

    //private static _RicochetEffect : VisualEffectConfig = HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_Blood");

    protected static _MaxLevel                      : number = 4;
    protected static _NamePrefix                    : string = "Рикошет";
    protected static _DescriptionTemplate           : string = "Пассивка. Если ваша атака ближнего, дальнего боя из любого"
        + " источника настигла врага. И рядом (в радиусе вашей атаки) с настигнутым врагом есть еще враги."
        + " То расходуется заряд способности и ваша атака активируется еще раз из положения"
        + " настигнутого врага в ближайшего.";

    public OnCauseDamage(VictimUnit: Unit, Damage: number, EffectiveDamage: number, HurtType: UnitHurtType) {
        super.OnCauseDamage(VictimUnit, Damage, EffectiveDamage, HurtType);
        if (!(this._state == SpellState.READY || this._state == SpellState.ACTIVATED)) {
            return;
        }

        if (HurtType != UnitHurtType.Mele && HurtType != UnitHurtType.Arrow) {
            return;
        }

        let unitsIter = iterateOverUnitsInBox(VictimUnit.Cell, this._caster.unit.Cfg.MainArmament.Range);
        for (let u = unitsIter.next(); !u.done; u = unitsIter.next()) {
            if (u.value.Id != VictimUnit.Id
                && GlobalVars.diplomacyTable[this._caster.unit.Owner.Uid][u.value.Owner.Uid] == DiplomacyStatus.War
                && u.value.Cfg.IsBuilding == false) {
                spawnBullet(
                    this._caster.unit,  // Игра будет считать, что именно этот юнит запустил снаряд
                    null,
                    null,
                    this._caster.unit.Cfg.MainArmament.BulletConfig,
                    this._caster.unit.Cfg.MainArmament.ShotParams,
                    this._caster.unit.Position,
                    u.value.Position,
                    UnitMapLayer.Main
                );
                this._SpendCharge();
                break;
            }
        }
    }
}

