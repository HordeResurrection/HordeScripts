import { FsmState } from "../../../Common/FiniteStateMachine/FsmState";
import { MaraLogger } from "../../../Common/MaraLogger";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { DefendingState } from "./DefendingState";

export class DefendTask extends SettlementSubcontrollerTask {
    private currentTaskState: FsmState;
    private nextTaskState: FsmState | null;

    public get ExpectedTimeout(): number {
        return Infinity;
    }
    
    constructor(
        settlementController: MaraSettlementController,
        logger: MaraLogger
    ) {
        super(settlementController.Settings.Priorities.SettlementDefence, settlementController, logger);
        
        let state = new DefendingState(this, this.SettlementController);
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