import { MaraUtils } from "Mara/MaraUtils";
import { MaraSquadState } from "./MaraSquadState";
import { MaraSquadBattleState } from "./MaraSquadBattleState";
import { MaraControllableSquad } from "../MaraControllableSquad";

export class MaraSquadPullbackState extends MaraSquadState {
    private timeoutTick: number;
    private pullbackCell: any;

    constructor(squad: MaraControllableSquad, pullbackCell: any) {
        super(squad);
        this.pullbackCell = pullbackCell;
    }
    
    OnEntry(): void {
        MaraUtils.IssueMoveCommand(this.squad.Units, this.squad.Controller.Player, this.pullbackCell);
    }
    
    OnExit(): void {

    }
    
    Tick(tickNumber: number): void {
        let location = this.squad.GetLocation();
        let distance = MaraUtils.ChebyshevDistance(
            this.pullbackCell, 
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