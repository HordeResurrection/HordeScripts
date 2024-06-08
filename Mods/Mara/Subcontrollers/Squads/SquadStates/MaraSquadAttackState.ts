import { MaraUtils } from "Mara/Utils/MaraUtils";
import { MaraSquadBattleState } from "./MaraSquadBattleState";
import { MaraSquadMoveState } from "./MaraSquadMoveState";
import { MaraSquadState } from "./MaraSquadState";
import { MaraSquadIdleState } from "./MaraSquadIdleState";
import { MaraSquadAttackGatheringUpState } from "./MaraSquadAttackGatheringUpState";

export class MaraSquadAttackState extends MaraSquadState {
    OnEntry(): void {
        this.initiateAttack();
    }

    OnExit(): void {}

    Tick(tickNumber: number): void {
        if (this.squad.IsEnemyNearby()) {
            this.squad.SetState(new MaraSquadBattleState(this.squad));
            return;
        }
        
        if (this.squad.MovementTargetCell != null) {
            this.squad.SetState(new MaraSquadMoveState(this.squad));
            return;
        }

        let location = this.squad.GetLocation();

        if (tickNumber % (5 * 50) == 0) { //5 sec
            if (location.Spread > this.squad.MinSpread * this.squad.Controller.SquadsSettings.MaxSpreadMultiplier) {
                this.squad.SetState(new MaraSquadAttackGatheringUpState(this.squad));
                return;
            }
        }

        if (this.squad.AttackTargetCell != null) {
            this.initiateAttack();
            return;
        }
        
        let distance = MaraUtils.ChebyshevDistance(
            this.squad.CurrentTargetCell, 
            location.Point
        );

        if (distance <= this.squad.MovementPrecision) {
            this.squad.SetState(new MaraSquadIdleState(this.squad));
            return;
        }
    }
}