import { FsmState } from "../../../Common/FiniteStateMachine/FsmState";
import { MaraLogger } from "../../../Common/MaraLogger";
import { TargetExpandData } from "../../../Common/Settlement/TargetExpandData";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { ExpandBuildState } from "./ExpandBuildState";

export class ExpandBuildTask extends SettlementSubcontrollerTask {
    private currentTaskState: FsmState;
    private nextTaskState: FsmState | null;
    
    constructor(
        priority: number, 
        settlementController: MaraSettlementController, 
        targetExpand: TargetExpandData,
        logger: MaraLogger
    ) {
        super(priority, settlementController, logger);
        
        let state = new ExpandBuildState(this.SettlementController, targetExpand);
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