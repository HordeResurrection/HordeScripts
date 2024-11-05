import { MaraUtils } from "Mara/MaraUtils";
import { TileType } from "library/game-logic/horde-types";
import { MaraSquadAttackState } from "./MaraSquadAttackState";
import { MaraSquadBattleState } from "./MaraSquadBattleState";
import { MaraSquadIdleGatheringUpState } from "./MaraSquadIdleGatheringUpState";
import { MaraSquadMoveState } from "./MaraSquadMoveState";
import { MaraSquadState } from "./MaraSquadState";

export class MaraSquadIdleState extends MaraSquadState {
    OnEntry(): void {
        this.squad.CurrentMovementPoint = this.squad.GetLocation().Point;
        this.distributeUnits();
    }
    
    OnExit(): void {}

    Tick(tickNumber: number): void {
        if (this.squad.MovementPath != null) {
            this.squad.SetState(new MaraSquadMoveState(this.squad));
            return;
        }

        if (this.squad.AttackPath != null) {
            this.squad.SetState(new MaraSquadAttackState(this.squad));
            return;
        }
        
        if (this.squad.IsEnemyNearby()) {
            this.squad.SetState(new MaraSquadBattleState(this.squad));
            return;
        }
        
        if (
            this.squad.IsAllUnitsIdle() &&
            this.squad.GetLocation().Spread > this.squad.MinSpread * this.squad.Controller.SquadsSettings.MaxSpreadMultiplier
        ) {
            this.squad.SetState(new MaraSquadIdleGatheringUpState(this.squad));
            return;
        }
    }

    IsIdle(): boolean {
        return true;
    }

    private distributeUnits(): void {
        let unitsToDistribute: any[] = [];

        for (let unit of this.squad.Units) {
            let tileType = MaraUtils.GetTileType(unit.Cell);
            
            if (tileType != TileType.Forest) { //run, Forest, run!!
                let moveType = unit.Cfg.MoveType.ToString();

                if (moveType == "PlainAndForest") {
                    unitsToDistribute.push(unit);
                }
            }
            else {
                MaraUtils.IssueMoveCommand([unit], this.squad.Controller.Player, unit.Cell);
            }
        }

        if (unitsToDistribute.length == 0) {
            return;
        }

        let searchRadius = 
            this.squad.MinSpread * (
                this.squad.Controller.SquadsSettings.MaxSpreadMultiplier + this.squad.Controller.SquadsSettings.MinSpreadMultiplier
            ) / 2;

        searchRadius /= 2; // since spreads above represent diameters
            
        let forestCells = MaraUtils.FindCells(this.squad.CurrentMovementPoint!, searchRadius, MaraUtils.ForestCellFilter);
        let cellIndex = 0;

        for (let unit of unitsToDistribute) {
            if (cellIndex >= forestCells.length) {
                MaraUtils.IssueMoveCommand([unit], this.squad.Controller.Player, this.squad.CurrentMovementPoint!);
            }
            else {
                while (cellIndex < forestCells.length) {
                    if (MaraUtils.IsCellReachable(forestCells[cellIndex], unit)) {
                        MaraUtils.IssueMoveCommand([unit], this.squad.Controller.Player, forestCells[cellIndex]);
                        break;
                    }
    
                    cellIndex++;
                }

                cellIndex++;
            }
        }
    }
}