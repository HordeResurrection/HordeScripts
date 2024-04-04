import { MaraUtils } from "Mara/Utils/MaraUtils";
import { MaraSquadState } from "./MaraSquadState";
import { MaraSquadBattleState } from "./MaraSquadBattleState";
import { MaraControllableSquad } from "../MaraControllableSquad";

export class MaraSquadPullbackState extends MaraSquadState {
    private timeoutTick: number;
    private prevTargetCell: any;
    private newTargetCell: any;

    constructor(squad: MaraControllableSquad, pullbackCell: any) {
        super(squad);
        this.newTargetCell = pullbackCell;
    }
    
    OnEntry(): void {
        this.prevTargetCell = this.squad.CurrentTargetCell;
        this.squad.MovementTargetCell = this.newTargetCell;
        this.initiateMovement();
    }
    
    OnExit(): void {
        this.squad.CurrentTargetCell = this.prevTargetCell;
    }
    
    Tick(tickNumber: number): void {
        let location = this.squad.GetLocation();
        let distance = MaraUtils.ChebyshevDistance(
            this.squad.CurrentTargetCell, 
            location.Point
        );
        
        if (!this.timeoutTick) {
            this.timeoutTick = tickNumber + distance * 1000 * 3; // given that the speed will be 1 cell/s
        }

        if (this.squad.IsAllUnitsIdle() || tickNumber > this.timeoutTick) { // не шмогли...
            this.squad.SetState(new MaraSquadBattleState(this.squad));
            return;
        }

        if (distance <= this.squad.MovementPrecision) {
            this.squad.SetState(new MaraSquadBattleState(this.squad));
            return;
        }
    }
}