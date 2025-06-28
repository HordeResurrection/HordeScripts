import { Unit, UnitConfig, UnitHurtType } from "library/game-logic/horde-types";
import { IPassiveSpell } from "../IPassiveSpell";
import { Cell } from "../../Types/Geometry";

export class Spell_Vampirism extends IPassiveSpell {
    protected static _ButtonUid                     : string = "Spell_Vampirism";
    protected static _ButtonAnimationsCatalogUid    : string = "#AnimCatalog_Command_Vampirism";
    protected static _ChargesCountPerLevel          : Array<number> = [];
    protected static _SpellPreferredProductListPosition : Cell = new Cell(2, 0);

    private static _VampirismCoeffPerLevel   : Array<number> = [
        0.2, 0.4, 0.6, 0.8, 1.0
    ];

    protected static _MaxLevel                      : number = 4;
    protected static _NamePrefix                    : string = "Вампиризм";
    protected static _DescriptionTemplate           : string = "Пассивка. Каждый удар ближнего боя восстанавливает хп в размере {0} % урона";
    protected static _DescriptionParamsPerLevel     : Array<Array<any>> = 
        [this._VampirismCoeffPerLevel.map(value => value * 100)];

    public OnCauseDamage(VictimUnit: Unit, Damage: number, EffectiveDamage: number, HurtType: UnitHurtType) {
        super.OnCauseDamage(VictimUnit, Damage, EffectiveDamage, HurtType);

        if (HurtType == UnitHurtType.Mele || HurtType == UnitHurtType.Heavy) {
            this._caster.unit.Health = Math.min(
                this._caster.unit.Cfg.MaxHealth,
                this._caster.unit.Health + Math.round(EffectiveDamage * Spell_Vampirism._VampirismCoeffPerLevel[this.level]));
        }
    }
}
