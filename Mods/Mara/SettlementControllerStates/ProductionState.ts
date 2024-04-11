import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";
import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";

export abstract class ProductionState extends MaraSettlementControllerState {
    private targetUnitsComposition: UnitComposition = new Map<string, number>();

    protected abstract getTargetUnitsComposition(): UnitComposition;
    protected abstract onTargetCompositionReached(): void;

    private timeoutTick: number | null;
    
    OnEntry(): void {
        this.settlementController.ProductionController.CancelAllProduction();
        this.targetUnitsComposition = this.getTargetUnitsComposition();

        this.refreshTargetProductionLists();
        this.timeoutTick = null;
    }

    OnExit(): void {
        //do nothing
    }

    Tick(tickNumber: number): void {
        let timeout = this.getProductionTimeout();
        
        if (timeout != null) {
            if (this.timeoutTick == null) {
                this.settlementController.Debug(`Set production timeout to ${timeout} ticks`);
                this.timeoutTick = tickNumber + timeout;
            }
            else if (tickNumber > this.timeoutTick) {
                this.settlementController.Debug(`Production is too long-drawn, discontinuing`);
                this.onTargetCompositionReached();
                return;
            }
        }
        
        if (tickNumber % 10 != 0) {
            return;
        }

        if (tickNumber % 50 == 0) {
            if (this.settlementController.StrategyController.IsUnderAttack()) {
                this.settlementController.State = SettlementControllerStateFactory.MakeDefendingState(this.settlementController);
                return;
            }
        }

        this.refreshTargetProductionLists();

        let composition = this.settlementController.GetCurrentDevelopedEconomyComposition();

        if (MaraUtils.SetContains(composition, this.targetUnitsComposition)) {
            this.onTargetCompositionReached();
            return;
        }
    }

    protected getProductionTimeout(): number | null {
        return null;
    }

    private getRemainingProductionList(): UnitComposition {
        let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
        
        for (let productionListItem of this.settlementController.ProductionController.ProductionList) {
            MaraUtils.IncrementMapItem(currentEconomy, productionListItem);
        }

        return MaraUtils.SubstractCompositionLists(this.targetUnitsComposition, currentEconomy);
    }

    private refreshTargetProductionLists(): void {
        let trainingList = this.getRemainingProductionList();
        
        trainingList.forEach(
            (val, key, map) => {
                for (let i = 0; i < val; i++) {
                    this.settlementController.ProductionController.RequestProduction(key);
                }
            }
        );
    }
}