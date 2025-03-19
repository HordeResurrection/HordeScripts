import { MaraUtils } from "../MaraUtils";
import { SettlementSubcontrollerTask } from "../SettlementSubcontrollerTasks/SettlementSubcontrollerTask";
import { MaraSubcontroller } from "./MaraSubcontroller";

export abstract class MaraTaskableSubcontroller extends MaraSubcontroller {
    protected selfTaskReattemptCooldown = 60 * 50;
    protected successfulSelfTaskCooldown = 0;
    
    protected abstract doRoutines(tickNumber: number): void;
    protected abstract makeSelfTask(): SettlementSubcontrollerTask | null;

    private activeTask: SettlementSubcontrollerTask | null = null;
    private allTasks: Array<SettlementSubcontrollerTask> = [];
    private lastSelfTaskFailureTick = -Infinity;
    private lastSuccessfulSelfTaskTick = -Infinity;
    
    Tick(tickNumber: number): void {
        this.doRoutines(tickNumber);

        this.allTasks = this.allTasks.filter((t) => !t.IsCompleted);
        
        if (this.activeTask) {
            if (this.activeTask.IsCompleted) {
                this.debug(`Task ${this.activeTask.constructor.name} completed with result ${this.activeTask.IsSuccess}`);

                if (this.activeTask.IsSuccess) {
                    this.lastSuccessfulSelfTaskTick = tickNumber;
                }

                this.activeTask = null;
            }
            else {
                let priorityTask = MaraUtils.FindExtremum(this.allTasks, (c, e) => c.Priority - e.Priority);

                if (priorityTask && priorityTask.Priority > this.activeTask.Priority) {
                    this.setActiveTask(priorityTask);
                }
            }
        }
        else if (this.allTasks.length > 0) {
            let highestPriorityTask = MaraUtils.FindExtremum(this.allTasks, (c, e) => c.Priority - e.Priority);
            
            if (highestPriorityTask) {
                this.setActiveTask(highestPriorityTask);
            }
        }
        else if (
            tickNumber - this.lastSelfTaskFailureTick > this.selfTaskReattemptCooldown &&
            tickNumber - this.lastSuccessfulSelfTaskTick > this.successfulSelfTaskCooldown
        ) {
            let selfTask = this.makeSelfTask();

            if (selfTask) {
                this.AddTask(selfTask);
            }
            else {
                this.lastSelfTaskFailureTick = tickNumber;
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
        this.allTasks = this.allTasks.filter((t) => t != this.activeTask);
        this.debug(`Start executing task ${this.activeTask.constructor.name}`);
    }

    private debug(message: string): void {
        this.settlementController.Debug(`[${this.constructor.name}] ${message}`);
    }
}