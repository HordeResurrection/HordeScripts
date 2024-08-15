import { MaraUtils } from "Mara/MaraUtils";
import { MaraSquadAttackState } from "./MaraSquadAttackState";
import { MaraSquadIdleState } from "./MaraSquadIdleState";
import { MaraSquadState } from "./MaraSquadState";

export class MaraSquadMoveState extends MaraSquadState {
    private timeoutTick: number;
    
    OnEntry(): void {
        this.initiateMovement();
    }
    
    OnExit(): void {}
    
    Tick(tickNumber: number): void {
        if (this.squad.MovementTargetCell != null) {
            this.initiateMovement();
            return;
        }

        if (this.squad.AttackTargetCell != null) {
            this.squad.SetState(new MaraSquadAttackState(this.squad));
            return;
        }
        
        let location = this.squad.GetLocation();
        let distance = MaraUtils.ChebyshevDistance(
            this.squad.CurrentTargetCell, 
            location.Point
        );
        
        if (!this.timeoutTick) {
            this.timeoutTick = tickNumber + distance * 1000 * 3; // given that the speed will be 1 cell/s
        }

        if (this.squad.IsAllUnitsIdle() || tickNumber > this.timeoutTick) { // не шмогли...
            this.squad.SetState(new MaraSquadIdleState(this.squad));
            return;
        }

        if (distance <= this.squad.MovementPrecision) {
            this.squad.SetState(new MaraSquadIdleState(this.squad));
            return;
        }
    }
}