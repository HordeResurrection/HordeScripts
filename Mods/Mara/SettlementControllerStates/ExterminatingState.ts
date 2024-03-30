import { MaraSettlementControllerState } from "./MaraSettlementControllerState";
import { IdleState } from "./IdleState";
import { DefendingState } from "./DefendingState";
import { DevelopingState } from "./DevelopingState";

export class ExterminatingState extends MaraSettlementControllerState {
    private readonly COMBATIVITY_THRESHOLD = 0.33;
    private readonly EXTERMINATING_TIMEOUT = 5 * 60 * 50; //5 min
    private currentTarget: any; //but actually Unit
    private reinforcementsCfgIds: Array<string>;
    private timeoutTick: number | null;    
    
    OnEntry(): void {
        if (!this.selectAndAttackEnemy()) {
            this.celebrateVictory();
            return;
        }

        this.settlementController.ProductionController.CancelAllProduction();
        this.reinforcementsCfgIds = this.settlementController.StrategyController.GetReinforcementCfgIds();

        this.timeoutTick = null;
    }

    OnExit(): void {
        this.settlementController.StrategyController.ResetEnemy();
    }

    Tick(tickNumber: number): void {
        if (this.timeoutTick == null) {
            this.timeoutTick = tickNumber + this.EXTERMINATING_TIMEOUT;
        }
        else if (tickNumber > this.timeoutTick) {
            this.settlementController.Debug(`Attack is too long-drawn, discontinuing`);
            this.settlementController.State = new DevelopingState(this.settlementController);
            return;
        }
        
        if (tickNumber % 10 != 0) {
            return;
        }

        if (tickNumber % 50 == 0) {
            if (this.settlementController.StrategyController.IsUnderAttack()) {
                this.settlementController.State = new DefendingState(this.settlementController);
                return;
            }

            this.requestReinforcementsProduction();
            this.settlementController.TacticalController.ReinforceSquads();
        }

        let combativityIndex = this.settlementController.TacticalController.OffenseCombativityIndex;

        if (combativityIndex >= this.COMBATIVITY_THRESHOLD) {
            let enemy = this.settlementController.StrategyController.CurrentEnemy;
            
            if (!enemy) {
                if (!this.selectAndAttackEnemy()) {
                    this.celebrateVictory();
                    return;
                }
            }
            else {
                if (!this.currentTarget || this.currentTarget.IsNearDeath) {
                    this.selectTarget(enemy);
                }
            }
        }
        else {
            this.settlementController.Debug(`Current combativity index '${combativityIndex}' is too low. Retreating...`);
            this.settlementController.TacticalController.Retreat();
            this.settlementController.State = new DevelopingState(this.settlementController);
            return;
        }
    }

    private celebrateVictory(): void {
        this.settlementController.Info(`No enemies left. We are victorious!`);
        this.settlementController.State = new IdleState(this.settlementController);
    }

    private selectAndAttackEnemy(): boolean {
        var enemy = this.settlementController.StrategyController.CurrentEnemy;
        
        if (!enemy) {
            enemy = this.settlementController.StrategyController.SelectEnemy();
        }
        
        if (enemy) {
            this.settlementController.Debug(`Selected '${enemy.TownName}' as an enemy. Proceeding to attack`);
            this.settlementController.TacticalController.ComposeSquads();
            this.selectTarget(enemy);
            return true;
        }
        else {
            return false;
        }
    }

    private selectTarget(enemy: any) {
        let target = this.settlementController.StrategyController.GetOffensiveTarget(enemy);

        if (target) {
            this.currentTarget = target;
            this.settlementController.TacticalController.Attack(target);
        }
    }

    private requestReinforcementsProduction() {
        for (let cfgId of this.reinforcementsCfgIds) {
            this.settlementController.ProductionController.RequestSingleProduction(cfgId);
        }
    }
}