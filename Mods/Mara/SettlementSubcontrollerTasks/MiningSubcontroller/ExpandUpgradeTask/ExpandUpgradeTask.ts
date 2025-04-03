import { FsmState } from "../../../Common/FiniteStateMachine/FsmState";
import { MaraLogger } from "../../../Common/MaraLogger";
import { MaraPoint } from "../../../Common/MaraPoint";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { ExpandUpgradeState } from "./ExpandUpgradeState";

export class ExpandUpgradeTask extends SettlementSubcontrollerTask {
    private currentTaskState: FsmState;
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
        metalStockCfgId: string,
        metalStockBuildPoint: MaraPoint,
        settlementController: MaraSettlementController, 
        logger: MaraLogger
    ) {
        super(priority, settlementController, logger);
        
        let state = new ExpandUpgradeState(this, metalStockCfgId, metalStockBuildPoint, this.SettlementController);

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