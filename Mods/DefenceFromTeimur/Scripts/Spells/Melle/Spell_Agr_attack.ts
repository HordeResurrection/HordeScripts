import { ISpell } from "../ISpell";
import { HordeColor } from "library/common/primitives";
import { ACommandArgs, DiplomacyStatus, Stride_Color, UnitCommand, UnitFlags, VisualEffectConfig } from "library/game-logic/horde-types";
import { iterateOverUnitsInBox } from "library/game-logic/unit-and-map";
import { IUnitCaster } from "../IUnitCaster";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { IUnit } from "../../Types/IUnit";
import { Cell } from "../../Types/Geometry";

export class Spell_Agr_attack extends ISpell {
    protected static _ButtonUid                     : string = "Spell_Agr_attack";
    protected static _ButtonAnimationsCatalogUid    : string = "#AnimCatalog_Command_Agr_attack";
    protected static _EffectStrideColor             : Stride_Color = new Stride_Color(81, 207, 207, 255);
    protected static _EffectHordeColor              : HordeColor = new HordeColor(255, 81, 207, 207);
    protected static _SpellPreferredProductListPosition : Cell = new Cell(2, 0);

    private static _AgrTimePerLevel   : Array<number> = [
        7*50, 9*50, 11*50, 13*50, 15*50, 17*50, 19*50, 21*50, 23*50, 25*50
    ];
    private static _AgrRadiusPerLevel : Array<number> = [
        3, 4, 4, 5, 5, 6, 6, 7, 7, 12
    ];
    private static _AgrEffectConfig : VisualEffectConfig = HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_MagicCircle_red");

    protected static _MaxLevel                      : number = 9;
    protected static _NamePrefix                    : string = "Приступ ярости";
    protected static _DescriptionTemplate           : string
        = "Вселяет ярость к вам во вражеских юнитов в радиусе {0} клеток на {1} секунд.";
    protected static _DescriptionParamsPerLevel     : Array<Array<any>>
        = [this._AgrRadiusPerLevel, this._AgrTimePerLevel.map(ticks => ticks / 50)];

    ///////////////////////////////////
    
    private _agrUnits  : Array<IUnit>;

    constructor(caster: IUnitCaster) {
        super(caster);

        this._agrUnits = new Array<IUnit>();
    }

    public Activate(activateArgs: ACommandArgs): boolean {
        if (super.Activate(activateArgs)) {            
            let unitsIter = iterateOverUnitsInBox(this._caster.unit.Cell, Spell_Agr_attack._AgrRadiusPerLevel[this.level]);
            for (let u = unitsIter.next(); !u.done; u = unitsIter.next()) {
                if (this._caster.unit.Owner.Diplomacy.GetDiplomacyStatus(u.value.Owner) == DiplomacyStatus.War
                    && u.value.Cfg.IsBuilding == false) {
                    if (u.value.ScriptData.IUnit) {
                        this._agrUnits.push(u.value.ScriptData.IUnit);
                    } else {
                        this._agrUnits.push(new IUnit(u.value, 0));
                    }
                }
            }
            for (var unit of this._agrUnits) {
                //unit.DisallowCommands();
            }
            return true;
        } else {
            return false;
        }
    }

    protected _OnEveryTickActivated(gameTickNum: number): boolean {
        super._OnEveryTickActivated(gameTickNum);

        if (this._caster.unit.IsDead || this._activatedTick + Spell_Agr_attack._AgrTimePerLevel[this.level] <= gameTickNum) {
            for (var unit of this._agrUnits) {
                unit.unit_ordersMind.CancelOrdersSafe(true);
            }

            return false;
        }

        var agrCell = Cell.ConvertHordePoint(this._caster.unit.Cell);

        for (var unitNum = 0; unitNum < this._agrUnits.length; unitNum++) {
            var unit = this._agrUnits[unitNum];
            if (unit.unit.IsDead) {
                this._agrUnits.splice(unitNum, 1);
                unitNum--;
            }

            var unitPoint = Cell.ConvertHordePoint(unit.unit.Cell).Scale(32).Add(new Cell(16, 16)).ToHordePoint();
            spawnDecoration(
                ActiveScena.GetRealScena(),
                Spell_Agr_attack._AgrEffectConfig,
                unitPoint);

            //unit.AllowCommands();
            unit.GivePointCommand(agrCell, UnitCommand.Attack, AssignOrderMode.Replace);
            //unit.DisallowCommands();
        }

        return true;
    }
}
