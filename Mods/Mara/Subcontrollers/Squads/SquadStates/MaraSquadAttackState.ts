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
            let enemyUnits = nearbyUnits.filter(u => this.isEnemyUnit(u));

            if (this.squad.CanAttackAtLeastOneUnit(enemyUnits)) {
                this.squad.SetState(new MaraSquadBattleState(this.squad));
                return;
            }
        }
        
        if (this.squad.MovementPath != null) {
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

        if (this.squad.AttackPath != null) {
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
            this.squad.CurrentMovementPoint,
            location.Point
        );

        if (distance <= this.squad.MovementPrecision) {
            this.squad.CurrentMovementPoint = this.squad.SelectNextMovementPoint();

            if (
                !this.squad.CurrentMovementPoint ||
                this.squad.CurrentMovementPoint == this.squad.CurrentPath![this.squad.CurrentPath!.length - 1]
            ) {
                this.squad.SetState(new MaraSquadIdleState(this.squad));
            }
            else {
                MaraUtils.IssueMoveCommand(this.squad.Units, this.squad.Controller.Player, this.squad.CurrentMovementPoint);
            }

            return;
        }
    }

    private isEnemyUnit(unit: any): boolean {
        return (
            unit.IsAlive &&
            this.squad.Controller.EnemySettlements.indexOf(unit.Owner) > -1
        );
    }

    private isEnemyNearby(units: Array<any>): boolean {
        for (let unit of units) {
            if (this.isEnemyUnit(unit) && unit.IsAlive) {
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