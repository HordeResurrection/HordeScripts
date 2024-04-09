import { MaraUtils } from "Mara/Utils/MaraUtils";
import { TileType } from "library/game-logic/horde-types";
import { MaraSquadAttackState } from "./MaraSquadAttackState";
import { MaraSquadBattleState } from "./MaraSquadBattleState";
import { MaraSquadIdleGatheringUpState } from "./MaraSquadIdleGatheringUpState";
import { MaraSquadMoveState } from "./MaraSquadMoveState";
import { MaraSquadState, MIN_SPREAD_THRESHOLD_MULTIPLIER, MAX_SPREAD_THRESHOLD_MULTIPLIER } from "./MaraSquadState";

export class MaraSquadIdleState extends MaraSquadState {
    OnEntry(): void {
        this.squad.CurrentTargetCell = this.squad.GetLocation().Point;
        this.distributeUnits();
    }
    
    OnExit(): void {}

    Tick(tickNumber: number): void {
        if (this.squad.MovementTargetCell != null) {
            this.squad.SetState(new MaraSquadMoveState(this.squad));
            return;
        }

        if (this.squad.AttackTargetCell != null) {
            this.squad.SetState(new MaraSquadAttackState(this.squad));
            return;
        }
        
        if (this.squad.IsEnemyNearby()) {
            this.squad.SetState(new MaraSquadBattleState(this.squad));
            return;
        }
        
        if (
            this.squad.IsAllUnitsIdle() &&
            this.squad.GetLocation().Spread > this.squad.MinSpread * MIN_SPREAD_THRESHOLD_MULTIPLIER
        ) {
            this.squad.SetState(new MaraSquadIdleGatheringUpState(this.squad));
            return;
        }
    }

    IsIdle(): boolean {
        return true;
    }

    private distributeUnits(): void {
        let unitsToDistribute:any[] = [];

        for (let unit of this.squad.Units) {
            let tileType = MaraUtils.GetTileType(unit.Cell);
            
            if (tileType !== TileType.Forest) { //run, Forest, run!!
                unitsToDistribute.push(unit);
            }
            else {
                MaraUtils.IssueMoveCommand([unit], this.squad.Controller.Player, unit.Cell);
            }
        }

        if (unitsToDistribute.length == 0) {
            return;
        }

        let searchRadius = this.squad.MinSpread * (MAX_SPREAD_THRESHOLD_MULTIPLIER + MIN_SPREAD_THRESHOLD_MULTIPLIER) / 2;
        let forestCells = MaraUtils.FindCells(this.squad.CurrentTargetCell, searchRadius, MaraUtils.ForestCellFilter);
        let cellIndex = 0;

        for (let unit of unitsToDistribute) {
            if (cellIndex >= forestCells.length) {
                MaraUtils.IssueMoveCommand([unit], this.squad.Controller.Player, this.squad.CurrentTargetCell);
            }
            else {
                MaraUtils.IssueMoveCommand([unit], this.squad.Controller.Player, forestCells[cellIndex]);
                cellIndex++;
            }
        }
    }
}