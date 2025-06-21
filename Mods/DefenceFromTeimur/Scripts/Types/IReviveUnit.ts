import { generateCellInSpiral } from "library/common/position-tools";
import { IUnit } from "./IUnit";
import { spawnUnits } from "../Utils";
import { UnitDirection } from "library/game-logic/horde-types";
import { GlobalVars } from "../GlobalData";

export class IReviveUnit extends IUnit {
    protected _reviveTick : number = -1;
    protected static _RevivePeriod : number = 60*50;

    public OnEveryTick(gameTickNum: number) : boolean {
        if (!super.OnEveryTick(gameTickNum)) {
            return false;
        }
        return false;
    }
    public OnDead(gameTickNum: number) {
        super.OnDead(gameTickNum);
        this.needDeleted = false;

        if (this._reviveTick < 0) {
            this._reviveTick = gameTickNum + this.constructor["_RevivePeriod"];
        } else if (this._reviveTick < gameTickNum) {
            this._reviveTick = -1;

            var spawnCell = this.unit.Cell;
            for (var settlementNum = 0; settlementNum < GlobalVars.teams[this.teamNum].settlements.length; settlementNum++) {
                if (GlobalVars.teams[this.teamNum].settlementsIdx[settlementNum] == Number.parseInt(this.unit.Owner.Uid)) {
                    spawnCell = GlobalVars.teams[this.teamNum].spawnCell[settlementNum];
                }
            }

            // спавним юнита в точке
            var generator = generateCellInSpiral(spawnCell.X, spawnCell.Y);
            var spawnedUnit = spawnUnits(this.unit.Owner,
                this.unit.Cfg,
                1,
                UnitDirection.Down,
                generator);
            if (spawnedUnit.length != 0) {
                this.ReplaceUnit(spawnedUnit[0]);
            }
        }
    }
}
