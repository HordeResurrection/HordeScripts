import { FsmState } from "../../../Common/FiniteStateMachine/FsmState";
import { MaraLogger } from "../../../Common/MaraLogger";
import { TargetExpandData } from "../../../Common/Settlement/TargetExpandData";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { AwaitTaskCompletionState } from "../../AwaitTaskCompletionState";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { SubcontrollerTaskState } from "../../SubcontrollerTaskState";
import { ExpandBuildState } from "./ExpandBuildState";

export class ExpandBuildTask extends SettlementSubcontrollerTask {
    // @ts-ignore
    private currentTaskState: FsmState;
    // @ts-ignore
    private nextTaskState: FsmState | null;

    public get ExpectedTimeout(): number {
        return (
            this.SettlementController.Settings.Timeouts.ExpandPrepare +
            this.SettlementController.Settings.Timeouts.Exterminate +
            this.SettlementController.Settings.Timeouts.ExpandBuild
        );
    }
    
    constructor(
        priority: number, 
        settlementController: MaraSettlementController, 
        targetExpand: TargetExpandData,
        logger: MaraLogger
    ) {
        super(priority, settlementController, logger);
        
        let buildState = new ExpandBuildState(this, this.SettlementController, targetExpand);
        let finalState: SubcontrollerTaskState = buildState;

        if (targetExpand.Cluster) {
            let requestResult = this.SettlementController.StrategyController.CaptureLandmark(targetExpand.Cluster.Center);

            if (!requestResult.IsSuccess) {
                this.Debug(`Need to capture expand location, awaiting...`);
                
                finalState = new AwaitTaskCompletionState(
                    requestResult.Task!, 
                    buildState, 
                    this, 
                    this.SettlementController, 
                    false
                );
            }
        }

        this.SetState(finalState);
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