import { MaraMapNodeType } from "./MaraMapNodeType";
import { MaraRegion } from "./MaraRegion";

export class MaraMapNode {
    Region: MaraRegion;
    Neighbours: Array<MaraMapNode>;
    Type: MaraMapNodeType;
    Weigth: number;
    ShortestDistance: number;

    constructor (region: MaraRegion, neighbours: Array<MaraMapNode>, type: MaraMapNodeType) {
        this.Region = region;
        this.Neighbours = neighbours;
        this.Type = type;
        this.Weigth = 0;
        this.ShortestDistance = Infinity;
    }
}