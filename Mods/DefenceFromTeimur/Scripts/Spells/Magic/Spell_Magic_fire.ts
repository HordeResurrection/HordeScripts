import { generateCellInSpiral } from "library/common/position-tools";
import { iterateOverUnitsInBox, unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { createPoint, HordeColor } from "library/common/primitives";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { DiplomacyStatus, Stride_Color, UnitFlags, UnitHurtType, VisualEffectConfig, ACommandArgs, Unit } from "library/game-logic/horde-types";
import { IUnitCaster } from "../IUnitCaster";
import { ITargetPointSpell } from "../ITargetPointSpell";
import { Cell } from "../../Types/Geometry";
import { SpellState } from "../ISpell";
import { GlobalVars } from "../../GlobalData";


export class Spell_Magic_fire extends ITargetPointSpell {
    protected static _ButtonUid: string = "Spell_Magic_fire";
    protected static _ButtonAnimationsCatalogUid: string = "#AnimCatalog_Command_Magic_fire";
    protected static _EffectStrideColor: Stride_Color = new Stride_Color(255, 0, 0, 255);
    protected static _EffectHordeColor: HordeColor = new HordeColor(255, 255, 0, 0);
    protected static _SpellPreferredProductListPosition: Cell = new Cell(2, 0);

    private static _DurationTicks: number = 500;
    private static _ApplyPeriod: number = 50;
    private static _TotalDamagePerLevel: Array<number> = [100, 150, 200, 250, 300];
    private static _DamagePerApplyPerLevel: Array<number> = Spell_Magic_fire._TotalDamagePerLevel.map(dmg => dmg / (Spell_Magic_fire._DurationTicks / Spell_Magic_fire._ApplyPeriod));

    protected static _MaxLevel: number = 4;
    protected static _NamePrefix: string = "Магический огонь";
    protected static _DescriptionTemplate: string = "Поджигает цель, нанося суммарно {0} магического урона.";
    protected static _DescriptionParamsPerLevel: Array<Array<any>> = [Spell_Magic_fire._TotalDamagePerLevel];
    protected static _ChargesCountPerLevel: Array<number> = [1, 1, 1, 1, 1];

    private _applyTick: number;
    private _deltaDamage: number;
    private _targetUnit: Unit | null;

    constructor(caster: IUnitCaster) {
        super(caster);
        this._targetUnit = null;
        this._applyTick = 0;
        this._deltaDamage = 0;
    }

    public Activate(activateArgs: ACommandArgs): boolean {
        if (super.Activate(activateArgs)) {
            let nearestDist = Infinity;
            let nearestUnit: Unit | null = null;
            let center = this._targetCell.ToHordePoint();
            let iter = iterateOverUnitsInBox(center, 2);
            for (let u = iter.next(); !u.done; u = iter.next()) {
                if (GlobalVars.diplomacyTable[this._caster.unit.Owner.Uid][u.value.Owner.Uid] === DiplomacyStatus.War &&
                    !u.value.Cfg.Flags.HasFlag(UnitFlags.MagicResistant)) {
                    let unitCell = Cell.ConvertHordePoint(u.value.Cell);
                    let dist = unitCell.Minus(this._targetCell).Length_Chebyshev();
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestUnit = u.value;
                    }
                }
            }
            if (nearestUnit === null) {
                this._state = SpellState.READY;
                return false;
            }
            this._targetUnit = nearestUnit;
            this._applyTick = this._activatedTick;
            this._deltaDamage = 0;
            return true;
        }
        return false;
    }

    protected _OnEveryTickActivated(gameTickNum: number): boolean {
        if (this._targetUnit === null || this._targetUnit.IsDead) {
            this._targetUnit = null;
            return false;
        }

        const isApply = this._applyTick <= gameTickNum;
        const isEnd = this._activatedTick + Spell_Magic_fire._DurationTicks < gameTickNum;

        if (isApply || isEnd) {
            this._applyTick += Spell_Magic_fire._ApplyPeriod;

            let damage = Spell_Magic_fire._DamagePerApplyPerLevel[this.level] + this._deltaDamage;
            this._deltaDamage = damage - Math.floor(damage);
            damage = Math.floor(damage);

            if (damage > 0) {
                this._caster.unit.BattleMind.CauseDamage(
                    this._targetUnit,
                    damage + this._targetUnit.Cfg.Shield,
                    UnitHurtType.Any
                );

                spawnDecoration(
                    ActiveScena.GetRealScena(),
                    HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_MagicFireLittle"),
                    this._targetUnit.Position
                );
            }
        }

        if (isEnd) {
            this._targetUnit = null;
            return false;
        }

        return true;
    }
}

