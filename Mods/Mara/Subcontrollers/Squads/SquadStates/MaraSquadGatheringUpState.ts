import { MaraUtils } from "Mara/Utils/MaraUtils";
import { MaraSquadBattleState } from "./MaraSquadBattleState";
import { MaraSquadState, MIN_SPREAD_THRESHOLD_MULTIPLIER } from "./MaraSquadState";

export abstract class MaraSquadGatheringUpState extends MaraSquadState {
    OnEntry(): void {
        if (this.squad.CurrentTargetCell) {
            let closestToTargetUnit: any = null;
            let minDistance = Infinity;

            for (let unit of this.squad.Units) {
                let unitDistance = this.distanceToTargetCell(unit);
                
                if (unitDistance < minDistance) {
                    minDistance = unitDistance;
                    closestToTargetUnit = unit;
                }
            }

            if (closestToTargetUnit) {
                for (let unit of this.squad.Units) {
                    MaraUtils.IssueMoveCommand(unit, this.squad.Controller.Player, closestToTargetUnit.Cell);
                }
            }
        }
    }
    
    OnExit(): void {}
    
    Tick(tickNumber: number): void {
        if (this.squad.IsEnemyNearby()) {
            this.squad.SetState(new MaraSquadBattleState(this.squad));
            return;
        }
        
        let location = this.squad.GetLocation();

        if (location.Spread <= this.squad.MinSpread * MIN_SPREAD_THRESHOLD_MULTIPLIER) {
            this.onGatheredUp();
            return;
        }

        if (this.squad.IsAllUnitsIdle()) {
            this.onGatheredUp();
            return;
        }
    }

    protected abstract onGatheredUp(): void;

    private distanceToTargetCell(unit: any): number {
        let pathLength = MaraUtils.GetUnitPathLength(unit);

        return pathLength ?? MaraUtils.ChebyshevDistance(unit.Cell, this.squad.CurrentTargetCell);
    }
}