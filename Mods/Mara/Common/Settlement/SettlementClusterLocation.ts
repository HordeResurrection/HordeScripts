import { MaraPoint } from "../MaraPoint";
import { MaraRect } from "../MaraRect";

export class SettlementClusterLocation {
    Center: MaraPoint;
    BoundingRect: MaraRect;

    constructor(center: MaraPoint, boundingRect: MaraRect) {
        this.Center = center;
        this.BoundingRect = boundingRect;
    }
}
