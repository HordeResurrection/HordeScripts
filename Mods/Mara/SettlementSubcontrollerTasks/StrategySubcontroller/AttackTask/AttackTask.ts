import { FsmState } from "../../../Common/FiniteStateMachine/FsmState";
import { MaraLogger } from "../../../Common/MaraLogger";
import { MaraPriority } from "../../../Common/MaraPriority";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { BuildUpState } from "./BuildUpState";

export class AttackTask extends SettlementSubcontrollerTask {
    private currentTaskState: FsmState;
    private nextTaskState: FsmState | null;
    
    constructor(
        enemySettlement: any,
        settlementController: MaraSettlementController,
        logger: MaraLogger
    ) {
        super(MaraPriority.Normal, settlementController, logger);
        
        let state = new BuildUpState(enemySettlement, this, this.SettlementController);
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