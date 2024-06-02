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
    public static ProcessedCells: Set<string> = new Set<string>();
    
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

        let nextCells: Array<MaraPoint> = [];
        
        for (let row = this.Coordinates.Y; row < maxRow; row ++) {
            for (let col = this.Coordinates.X; col < maxCol; col ++) {
                let cell = new MaraPoint(col, row);
                nextCells.push(cell);
            }
        }

        while (nextCells.length > 0) {
            let currentCells = [...nextCells];
            nextCells = [];

            for (let cell of currentCells) {
                if (MaraResourceMap.ProcessedCells.has(cell.ToString())) {
                    continue;
                }

                MaraResourceMap.ProcessedCells.add(cell.ToString());
                
                let resourceType = MaraUtils.GetCellMineralType(cell.X, cell.Y);
                let isMineralCell = false;

                switch (resourceType) {
                    case ResourceType.Metal:
                        this.MetalCells.push(cell);
                        isMineralCell = true;
                        break;
                    case ResourceType.Gold:
                        this.GoldCells.push(cell);
                        isMineralCell = true;
                        break;
                    default:
                        let treesCount = MaraUtils.GetCellTreesCount(cell.X, cell.Y);
                        
                        if (treesCount > 0) {
                            this.WoodCells.push(cell);
                        }
                        
                        break;
                }

                if (isMineralCell) {
                    MaraUtils.ForEachCell(
                        cell, 
                        1, 
                        (nextCell) => {
                            let point = new MaraPoint(nextCell.X, nextCell.Y);

                            if (!MaraResourceMap.ProcessedCells.has(point.ToString())) {
                                nextCells.push(point);
                            }
                        }
                    );
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