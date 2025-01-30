import { MaraMap } from "./MaraMap";
import { MaraMapNodeLink } from "./MaraMapNodeLink";
import { MaraMapNodeType } from "./MaraMapNodeType";
import { MaraRegion } from "./MaraRegion";

export class MaraMapNode {
    private static maxId: number = 0;
    
    Region: MaraRegion;
    Links: Array<MaraMapNodeLink>;
    Type: MaraMapNodeType;
    TileType: any;
    Id: number;

    // pathfinding options, probably need to be moved
    // into some kind of wrapper class
    Weigth: number;
    ShortestDistance: number;
    AStarHeuristic: number;
    PrevNode: MaraMapNode;

    constructor (region: MaraRegion, links: Array<MaraMapNodeLink>, type: MaraMapNodeType) {
        this.Region = region;
        this.Links = links;
        this.Type = type;
        this.Weigth = 0;
        this.ShortestDistance = Infinity;
        this.TileType = MaraMap.GetTileType(this.Region.Cells[0]);

        this.Id = MaraMapNode.maxId;
        MaraMapNode.maxId ++;
    }

    IsWalkable(): boolean {
        return this.Type == MaraMapNodeType.Gate || this.Type == MaraMapNodeType.Walkable;
    }
}