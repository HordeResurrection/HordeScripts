import { MaraUnitCacheItem } from "./Cache/MaraUnitCacheItem";
import { MaraProductionRequestItem } from "./MaraProductionRequestItem";

export class MaraProductionRequest {
    private static idSequence = 0;
    
    public IsForce: boolean = false;
    public Executor: MaraUnitCacheItem | null = null;
    public Items: Array<MaraProductionRequestItem>;
    public Id = 0;

    public get IsExecuting(): boolean {
        return this.Items.find((i) => i.IsExecuting) != undefined;
    }
    
    constructor(
        items: Array<MaraProductionRequestItem>,
        isForce?: boolean
    ) {
        this.Items = items;
        this.Items.forEach((i) => i.ParentRequest = this);
        this.IsForce = isForce ?? false;

        MaraProductionRequest.idSequence ++;
        this.Id = MaraProductionRequest.idSequence;
    }

    public get IsCompleted(): boolean {
        return this.Items.every((i) => i.IsCompleted);
    }

    public ToString(): string {
        return this.Items.map((i) => i.ToString()).join("\n");
    }
}