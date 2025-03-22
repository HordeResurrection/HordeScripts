import { MaraUnitCacheItem } from "../../../Common/Cache/MaraUnitCacheItem";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";
import { SubcontrollerTaskState } from "../../SubcontrollerTaskState";

export class ExterminatingState extends SubcontrollerTaskState {
    private currentTarget: MaraUnitCacheItem | null;
    private reinforcementsCfgIds: Array<string>;
    private timeoutTick: number | null;
    private enemy: any;

    constructor(enemySettlement: any, task: SettlementSubcontrollerTask, settlementController: MaraSettlementController) {
        super(task, settlementController);
        this.enemy = enemySettlement;
    }
    
    OnEntry(): void {
        this.reinforcementsCfgIds = this.settlementController.StrategyController.GetReinforcementCfgIds();
        this.timeoutTick = null;
    }

    OnExit(): void {
        this.settlementController.TacticalController.Idle();
    }

    Tick(tickNumber: number): void {
        if (this.timeoutTick == null) {
            this.timeoutTick = tickNumber + this.settlementController.Settings.Timeouts.Exterminate;
        }
        else if (tickNumber > this.timeoutTick) {
            this.settlementController.Debug(`Attack is too long-drawn, discontinuing`);
            this.task.Complete(false);
            return;
        }
        
        if (tickNumber % 10 != 0) {
            return;
        }

        this.requestReinforcementsProduction();

        let combativityIndex = this.settlementController.TacticalController.OffenseCombativityIndex;

        if (combativityIndex >= this.settlementController.Settings.ControllerStates.ExterminatingLossRatioThreshold) {
            let enemy = this.enemy;
            
            if (!this.isValidTarget(this.currentTarget)) {
                this.selectTarget(enemy);

                if (!this.isValidTarget(this.currentTarget)) {
                    this.task.Complete(true);
                }
            }
        }
        else {
            this.settlementController.Debug(`Current combativity index '${combativityIndex}' is too low. Retreating...`);
            this.settlementController.TacticalController.Retreat();
            this.task.Complete(false);
            return;
        }
    }

    private selectTarget(enemy: any): void {
        this.currentTarget = null;
        let target = this.settlementController.StrategyController.GetOffensiveTarget(enemy);

        if (target) {
            this.currentTarget = target;
            this.settlementController.TacticalController.Attack(target);
        }
    }

    private requestReinforcementsProduction(): void {
        for (let cfgId of this.reinforcementsCfgIds) {
            this.settlementController.ProductionController.RequestSingleCfgIdProduction(cfgId, this.task.Priority);
        }
    }
    private isValidTarget(unit: MaraUnitCacheItem | null): boolean {
        return !(
            !unit || 
            !unit.UnitIsAlive ||
            this.enemy != unit.UnitOwner
        );
    }
}