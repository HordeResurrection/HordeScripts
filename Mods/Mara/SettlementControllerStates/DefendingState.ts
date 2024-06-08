import { SettlementControllerStateFactory } from "../SettlementControllerStateFactory";
import { MaraSquad } from "../Subcontrollers/Squads/MaraSquad";
import { MaraPoint } from "../Utils/Common";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";
import { MaraUtils, UnitComposition } from "Mara/Utils/MaraUtils";

export class DefendingState extends MaraSettlementControllerState {
    private reinforcementsCfgIds: Array<string>;
    
    OnEntry(): void {
        this.settlementController.TargetEconomySnapshot = this.settlementController.GetCurrentEconomySnapshot();
        
        this.refreshAttackersList();
        this.reinforcementsCfgIds = this.settlementController.StrategyController.GetReinforcementCfgIds();
        this.settlementController.TacticalController.Defend();
    }

    OnExit(): void {
        this.settlementController.TacticalController.DismissSquads();
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
 
        if (this.settlementController.TargetExpand) {
            if (this.settlementController.TargetExpand.BuildCenter) {
                let expandAttackers = this.registerHostileSquadsAroundPoint(
                    this.settlementController.TargetExpand.BuildCenter, 
                    this.settlementController.Settings.UnitSearch.ExpandEnemySearchRadius
                );
    
                if (expandAttackers.length > 0) {
                    this.settlementController.HostileAttackingSquads.push(...expandAttackers);
                }
            }
        }
    }

    private canRebuild(): boolean {
        let requiredEconomy = this.settlementController.TargetEconomySnapshot;

        if (!requiredEconomy) {
            return true;
        }

        this.settlementController.СleanupExpands();

        requiredEconomy = requiredEconomy.filter(
            (value) => {
                if (MaraUtils.IsBuildingConfigId(value.ConfigId)) {
                    let existingExpandIndex = this.settlementController.Expands.findIndex(
                        (expand) => {
                            return (
                                MaraUtils.ChebyshevDistance(expand, value.Position) < 
                                    Math.max(this.settlementController.Settings.ResourceMining.WoodcuttingRadius, this.settlementController.Settings.ResourceMining.MiningRadius)
                            );
                        }
                    );

                    if (existingExpandIndex > 0) {
                        return true;
                    }
                    else {
                        let settlementLocation = this.settlementController.GetSettlementLocation();

                        if (settlementLocation) {
                            return MaraUtils.ChebyshevDistance(value.Position, settlementLocation.Center) < settlementLocation.Radius;
                        }
                        else {
                            return false;
                        }
                    }
                }
                else {
                    return MaraUtils.IsHarvesterConfigId(value.ConfigId);
                }
            }
        );

        let requiredEconomyComposition: UnitComposition = new Map<string, number>();

        for (let item of requiredEconomy) {
            MaraUtils.IncrementMapItem(requiredEconomyComposition, item.ConfigId);
        }

        let currentEconomySnapshot = this.settlementController.GetCurrentEconomySnapshot();
        
        currentEconomySnapshot = currentEconomySnapshot.filter(
            (value) => {
                if (MaraUtils.IsBuildingConfigId(value.ConfigId)) {
                    return true;
                }
                else {
                    return MaraUtils.IsHarvesterConfigId(value.ConfigId);
                }
            }
        );

        let currentEconomyComposition: UnitComposition = new Map<string, number>();

        for (let item of currentEconomySnapshot) {
            MaraUtils.IncrementMapItem(currentEconomyComposition, item.ConfigId);
        }

        let unitsToProduce = MaraUtils.SubstractCompositionLists(requiredEconomyComposition, currentEconomyComposition);

        let productionEstimation = this.settlementController.ProductionController.EstimateProductionTime(unitsToProduce, false);
        let productionTime = 0;

        productionEstimation.forEach((value) => {
            productionTime += value;
        });

        this.settlementController.Debug(`Estimated rebuild time: ${productionTime}`);

        return productionTime <= this.settlementController.Settings.Timeouts.RebuildEstimationThreshold / 2;
    }
}