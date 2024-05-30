import { generateCellInSpiral } from "library/common/position-tools";
import { createPoint } from "library/common/primitives";
import { PointCommandArgs, UnitCommand } from "library/game-logic/horde-types";
import { Cell } from "./Geometry";
import { IUnit } from "./IUnit";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { UnitGiveOrder } from "../Utils";
import { GlobalVars } from "../GlobalData";
import { log } from "library/common/logging";

export class ITeimurUnit extends IUnit {
    constructor(unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public OnEveryTick(gameTickNum: number) {
        // проверяем, что юнит ничего не делает
        if (!this.unit.OrdersMind.IsIdle()) {
            return;
        }

        // атакуем замок
        UnitGiveOrder(this.unit, GlobalVars.teams[this.teamNum].castleCell, UnitCommand.Attack, AssignOrderMode.Queue);
    }
}
