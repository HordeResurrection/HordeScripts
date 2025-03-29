import { MaraUnitCacheItem } from "../../../Common/Cache/MaraUnitCacheItem";
import { MaraPriority } from "../../../Common/MaraPriority";
import { MaraProductionRequest } from "../../../Common/MaraProductionRequest";
import { MaraSettlementController } from "../../../MaraSettlementController";
import { ConstantProductionState } from "../../ConstantProductionState";
import { SettlementSubcontrollerTask } from "../../SettlementSubcontrollerTask";

export class ExterminatingState extends ConstantProductionState {
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
        this.selectTarget(this.enemy);
    }

    OnExit(): void {
        this.settlementController.TacticalController.Idle();
        this.finalizeProductionRequests();
    }

    Tick(tickNumber: number): void {
        if (this.timeoutTick == null) {
            this.timeoutTick = tickNumber + this.settlementController.Settings.Timeouts.Exterminate;
        }
        else if (tickNumber > this.timeoutTick) {
            this.task.Debug(`Attack is too long-drawn, discontinuing`);
            this.task.Complete(true);
            return;
        }
        
        if (tickNumber % 10 != 0) {
            return;
        }

        this.cleanupProductionRequests();
        this.requestProduction();

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
            this.task.Debug(`Current combativity index '${combativityIndex}' is too low. Retreating...`);
            this.settlementController.TacticalController.Retreat();
            this.task.Complete(true);
            return;
        }
    }

    protected makeProductionRequests(): Array<MaraProductionRequest> {
        let result: Array<MaraProductionRequest> = [];
        
        for (let cfgId of this.reinforcementsCfgIds) {
            let request = this.settlementController.ProductionController.RequestSingleCfgIdProduction(cfgId, MaraPriority.Background);

            if (request) {
                result.push(request);
            }
        }

        return result;
    }

    private selectTarget(enemy: any): void {
        this.currentTarget = null;
        let target = this.settlementController.StrategyController.GetOffensiveTarget(enemy);

        if (target) {
            this.currentTarget = target;
            this.settlementController.TacticalController.Attack(target);
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