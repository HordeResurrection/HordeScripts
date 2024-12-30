import { MaraUnitCacheItem } from "../Common/Cache/MaraUnitCacheItem";
import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class ExterminatingState extends MaraSettlementControllerState {
    private currentTarget: MaraUnitCacheItem | null; //but actually Unit
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
            this.timeoutTick = tickNumber + this.settlementController.Settings.Timeouts.Exterminate;
        }
        else if (tickNumber > this.timeoutTick) {
            this.settlementController.Debug(`Attack is too long-drawn, discontinuing`);
            this.settlementController.State = SettlementControllerStateFactory.MakeRoutingState(this.settlementController);
            return;
        }
        
        if (tickNumber % 10 != 0) {
            return;
        }

        if (tickNumber % 50 == 0) {
            if (this.settlementController.StrategyController.IsUnderAttack()) {
                this.settlementController.State = SettlementControllerStateFactory.MakeDefendingState(this.settlementController);
                return;
            }

            this.requestReinforcementsProduction();
        }

        let combativityIndex = this.settlementController.TacticalController.OffenseCombativityIndex;

        if (combativityIndex >= this.settlementController.Settings.ControllerStates.ExterminatingLossRatioThreshold) {
            let enemy = this.settlementController.StrategyController.CurrentEnemy;
            
            if (!enemy) {
                if (!this.selectAndAttackEnemy()) {
                    this.celebrateVictory();
                    return;
                }
            }
            else {
                if (!this.isValidTarget(this.currentTarget)) {
                    this.selectTarget(enemy);
                }
            }
        }
        else {
            this.settlementController.Debug(`Current combativity index '${combativityIndex}' is too low. Retreating...`);
            this.settlementController.TacticalController.Retreat();
            this.settlementController.State = SettlementControllerStateFactory.MakeRoutingState(this.settlementController);
            return;
        }
    }

    TacticalControllerTick(): void {
        this.settlementController.TacticalController.AttackTick();
    }

    private celebrateVictory(): void {
        this.settlementController.Info(`No enemies left. We are victorious!`);
        this.settlementController.TacticalController.StopAttack();
        this.settlementController.State = SettlementControllerStateFactory.MakeIdleState(this.settlementController);
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
            this.settlementController.ProductionController.RequestSingleCfgIdProduction(cfgId);
        }
    }
    private isValidTarget(unit: MaraUnitCacheItem | null): boolean {
        return !(
            !unit || 
            !unit.UnitIsAlive ||
            this.settlementController.StrategyController.CurrentEnemy != unit.UnitOwner
        );
    }
}