import { FsmState } from "../../../Common/FiniteStateMachine/FsmState";
import { MaraLogger } from "../../../Common/MaraLogger";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { BuildUpState } from "./BuildUpState";

export class AttackTask extends SettlementSubcontrollerTask {
    private currentTaskState: FsmState;
    private nextTaskState: FsmState | null;

    public get ExpectedTimeout(): number {
        return (
            this.SettlementController.Settings.Timeouts.MaxBuildUpProduction +
            this.SettlementController.Settings.Timeouts.Exterminate
        );
    }
    
    constructor(
        enemySettlement: any,
        settlementController: MaraSettlementController,
        logger: MaraLogger
    ) {
        super(settlementController.Settings.Priorities.Attack, settlementController, logger);
        
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