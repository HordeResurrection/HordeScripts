import { FiniteStateMachine } from "../Common/FiniteStateMachine/FiniteStateMachine";

export abstract class SettlementSubcontrollerTask extends FiniteStateMachine {
    IsCompleted: boolean;
    IsSuccess: boolean;
    
    protected onTick(tickNumber: number) {
        
    }
}