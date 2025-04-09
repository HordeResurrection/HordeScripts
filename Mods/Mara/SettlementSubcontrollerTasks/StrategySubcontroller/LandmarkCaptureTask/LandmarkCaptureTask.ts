import { FsmState } from "../../../Common/FiniteStateMachine/FsmState";
import { MaraLogger } from "../../../Common/MaraLogger";
import { MaraPoint } from "../../../Common/MaraPoint";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { LandmarkCapturePrepareState } from "./LandmarkCapturePrepareState";

export class LandmarkCaptureTask extends SettlementSubcontrollerTask {
    private currentTaskState: FsmState;
    private nextTaskState: FsmState | null;

    public get ExpectedTimeout(): number {
        return (
            this.SettlementController.Settings.Timeouts.MaxBuildUpProduction +
            this.SettlementController.Settings.Timeouts.Exterminate
        );
    }
    
    constructor(
        point: MaraPoint,
        settlementController: MaraSettlementController,
        logger: MaraLogger
    ) {
        super(settlementController.Settings.Priorities.LandmarkCapture, settlementController, logger);
        
        let state = new LandmarkCapturePrepareState(point, this, this.SettlementController);
        this.SetState(state);
    }

    protected get state(): FsmState {
        return this.currentTaskState;
    }

    protected set state(value: FsmState) {
        this.currentTaskState = value;
    }

    protected get nextState(): FsmState | null {
        return this.nextTaskState;
    }

    protected set nextState(value: FsmState | null) {
        this.nextTaskState = value;
    }
}