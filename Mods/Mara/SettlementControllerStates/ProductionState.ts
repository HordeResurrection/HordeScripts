import { MaraUtils } from "Mara/MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";
import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { MaraProductionRequest } from "../Common/MaraProductionRequest";
import { MaraResources } from "../Common/Resources/MaraResources";
import { MaraPoint } from "../Common/MaraPoint";
import { UnitComposition } from "../Common/UnitComposition";

export abstract class ProductionState extends MaraSettlementControllerState {
    private requests: Array<MaraProductionRequest>;
    private targetComposition: UnitComposition;

    protected abstract getProductionRequests(): Array<MaraProductionRequest>;
    protected abstract onTargetCompositionReached(): void;

    private timeoutTick: number | null;
    
    OnEntry(): void {
        if (!this.onEntry()) {
            return;
        }
        
        this.settlementController.ProductionController.CancelAllProduction();
        
        this.requests = this.getProductionRequests();
        this.targetComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();
        
        let insufficientResources = this.getInsufficientResources();

        if (
            insufficientResources.Gold > 0 ||
            insufficientResources.Metal > 0 ||
            insufficientResources.Wood > 0 ||
            insufficientResources.People > 0
        ) {
            this.settlementController.Debug(`Not enough resources to produce target composition: ${insufficientResources.ToString()}`);

            if (this.settlementController.CanMineResources) {
                if (!this.onInsufficientResources(insufficientResources)) {
                    return;
                }
            }
            else {
                this.settlementController.Debug(`Unable to build expand, proceeding to production anyway`);
            }
        }

        for (let request of this.requests) {
            MaraUtils.IncrementMapItem(this.targetComposition, request.ConfigId);
        }

        this.timeoutTick = null;
    }

    OnExit(): void {
        this.onExit();
    }

    Tick(tickNumber: number): void {
        let timeout = this.getProductionTimeout();
        
        if (timeout != null) {
            if (this.timeoutTick == null) {
                this.settlementController.Debug(`Set production timeout to ${timeout} ticks`);
                this.timeoutTick = tickNumber + timeout;
            }
            else if (tickNumber > this.timeoutTick) {
                this.settlementController.Debug(`Production is too long-drawn, discontinuing`);
                this.onTargetCompositionReached();
                return;
            }
        }
        
        if (tickNumber % 10 != 0) {
            return;
        }

        if (tickNumber % 50 == 0) {
            if (this.settlementController.StrategyController.IsUnderAttack()) {
                this.settlementController.State = SettlementControllerStateFactory.MakeDefendingState(this.settlementController);
                return;
            }
        }

        let requestsToReorder = this.getRequestsToReorder();
        
        if (requestsToReorder.length == 0) {
            let isAllRequestsCompleted = true;

            for (let request of this.requests) {
                if (!request.IsCompleted) {
                    isAllRequestsCompleted = false;
                    break;
                }
            }
            
            if (isAllRequestsCompleted) {
                this.onTargetCompositionReached();
                return;
            }
        }
        else {
            for (let request of requestsToReorder) {
                request.WipeResults();
                this.settlementController.ProductionController.RequestProduction(request);
            }
        }
    }

    protected onEntry(): boolean {
        return true;
    }

    protected onExit(): void {
        //do nothing
    }

    protected getProductionTimeout(): number | null {
        return null;
    }

    protected onInsufficientResources(insufficientResources: MaraResources): boolean {
        return true;
    }

    protected makeProductionRequest(
        configId: string, 
        point: MaraPoint | null, 
        precision: number | null,
        isForce: boolean = false
    ): MaraProductionRequest {
        let productionRequest = new MaraProductionRequest(configId, point, precision, isForce);
        this.settlementController.ProductionController.RequestProduction(productionRequest);
        
        return productionRequest;
    }

    private getRequestsToReorder(): Array<MaraProductionRequest> {
        let completedRequests = this.requests.filter((value) => {return value.IsCompleted});
        let orderedRequests = this.requests.filter((value) => {return !value.IsCompleted});

        let developedComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();
        let compositionToRequest = MaraUtils.SubstractCompositionLists(this.targetComposition, developedComposition);

        for (let request of orderedRequests) {
            MaraUtils.DecrementMapItem(compositionToRequest, request.ConfigId);
        }

        let requestsToReorder: Array<MaraProductionRequest> = [];
        let unknownRequests: Array<MaraProductionRequest> = [];
        
        for (let request of completedRequests) {
            if (request.IsSuccess) {
                if (request.ProducedUnit) {
                    if (!request.ProducedUnit.IsAlive) {
                        requestsToReorder.push(request);
                        MaraUtils.DecrementMapItem(compositionToRequest, request.ConfigId);
                    }
                }
                else {
                    unknownRequests.push(request);
                }
            }
            else {
                requestsToReorder.push(request);
                MaraUtils.DecrementMapItem(compositionToRequest, request.ConfigId);
            }
        }

        compositionToRequest.forEach(
            (value, key) => {
                let requestCount = value;
                
                for (let request of unknownRequests) {
                    if (requestCount == 0) {
                        break;
                    }
                    
                    if (request.ConfigId == key) {
                        requestsToReorder.push(request);
                        requestCount --;
                    }
                }
            }
        );

        return requestsToReorder;
    }

    private getInsufficientResources(): MaraResources {
        let compositionToProduce: UnitComposition = new Map<string, number>();

        for (let request of this.requests) {
            MaraUtils.IncrementMapItem(compositionToProduce, request.ConfigId);
        }

        this.settlementController.Debug(`Current unit composition to produce:`);
        MaraUtils.PrintMap(compositionToProduce);

        let compositionCost = this.calculateCompositionCost(compositionToProduce);
        this.settlementController.Debug(`Target composition cost: ${compositionCost.ToString()}`);

        let currentResources = this.settlementController.MiningController.GetTotalResources();
        this.settlementController.Debug(`Current resources: ${currentResources.ToString()}`);

        let insufficientResources = new MaraResources(
            Math.max(compositionCost.Wood - currentResources.Wood, 0), 
            Math.max(compositionCost.Metal - currentResources.Metal, 0), 
            Math.max(compositionCost.Gold - currentResources.Gold, 0), 
            Math.max(compositionCost.People - currentResources.People, 0)
        );

        return insufficientResources;
    }

    private calculateCompositionCost(composition: UnitComposition): MaraResources {
        let result = new MaraResources(0, 0, 0, 0);

        composition.forEach((value, key) => {
            let config = MaraUtils.GetUnitConfig(key);
            let cost = config.CostResources;

            result.Gold += cost.Gold * value;
            result.Metal += cost.Metal * value;
            result.Wood += cost.Lumber * value;
            result.People += cost.People * value;
        });

        return result;
    }
}