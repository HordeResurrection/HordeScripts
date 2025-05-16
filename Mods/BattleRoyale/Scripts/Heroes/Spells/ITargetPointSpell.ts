import { createPoint } from "library/common/primitives";
import { ACommandArgs, UnitCommand, UnitCommandConfig } from "library/game-logic/horde-types";
import { Cell } from "../../Core/Cell";
import { ISpell } from "./ISpell";

export class ITargetPointSpell extends ISpell {
    protected static _UnitCommandBaseCfg    : string = "#UnitCommandConfig_Capture";
    protected static _UnitCommand           : UnitCommand = UnitCommand.Capture;

    protected _targetCell           : Cell;

    public Activate(activateArgs: ACommandArgs) : boolean {
        if (super.Activate(activateArgs)) {
            this._targetCell = Cell.ConvertHordePoint(activateArgs.TargetCell);

            return true;
        } else {
            return false;
        }
    }
}
