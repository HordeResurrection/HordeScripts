
export class AllowedCompositionItem {
    UnitConfigId: string;
    MaxCount: number;

    constructor(cfg: any, maxCount: number) {
        this.UnitConfigId = cfg.Uid;
        this.MaxCount = maxCount;
    }
}
