import { MaraUnitCacheItem } from "../Common/Cache/MaraUnitCacheItem";
import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class ExpandSecureState extends MaraSettlementControllerState {
    private currentTarget: MaraUnitCacheItem | null; //but actually Unit
    //private reinforcementsCfgIds: Array<string>;
    private timeoutTick: number | null;    
    
    OnEntry(): void {
        if (!this.selectAndAttackEnemy()) {
            this.proceedToBuildExpand();
            return;
        }

        this.settlementController.ProductionController.CancelAllProduction();
        //this.reinforcementsCfgIds = this.settlementController.StrategyController.GetReinforcementCfgIds();

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
            this.settlementController.Debug(`Expand secure is too long-drawn, discontinuing`);
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

            // this.requestReinforcementsProduction();
            // this.settlementController.TacticalController.ReinforceSquads();
        }

        let combativityIndex = this.settlementController.TacticalController.OffenseCombativityIndex;

        if (combativityIndex >= this.settlementController.Settings.ControllerStates.ExterminatingLossRatioThreshold) {
            if (!this.currentTarget || !this.currentTarget.UnitIsAlive) {
                if ( !this.selectTarget() ) {
                    this.proceedToBuildExpand();
                    return;
                }
            }
        }
        else {
            this.settlementController.Debug(`Failed to secure expand: current combativity index '${combativityIndex}' is too low. Retreating...`);
            this.settlementController.TacticalController.Retreat();
            this.settlementController.State = SettlementControllerStateFactory.MakeRoutingState(this.settlementController);
            return;
        }
    }

    TacticalControllerTick(): void {
        this.settlementController.TacticalController.AttackTick();
    }

    private proceedToBuildExpand(): void {
        this.settlementController.Info(`Expand location is secured, proceeding to build expand`);
        this.settlementController.TacticalController.StopAttack();
        this.settlementController.State = SettlementControllerStateFactory.MakeExpandBuildState(this.settlementController);
    }

    private selectAndAttackEnemy(): boolean {
        this.settlementController.TacticalController.ComposeSquads();
        return this.selectTarget();
    }

    private selectTarget(): boolean {
        this.currentTarget = null;
        let targetCluster = this.settlementController.TargetExpand?.Cluster;
        
        if (!targetCluster) {
            return false;
        }

        let target = this.settlementController.StrategyController.GetExpandOffenseTarget(targetCluster.Center);

        if (target) {
            this.currentTarget = target;
            this.settlementController.TacticalController.Attack(target);
        }

        return target != null;
    }

    // private requestReinforcementsProduction() {
    //     for (let cfgId of this.reinforcementsCfgIds) {
    //         this.settlementController.ProductionController.RequestSingleProduction(cfgId);
    //     }
    // }
}