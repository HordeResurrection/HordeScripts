import { MaraUtils } from "Mara/MaraUtils";
import { MaraSquadBattleState } from "./MaraSquadBattleState";
import { MaraSquadMoveState } from "./MaraSquadMoveState";
import { MaraSquadState } from "./MaraSquadState";
import { MaraSquadIdleState } from "./MaraSquadIdleState";
import { MaraSquadAttackGatheringUpState } from "./MaraSquadAttackGatheringUpState";
import { MaraSquadCaptureState } from "./MaraSquadCaptureState";

export class MaraSquadAttackState extends MaraSquadState {
    OnEntry(): void {
        this.initiateAttack();
    }

    OnExit(): void {}

    Tick(tickNumber: number): void {
        let nearbyUnits = this.squad.GetNearbyUnits();
        
        if (this.isEnemyNearby(nearbyUnits)) {
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

        if (this.isCapturableUnitsNearby(nearbyUnits)) {
            if (this.atLeastOneCapturingUnitInSquad()) {
                this.squad.SetState(new MaraSquadCaptureState(this.squad));
                return;
            }
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

    private isEnemyNearby(units: Array<any>): boolean {
        for (let unit of units) {
            if (
                unit.IsAlive &&
                this.squad.Controller.EnemySettlements.indexOf(unit.Owner) > -1
            ) {
                return true;
            }
        }

        return false;
    }

    private isCapturableUnitsNearby(units: Array<any>): boolean {
        return units.findIndex((unit) => {
                return unit.BattleMind.CanBeCapturedNow() && 
                !MaraUtils.IsBuildingConfig(unit.Cfg)
            }
        ) >= 0;
    }

    private atLeastOneCapturingUnitInSquad(): boolean {
        for (let unit of this.squad.Units) {
            if (MaraUtils.IsCapturingConfig(unit.Cfg)) {
                return true;
            }
        }

        return false;
    }
}