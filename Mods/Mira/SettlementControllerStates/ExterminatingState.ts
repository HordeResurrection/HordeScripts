import { MiraLogLevel } from "Mira/Mira";
import { MiraSettlementControllerState } from "./MiraSettlementControllerState";
import { IdleState } from "./IdleState";
import { DefendingState } from "./DefendingState";
import { DevelopingState } from "./DevelopingState";

export class ExterminatingState extends MiraSettlementControllerState {
    private readonly COMBATIVITY_THRESHOLD = 0.33;
    private currentTarget: any; //but actually Unit
    private reinforcementsCfgIds: Array<string>;
    
    OnEntry(): void {
        this.settlementController.ProductionController.CancelAllProduction();
        this.reinforcementsCfgIds = this.settlementController.StrategyController.GetReinforcementCfgIds();
        
        if (!this.selectAndAttackEnemy()) {
            this.celebrateVictory();
            return;
        }
    }

    OnExit(): void {
        this.settlementController.StrategyController.ResetEnemy();
    }

    Tick(tickNumber: number): void {
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
                if (!this.currentTarget || this.currentTarget.IsDead) {
                    this.selectTarget(enemy);
                }
            }
        }
        else {
            this.settlementController.Log(MiraLogLevel.Debug, `Current combativity index '${combativityIndex}' is too low. Retreating...`);
            this.settlementController.TacticalController.Retreat();
            this.settlementController.State = new DevelopingState(this.settlementController);
            return;
        }
    }

    private celebrateVictory(): void {
        this.settlementController.Log(MiraLogLevel.Info, "No enemies left. We are victorious!")
        this.settlementController.State = new IdleState(this.settlementController);
    }

    private selectAndAttackEnemy(): boolean {
        var enemy = this.settlementController.StrategyController.CurrentEnemy;
        
        if (!enemy) {
            enemy = this.settlementController.StrategyController.SelectEnemy();
        }
        
        if (enemy) {
            this.settlementController.Log(MiraLogLevel.Debug, `Selected '${enemy.TownName}' as an enemy. Proceeding to attack`);
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