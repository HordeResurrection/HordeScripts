import { FsmState } from "../../../Common/FiniteStateMachine/FsmState";
import { MaraLogger } from "../../../Common/MaraLogger";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { ProduceHarvestersState } from "./ProduceHarvestersState";

export class ProduceHarvestersTask extends SettlementSubcontrollerTask {
    private currentTaskState: FsmState;
    private nextTaskState: FsmState | null;
    
    public get ExpectedTimeout(): number {
        return (
            this.SettlementController.Settings.Timeouts.ExpandBuild
        );
    }
    
    constructor(
        priority: number, 
        harvesterCount: number,
        harvesterCfgId: string,
        settlementController: MaraSettlementController, 
        logger: MaraLogger
    ) {
        super(priority, settlementController, logger);
        
        let state = new ProduceHarvestersState(harvesterCount, harvesterCfgId, this, this.SettlementController);
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