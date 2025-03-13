import { MaraUtils } from "../MaraUtils";
import { SettlementSubcontrollerTask } from "../SettlementSubcontrollerTasks/SettlementSubcontrollerTask";
import { MaraSubcontroller } from "./MaraSubcontroller";

export abstract class MaraTaskableSubcontroller extends MaraSubcontroller {
    protected abstract doRoutines(tickNumber: number): void;

    private activeTask: SettlementSubcontrollerTask | null = null;
    private allTasks: Array<SettlementSubcontrollerTask> = [];
    
    Tick(tickNumber: number): void {
        this.doRoutines(tickNumber);

        if (this.activeTask) {
            if (this.activeTask.IsCompleted) {
                this.debug(`Task ${this.activeTask.constructor.name} completed with result ${this.activeTask.IsSuccess}`);
                this.activeTask = null;
            }
            else {
                let priorityTask = MaraUtils.FindExtremum(this.allTasks, (c, e) => c.Priority - e.Priority);

                if (priorityTask && priorityTask.Priority > this.activeTask.Priority) {
                    this.setActiveTask(priorityTask);
                }
            }
        }
        else {
            let highestPriorityTask = MaraUtils.FindExtremum(this.allTasks, (c, e) => c.Priority - e.Priority);
            
            if (highestPriorityTask) {
                this.setActiveTask(highestPriorityTask);
            }
        }

        if (this.activeTask) {
            this.activeTask.Tick(tickNumber);
        }
    }

    AddTask(task: SettlementSubcontrollerTask): void {
        this.allTasks.push(task);
        this.debug(`Added task ${task.constructor.name} with priority ${task.Priority} to queue`);
    }

    private setActiveTask(task: SettlementSubcontrollerTask): void {
        if (this.activeTask) {
            this.activeTask.Complete(false);
            this.debug(`Task ${this.activeTask.constructor.name} cancelled`);
        }

        this.activeTask = task;
        this.debug(`Start executing task ${this.activeTask.constructor.name}`);
    }

    private debug(message: string): void {
        this.settlementController.Debug(`[${this.constructor.name}] ${message}`);
    }
}