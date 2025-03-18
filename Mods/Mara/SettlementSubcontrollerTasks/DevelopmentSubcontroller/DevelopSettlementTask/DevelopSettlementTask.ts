import { FsmState } from "../../../Common/FiniteStateMachine/FsmState";
import { MaraLogger } from "../../../Common/MaraLogger";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { ProduceSettlementEnhancementsState } from "./ProduceSettlementEnhancementsState";

export class DevelopSettlementTask extends SettlementSubcontrollerTask {
    private currentTaskState: FsmState;
    private nextTaskState: FsmState | null;
    
    constructor(
        priority: number, 
        cfgIds: Array<string>,
        settlementController: MaraSettlementController,
        logger: MaraLogger
    ) {
        super(priority, settlementController, logger);
        
        let state = new ProduceSettlementEnhancementsState(this, this.SettlementController, cfgIds);
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