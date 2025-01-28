import { MaraUtils } from "Mara/MaraUtils";
import { ProductionState } from "./ProductionState";
import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { MaraResources } from "../Common/MapAnalysis/MaraResources";
import { MaraProductionRequest } from "../Common/MaraProductionRequest";
import { MaraMap } from "../Common/MapAnalysis/MaraMap";
import { TileType } from "library/game-logic/horde-types";

export class BuildingUpState extends ProductionState {
    protected getProductionTimeout(): number | null {
        return MaraUtils.Random(
            this.settlementController.MasterMind,
            this.settlementController.Settings.Timeouts.MaxBuildUpProduction,
            this.settlementController.Settings.Timeouts.MinBuildUpProduction
        );
    }
    
    protected getProductionRequests(): Array<MaraProductionRequest> {
        let enemy = this.settlementController.StrategyController.CurrentEnemy
        
        if (!enemy) {
            enemy = this.settlementController.StrategyController.SelectEnemy();

            if (enemy) {
                this.settlementController.Debug(`Selected '${enemy.TownName}' as an enemy.`);
            }
            else {
                this.settlementController.Debug(`No enemies left to build-up against`);
            }
        }

        if (enemy) {
            this.settlementController.Debug(`Proceeding to build-up against '${enemy.TownName}'.`);
            let armyToProduce = this.settlementController.StrategyController.GetSettlementAttackArmyComposition();

            let result = new Array<MaraProductionRequest>();

            armyToProduce.forEach(
                (value, key) => {
                    for (let i = 0; i < value; i++) {
                        result.push(this.makeProductionRequest(key, null, null));
                    }
                }
            );

            let settlementLocation = this.settlementController.GetSettlementLocation();

            if (settlementLocation) {
                let attackTarget = this.settlementController.StrategyController.GetOffensiveTarget(enemy);

                if (attackTarget) {
                    let paths = MaraMap.GetPaths(settlementLocation.Center, attackTarget.UnitCell, [TileType.Water]);
                    
                    let waterPaths = paths.filter(
                        (p) => p.Nodes.findIndex(
                            (n) => n.TileType == TileType.Water
                        ) > -1
                    );

                    let randomPath = MaraUtils.RandomSelect(this.settlementController.MasterMind, waterPaths)
                
                    if (randomPath) {
                        let bridgeRequest = this.makeBridgeProductionRequest(randomPath);

                        if (bridgeRequest) {
                            result.push(bridgeRequest);
                        }
                    }
                }
            }
            
            return result;
        }
        else {
            return [];
        }
    }

    protected onTargetCompositionReached(): void {
        this.settlementController.State = SettlementControllerStateFactory.MakeExterminatingState(this.settlementController);
    }

    protected onInsufficientResources(insufficientResources: MaraResources): boolean {
        this.settlementController.Debug(`Preparing expand`);
        
        this.fillExpandData(insufficientResources);
        this.settlementController.State = SettlementControllerStateFactory.MakeExpandPrepareState(this.settlementController);
        return false;
    }
}