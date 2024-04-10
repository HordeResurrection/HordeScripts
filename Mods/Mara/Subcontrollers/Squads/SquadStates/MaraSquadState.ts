import { FsmState } from "Mara/Utils/Common";
import { MaraUtils } from "Mara/Utils/MaraUtils";
import { MaraControllableSquad } from "../MaraControllableSquad";

export abstract class MaraSquadState extends FsmState {
    protected squad: MaraControllableSquad;
    
    constructor(squad: MaraControllableSquad) {
        super();
        this.squad = squad;
    }

    IsIdle(): boolean {
        return false;
    }

    protected initiateMovement() {
        this.squad.CurrentTargetCell = this.squad.MovementTargetCell;
        this.squad.MovementTargetCell = null;
        MaraUtils.IssueMoveCommand(this.squad.Units, this.squad.Controller.Player, this.squad.CurrentTargetCell);
    }

    protected initiateAttack() {
        this.squad.CurrentTargetCell = this.squad.AttackTargetCell;
        this.squad.AttackTargetCell = null;
        MaraUtils.IssueMoveCommand(this.squad.Units, this.squad.Controller.Player, this.squad.CurrentTargetCell);
    }
}