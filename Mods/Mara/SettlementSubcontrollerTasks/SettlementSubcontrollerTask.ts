import { FiniteStateMachine } from "../Common/FiniteStateMachine/FiniteStateMachine";
import { MaraLogger } from "../Common/MaraLogger";
import { MaraSettlementController } from "../MaraSettlementController";

export abstract class SettlementSubcontrollerTask extends FiniteStateMachine {
    IsCompleted: boolean;
    IsSuccess: boolean;
    Priority: number;
    readonly SettlementController: MaraSettlementController;

    constructor(priority: number, settlementController: MaraSettlementController, logger: MaraLogger) {
        super(logger);
        this.Priority = priority;
        this.SettlementController = settlementController;
    }

    Complete(isSuccess: boolean): void {
        this.ClearState();
        this.IsSuccess = isSuccess;
        this.IsCompleted = true;
    }

    protected onTick(tickNumber: number) {
        // do nothing
    }
}