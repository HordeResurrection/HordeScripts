
const LOCATION_THRESHOLD_DISTANCE = 4;
const MAX_SPREAD_THRESHOLD_MULTIPLIER = 2.5;
const MIN_SPREAD_THRESHOLD_MULTIPLIER = 2;

abstract class MiraSquadState extends FsmState {
    protected squad: MiraSquad;
    
    constructor(squad: MiraSquad) {
        super();
        this.squad = squad;
    }
}

class MiraSquadIdleState extends MiraSquadState {
    OnEntry(): void {
        // this.squad.TargetCell = null;
        // this.squad.IsAttackMode = false;
    }
    
    OnExit(): void {}
    
    Tick(tickNumber: number): void {}
}

class MiraSquadMoveState extends MiraSquadState {
    OnEntry(): void {
        for (let unit of this.squad.Units) {
            MiraUtils.IssueMoveCommand(unit, this.squad.Controller.Player, this.squad.TargetCell);
        }
    }
    
    OnExit(): void {}
    
    Tick(tickNumber: number): void {
        let location = this.squad.GetLocation();
        
        let distance = MiraUtils.ChebyshevDistance(
            this.squad.TargetCell, 
            {X: location.X, Y: location.Y}
        );

        if (distance < LOCATION_THRESHOLD_DISTANCE) {
            this.squad.SetState(new MiraSquadIdleState(this.squad));
            return;
        }
    }
}

class MiraSquadAttackState extends MiraSquadState {
    OnEntry(): void {
        for (let unit of this.squad.Units) {
            MiraUtils.IssueAttackCommand(unit, this.squad.Controller.Player, this.squad.TargetCell);
        }
    }

    OnExit(): void {}

    Tick(tickNumber: number): void {
        let location = this.squad.GetLocation();
        
        let distance = MiraUtils.ChebyshevDistance(
            this.squad.TargetCell, 
            {X: location.X, Y: location.Y}
        );

        if (distance < LOCATION_THRESHOLD_DISTANCE) {
            this.squad.SetState(new MiraSquadIdleState(this.squad));
            return;
        }

        if (location.Spread > this.squad.MinSpread * MAX_SPREAD_THRESHOLD_MULTIPLIER) {
            this.squad.SetState(new MiraSquadGatheringUpState(this.squad));
            return;
        }
    }
}

class MiraSquadGatheringUpState extends MiraSquadState {
    OnEntry(): void {
        if (this.squad.TargetCell) {
            let closestToTargetUnit = null;
            let minDistance = Infinity;

            for (let unit of this.squad.Units) {
                let unitDistance = MiraUtils.ChebyshevDistance(unit.Cell, this.squad.TargetCell);
                
                if (unitDistance < minDistance) {
                    minDistance = unitDistance;
                    closestToTargetUnit = unit;
                }
            }

            for (let unit of this.squad.Units) {
                MiraUtils.IssueMoveCommand(unit, this.squad.Controller.Player, closestToTargetUnit.Cell);
            }
        }
    }
    
    OnExit(): void {}
    
    Tick(tickNumber: number): void {
        let location = this.squad.GetLocation();

        if (location.Spread <= this.squad.MinSpread * MIN_SPREAD_THRESHOLD_MULTIPLIER) {
            this.continueMotion();
            return;
        }

        let allUnitsIdle = true;

        for (let unit of this.squad.Units) {
            if (!unit.OrdersMind.IsIdle()) {
                allUnitsIdle = false;
                break;
            }
        }

        if (allUnitsIdle) {
            this.continueMotion();
            return;
        }
    }

    private continueMotion(): void {
        if (this.squad.IsAttackMode) {
            this.squad.SetState(new MiraSquadAttackState(this.squad));
        }
        else {
            this.squad.SetState(new MiraSquadMoveState(this.squad));
        }
    }
}