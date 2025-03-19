
import { SubcontrollerTaskState } from "./SubcontrollerTaskState";
import { SettlementSubcontrollerTask } from "./SettlementSubcontrollerTask";
import { MaraSettlementController } from "../MaraSettlementController";

export class AwaitTaskCompletionState extends SubcontrollerTaskState {
    protected timeout: number;
    
    private awaitedTask: SettlementSubcontrollerTask;
    private nextState: SubcontrollerTaskState;
    private timeoutTick: number | null = null;

    constructor(
        awaitedTask: SettlementSubcontrollerTask,
        nextState: SubcontrollerTaskState,
        timeout: number,
        task: SettlementSubcontrollerTask, 
        settlementController: MaraSettlementController
    ) {
        super(task, settlementController);

        this.awaitedTask = awaitedTask;
        this.nextState = nextState;
        this.timeout = timeout;
    }
    
    OnEntry(): void {
        // do nothing
    }

    OnExit(): void {
        if (!this.awaitedTask.IsCompleted) {
            this.awaitedTask.Complete(false);
        }
    }

    Tick(tickNumber: number): void {
        if (this.timeout != null) {
            if (this.timeoutTick == null) {
                this.settlementController.Debug(`Set task await timeout to ${this.timeout} ticks`);
                this.timeoutTick = tickNumber + this.timeout;
            }
            else if (tickNumber > this.timeoutTick) {
                this.settlementController.Debug(`Task await timeout, discontinuing`);
                this.task.SetState(this.nextState);
                return;
            }
        }

        if (this.awaitedTask.IsCompleted) {
            this.task.SetState(this.nextState);
        }
    }
}