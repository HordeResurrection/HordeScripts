import { ISpell } from "../ISpell";
import { HordeColor } from "library/common/primitives";
import { ACommandArgs, ReplaceUnitParameters, Stride_Color, UnitConfig } from "library/game-logic/horde-types";
import { GlobalVars } from "../../GlobalData";
import { Hero_Archer } from "../../Realizations/Player_units";

export class Spell_ranged_transform extends ISpell {
    protected static _ButtonUid                     : string = "Spell_ranged_transform";
    protected static _ButtonAnimationsCatalogUid    : string = "#AnimCatalog_Command_View"; // Assume an animation catalog
    protected static _EffectStrideColor             : Stride_Color = new Stride_Color(255, 0, 255, 255);
    protected static _EffectHordeColor              : HordeColor = new HordeColor(255, 0, 255, 255);
    protected static _Name                          : string = "Превращение в дальнобойного";
    protected static _Description                   : string = "Превращает юнита в юнита дальнего боя.";
    protected static _IsConsumables                 : boolean = true;

    public Activate(activateArgs: ACommandArgs): boolean {
        if (super.Activate(activateArgs)) {
            // Параметры замены
            let replaceParams           = new ReplaceUnitParameters();
            replaceParams.OldUnit       = this._caster.unit;
            replaceParams.NewUnitConfig = GlobalVars.configs[Hero_Archer.CfgUid];
            replaceParams.Cell = this._caster.unit.Cell;
            replaceParams.PreserveHealthLevel = true;
            replaceParams.PreserveExperience = true;
            replaceParams.PreserveOrders = true;
            replaceParams.PreserveKillsCounter = true;
            replaceParams.Silent = true;
    
            // Замена юнита
            var newUnit = this._caster.unit.Owner.Units.ReplaceUnit(replaceParams);
            this._caster.ReplaceUnit(newUnit);

            return true;
        } else {
            return false;
        }
    }
} 