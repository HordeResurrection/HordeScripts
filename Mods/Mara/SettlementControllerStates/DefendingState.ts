import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraSquad } from "../Subcontrollers/Squads/MaraSquad";
import { MaraPoint } from "../Utils/Common";
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
                    this.settlementController.State = SettlementControllerStateFactory.MakeRoutingState(this.settlementController);
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
            this.settlementController.ProductionController.ForceRequestSingleCfgIdProduction(cfgId);
        }
    }

    private registerHostileSquadsAroundPoint(point: MaraPoint, radius: number): Array<MaraSquad> {
        let attackers = this.settlementController.StrategyController.GetEnemiesInArea(point, radius);
        
        return MaraUtils.GetSettlementsSquadsFromUnits(
            attackers, 
            this.settlementController.StrategyController.EnemySettlements,
            (unit) => {return MaraUtils.ChebyshevDistance(unit.Cell, point) <= radius}
        );
    }

    private refreshAttackersList(): void {
        this.settlementController.HostileAttackingSquads = [];
        let settlementLocation = this.settlementController.GetSettlementLocation();

        if (!settlementLocation) {
            return;
        }

        let attackingSquads = this.registerHostileSquadsAroundPoint(
            new MaraPoint(settlementLocation.Center.X, settlementLocation.Center.Y), 
            settlementLocation.Radius
        );
        
        this.settlementController.HostileAttackingSquads.push(...attackingSquads);

        for (let expandPoint of this.settlementController.Expands) {
            let expandAttackers = this.registerHostileSquadsAroundPoint(
                expandPoint, 
                this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
            );

            if (expandAttackers.length > 0) {
                this.settlementController.HostileAttackingSquads.push(...expandAttackers);
            }
        }
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