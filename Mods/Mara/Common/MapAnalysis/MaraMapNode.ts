import { MaraMap } from "./MaraMap";
import { MaraMapNodeType } from "./MaraMapNodeType";
import { MaraRegion } from "./MaraRegion";

export class MaraMapNode {
    private static maxId: number = 0;
    
    Region: MaraRegion;
    Neighbours: Array<MaraMapNode>;
    Type: MaraMapNodeType;
    TileType: any;
    Weigth: number;
    ShortestDistance: number;
    Id: number;

    constructor (region: MaraRegion, neighbours: Array<MaraMapNode>, type: MaraMapNodeType) {
        this.Region = region;
        this.Neighbours = neighbours;
        this.Type = type;
        this.Weigth = 0;
        this.ShortestDistance = Infinity;
        this.TileType = MaraMap.GetTileType(this.Region.Cells[0]);

        this.Id = MaraMapNode.maxId;
        MaraMapNode.maxId ++;
    }
}