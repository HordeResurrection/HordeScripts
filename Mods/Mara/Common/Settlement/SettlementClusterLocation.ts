import { MaraRect } from "../MaraRect";

export class SettlementClusterLocation {
    Center: any;
    BoundingRect: MaraRect;

    constructor(center: any, boundingRect: MaraRect) {
        this.Center = center;
        this.BoundingRect = boundingRect;
    }
}
