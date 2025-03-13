
import { MaraUtils } from "Mara/MaraUtils";
import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { MaraProductionRequestItem } from "../Common/MaraProductionRequestItem";
import { MaraResources } from "../Common/MapAnalysis/MaraResources";
import { MaraPoint } from "../Common/MaraPoint";
import { UnitComposition } from "../Common/UnitComposition";
import { MaraProductionRequest } from "../Common/MaraProductionRequest";
import { MaraMap } from "../Common/MapAnalysis/MaraMap";
import { MaraMapNodeType } from "../Common/MapAnalysis/MaraMapNodeType";
import { MaraPath } from "../Common/MapAnalysis/MaraPath";
import { SubcontrollerTaskState } from "./SubcontrollerTaskState";

export abstract class ProductionTaskState extends SubcontrollerTaskState {
    private requests: Array<MaraProductionRequest>;
    private targetComposition: UnitComposition;

    protected abstract getProductionRequests(): Array<MaraProductionRequest>;
    protected abstract onTargetCompositionReached(): void;
    protected abstract onProductionTimeout(): void;

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
            for (let item of request.Items) {
                MaraUtils.IncrementMapItem(this.targetComposition, item.ConfigId);
            }
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
        let item = new MaraProductionRequestItem(configId, point, precision);
        let productionRequest = new MaraProductionRequest([item], isForce);
        this.settlementController.ProductionController.RequestProduction(productionRequest);
        
        return productionRequest;
    }

    protected makeProductionQueueRequest(
        items: Array<MaraProductionRequestItem>
    ): MaraProductionRequest {
        let productionRequest = new MaraProductionRequest(items, false);
        this.settlementController.ProductionController.RequestProduction(productionRequest);
        
        return productionRequest;
    }

    protected makeBridgeProductionRequest(path: MaraPath | null): MaraProductionRequest | null {
        if (!path) {
            this.settlementController.Debug(`Unable to build bridge: path not found`);
            return null;
        }
        
        let from = path.Nodes[0].Region.Center;
        let to = path.Nodes[path.Nodes.length - 1].Region.Center;
        this.settlementController.Debug(`Requesting bridge build from ${from.ToString()} to ${to.ToString()}`)
        
        let produceableCfgIds = this.settlementController.ProductionController.GetProduceableCfgIds();
        let bridgeCfgId = produceableCfgIds.find((cfgId) => MaraUtils.IsWalkableConfigId(cfgId));

        if (!bridgeCfgId) {
            this.settlementController.Debug(`Unable to build bridge: no available bridge config`);
            return null;
        }

        let requestItems: Array<MaraProductionRequestItem> = [];

        for (let curNodeIndex = 0; curNodeIndex < path.Nodes.length - 1; curNodeIndex ++) {
            let currentNode = path.Nodes[curNodeIndex];
            let nextNode = path.Nodes[curNodeIndex + 1];

            if (
                (
                    currentNode.Type == MaraMapNodeType.Walkable ||
                    currentNode.Type == MaraMapNodeType.Gate
                ) &&
                nextNode.Type == MaraMapNodeType.Unwalkable
            ) {
                for (
                    let nextNodeIndex = curNodeIndex + 1; 
                    nextNodeIndex < path.Nodes.length;
                    nextNodeIndex ++
                ) {
                    let nextNode = path.Nodes[nextNodeIndex];

                    if (
                        nextNode.Type == MaraMapNodeType.Walkable ||
                        nextNode.Type == MaraMapNodeType.Gate
                    ) {
                        let subpath = path.Nodes.slice(curNodeIndex, nextNodeIndex + 1);
                        let bridgeSections = MaraMap.ConnectMapNodesByBridge(subpath, bridgeCfgId, this.settlementController.MasterMind);

                        if (bridgeSections.length == 0) {
                            this.settlementController.Debug(`Unable to markup bridge from ${currentNode.Region.Center} to ${nextNode.Region.Center}`);
                            return null;
                        }

                        for (let section of bridgeSections) {
                            let item = new MaraProductionRequestItem(bridgeCfgId, section.TopLeft, 0);
                            requestItems.push(item);
                        }
                        
                        curNodeIndex = nextNodeIndex + 1;
                        break;
                    }
                }
            }
        }

        if (requestItems.length > 0) {
            return this.makeProductionQueueRequest(requestItems);
        }
        else {
            this.settlementController.Debug(`Destination is reachable, bridge is not needed`);
            return null;
        }
    }

    private getRequestsToReorder(): Array<MaraProductionRequest> {
        let completedRequests = this.requests.filter((value) => {return value.IsCompleted});

        let orderedRequests = this.requests.filter((value) => {return !value.IsCompleted});
        let developedComposition = this.settlementController.GetCurrentDevelopedEconomyComposition();
        let compositionToRequest = MaraUtils.SubstractCompositionLists(this.targetComposition, developedComposition);

        for (let request of orderedRequests) {
            for (let item of request.Items) {
                MaraUtils.DecrementMapItem(compositionToRequest, item.ConfigId);
            }
        }

        let requestsToReorder = new Map<number, MaraProductionRequest>();
        let unknownRequestItems: Array<MaraProductionRequestItem> = [];
        
        for (let request of completedRequests) {
            for (let item of request.Items) {
                if (item.IsSuccess) {
                    if (item.ProducedUnit) {
                        if (!item.ProducedUnit.IsAlive) {
                            item.WipeResults();
                            MaraUtils.DecrementMapItem(compositionToRequest, item.ConfigId);
                        }
                    }
                    else {
                        unknownRequestItems.push(item);
                    }
                }
                else {
                    item.WipeResults();
                    MaraUtils.DecrementMapItem(compositionToRequest, item.ConfigId);
                }
            }

            if (!request.IsCompleted) { // this will change after above actions on request items
                requestsToReorder.set(request.Id, request);
            }
        }

        compositionToRequest.forEach(
            (value, key) => {
                let requestCount = value;
                
                for (let item of unknownRequestItems) {
                    if (requestCount == 0) {
                        break;
                    }
                    
                    if (item.ConfigId == key) {
                        item.WipeResults();
                        requestsToReorder.set(item.ParentRequest.Id, item.ParentRequest);
                        requestCount --;
                    }
                }
            }
        );

        let result: Array<MaraProductionRequest> = [];
        requestsToReorder.forEach((v) => result.push(v));

        return result;
    }

    private getInsufficientResources(): MaraResources {
        let compositionToProduce: UnitComposition = new Map<string, number>();

        for (let request of this.requests) {
            for (let item of request.Items) {
                MaraUtils.IncrementMapItem(compositionToProduce, item.ConfigId);
            }
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