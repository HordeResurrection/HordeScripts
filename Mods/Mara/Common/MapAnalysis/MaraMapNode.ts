import { MaraMapNodeType } from "./MaraMapNodeType";
import { MaraRegion } from "./MaraRegion";

export class MaraMapNode {
    private static maxId: number = 0;
    
    Region: MaraRegion;
    Neighbours: Array<MaraMapNode>;
    Type: MaraMapNodeType;
    Weigth: number;
    ShortestDistance: number;
    Id: number;

    constructor (region: MaraRegion, neighbours: Array<MaraMapNode>, type: MaraMapNodeType) {
        this.Region = region;
        this.Neighbours = neighbours;
        this.Type = type;
        this.Weigth = 0;
        this.ShortestDistance = Infinity;

        this.Id = MaraMapNode.maxId;
        MaraMapNode.maxId ++;
    }
}