import { MaraLogger } from "../MaraLogger";
import { FsmState } from "./FsmState";

export abstract class FiniteStateMachine {
    protected logger: MaraLogger;

    constructor(logger: MaraLogger) {
        this.logger = logger;
    }
    
    Tick(tickNumber: number): void {
        if (this.state) {
            this.state.Tick(tickNumber);
        }

        this.onTick(tickNumber);
        
        if (this.nextState) {
            if (this.state) {
                this.logger.Debug(`Leaving state ${this.state.constructor.name}`);
                this.state.OnExit();
            }
            
            this.state = this.nextState;
            this.nextState = null;
            this.logger.Debug(`Entering state ${this.state.constructor.name}, tick ${tickNumber}`);
            this.state.OnEntry();
        }

        this.state.Tick(tickNumber);
    }

    SetState(state: FsmState): void {
        this.nextState = state;
    }

    ClearState(): void {
        this.state.OnExit();
        this.state = null;
    }

    protected abstract get state(): FsmState;
    protected abstract set state(value: FsmState | null);

    protected abstract get nextState(): FsmState | null;
    protected abstract set nextState(value: FsmState | null);
    
    protected abstract onTick(tickNumber: number);
}