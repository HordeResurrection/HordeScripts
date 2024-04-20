import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";
import { MaraUtils } from "Mara/Utils/MaraUtils";

export class DefendingState extends MaraSettlementControllerState {
    private reinforcementsCfgIds: Array<string>;
    
    OnEntry(): void {
        this.settlementController.TargetUnitsComposition = this.settlementController.GetCurrentEconomyComposition();
        
        this.refreshAttackersList();
        this.reinforcementsCfgIds = this.settlementController.StrategyController.GetReinforcementCfgIds();
        this.settlementController.TacticalController.Defend();
    }

    OnExit(): void {
        
    }

    Tick(tickNumber: number): void {
        if (tickNumber % 50 == 0) {
            if (!this.settlementController.StrategyController.IsUnderAttack()) {
                this.settlementController.Debug(`Attack countered`);
                
                if (this.canRebuild()) {
                    this.settlementController.Debug(`Damage is acceptable, rebuilding`);
                    this.settlementController.State = SettlementControllerStateFactory.MakeRebuildState(this.settlementController);
                }
                else {
                    this.settlementController.Debug(`Damage is too severe, starting to build up from lower tier`);
                    this.settlementController.State = SettlementControllerStateFactory.MakeBuildingUpState(this.settlementController);
                }

                return;
            }
            else {
                this.refreshAttackersList();
                this.requestReinforcementsProduction();
                this.settlementController.TacticalController.ReinforceSquads();
            }
        }
    }

    private requestReinforcementsProduction() {
        for (let cfgId of this.reinforcementsCfgIds) {
            this.settlementController.ProductionController.ForceRequestSingleProduction(cfgId);
        }
    }

    private refreshAttackersList(): void {
        this.settlementController.HostileAttackingSquads = [];

        //TODO: add enemy detection around expands
        let settlementLocation = this.settlementController.GetSettlementLocation();

        if (!settlementLocation) {
            return;
        }

        let attackers = this.settlementController.StrategyController.GetEnemiesInArea(settlementLocation.Center, settlementLocation.Radius);
        
        let attackingSquads = MaraUtils.GetSettlementsSquadsFromUnits(
            attackers, 
            this.settlementController.StrategyController.EnemySettlements,
            (unit) => {return MaraUtils.ChebyshevDistance(unit.Cell, settlementLocation!.Center) <= settlementLocation!.Radius}
        );

        this.settlementController.HostileAttackingSquads.push(...attackingSquads);
    }

    private canRebuild(): boolean {
        let requiredEconomy = this.settlementController.TargetUnitsComposition;

        if (!requiredEconomy) {
            return true;
        }

        let currentEconomy = this.settlementController.GetCurrentDevelopedEconomyComposition();
        let currentBuildings = new Map<string, number>();

        currentEconomy.forEach((value, key) => {
            if (MaraUtils.IsBuildingConfig(key)) {
                currentBuildings.set(key, value);
            }
        });

        let requiredBuildings = new Map<string, number>();

        requiredEconomy.forEach((value, key) => {
            if (MaraUtils.IsBuildingConfig(key)) {
                requiredBuildings.set(key, value);
            }
        });

        let unbuiltBuildings = MaraUtils.SubstractCompositionLists(requiredBuildings, currentBuildings);
        let productionEstimation = this.settlementController.ProductionController.EstimateProductionTime(unbuiltBuildings, false);
        let productionTime = 0;

        productionEstimation.forEach((value) => {
            productionTime += value;
        });

        this.settlementController.Debug(`Estimated rebuild time: ${productionTime}`);

        return productionTime <= this.settlementController.Settings.Timeouts.RebuildEstimationThreshold / 2;
    }
}