
export class AllowedCompositionItem {
    UnitConfig: any;
    MaxCount: number;

    constructor(cfg: any, maxCount: number) {
        this.UnitConfig = cfg;
        this.MaxCount = maxCount;
    }
}
