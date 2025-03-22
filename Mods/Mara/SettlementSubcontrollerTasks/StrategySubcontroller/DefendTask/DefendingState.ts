
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { SubcontrollerTaskState } from "../../SubcontrollerTaskState";

export class DefendingState extends SubcontrollerTaskState {
    private reinforcementsCfgIds: Array<string>;
    
    constructor(task: SettlementSubcontrollerTask, settlementController: MaraSettlementController) {
        super(task, settlementController);
    }
    
    OnEntry(): void {
        this.reinforcementsCfgIds = this.settlementController.StrategyController.GetReinforcementCfgIds();
        this.settlementController.TacticalController.Defend();
    }

    OnExit(): void {
        this.settlementController.TacticalController.Idle();
    }

    Tick(tickNumber: number): void {
        if (tickNumber % 50 == 0) {
            if (!this.settlementController.StrategyController.IsUnderAttack()) {
                this.settlementController.Debug(`Attack countered`);
                this.task.Complete(true);
                return;
            }
            else {
                this.requestReinforcementsProduction();
            }
        }
    }

    private requestReinforcementsProduction() {
        for (let cfgId of this.reinforcementsCfgIds) {
            this.settlementController.ProductionController.ForceRequestSingleCfgIdProduction(cfgId, this.task.Priority);
        }
    }
}