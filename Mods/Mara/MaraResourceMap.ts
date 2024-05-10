import { MaraPoint } from "./Utils/Common";
import { MaraUtils, ResourceType } from "./Utils/MaraUtils";

const CLUSTER_SIZE = 8;

export enum MaraResourceType {
    Wood,
    Metal,
    Gold,
    People
}

export class MaraResourceMap {
    public static ResourceClusters: Map<string, MaraResourceCluster>;
    
    public static Init() {
        let maxRowIndex = Math.floor(MaraUtils.GetScenaHeigth() / CLUSTER_SIZE);
        let maxColIndex = Math.floor(MaraUtils.GetScenaWidth() / CLUSTER_SIZE);

        MaraResourceMap.ResourceClusters = new Map<string, MaraResourceCluster>();
        
        for (let rowIndex = 0; rowIndex < maxRowIndex; rowIndex ++) {
            for (let colIndex = 0; colIndex < maxColIndex; colIndex ++) {
                let cluster = new MaraResourceCluster(colIndex, rowIndex);

                if (cluster.WoodAmount > 1120 || cluster.MetalAmount > 0 || cluster.GoldAmount > 0) {
                    MaraResourceMap.ResourceClusters.set(cluster.ToString(), cluster);
                }
            }
        }
    }
}

export class MaraResourceCluster {
    public readonly Index: MaraPoint;
    public readonly Coordinates: MaraPoint;
    public readonly Size: number = CLUSTER_SIZE;

    public WoodCells: Array<MaraPoint> = [];
    public MetalCells: Array<MaraPoint> = [];
    public GoldCells: Array<MaraPoint> = [];

    constructor(x: number, y: number) {
        this.Index = new MaraPoint(x, y);
        this.Coordinates = new MaraPoint(x * CLUSTER_SIZE, y * CLUSTER_SIZE);

        let maxRow = Math.min(this.Coordinates.Y + CLUSTER_SIZE, MaraUtils.GetScenaHeigth());
        let maxCol = Math.min(this.Coordinates.X + CLUSTER_SIZE, MaraUtils.GetScenaWidth());
        
        for (let row = this.Coordinates.Y; row < maxRow; row ++) {
            for (let col = this.Coordinates.X; col < maxCol; col ++) {
                let resourceType = MaraUtils.GetCellMineralType(col, row);
                let point = new MaraPoint(col, row);

                switch (resourceType) {
                    case ResourceType.Metal:
                        this.MetalCells.push(point);
                        break;
                    case ResourceType.Gold:
                        this.GoldCells.push(point);
                        break;
                    default:
                        let treesCount = MaraUtils.GetCellTreesCount(col, row);
                        
                        if (treesCount > 0) {
                            this.WoodCells.push(point);
                        }
                        
                        break;
                }
            }
        }
    }

    public get WoodAmount() {
        let amount = 0;
        
        for (let cell of this.WoodCells) {
            amount += MaraUtils.GetCellTreesCount(cell.X, cell.Y);
        }

        return amount * 10;
    }

    public get GoldAmount() {
        let amount = 0;
        
        for (let cell of this.GoldCells) {
            amount += MaraUtils.GetCellMineralsAmount(cell.X, cell.Y);
        }

        return amount;
    }

    public get MetalAmount() {
        let amount = 0;
        
        for (let cell of this.MetalCells) {
            amount += MaraUtils.GetCellMineralsAmount(cell.X, cell.Y);
        }

        return amount;
    }

    public get Center(): MaraPoint {
        return new MaraPoint(this.Coordinates.X + CLUSTER_SIZE / 2, this.Coordinates.Y + CLUSTER_SIZE / 2);
    }

    public ToString(): string {
        return this.Index.ToString();
    }
}