import { MaraResourceMap } from "./MaraResourceMap";
import { MaraUtils, ResourceType } from "../../MaraUtils";
import { MaraPoint } from "../MaraPoint";

export class MaraResourceCluster {
    public readonly Index: MaraPoint;
    public readonly Coordinates: MaraPoint;
    public readonly Size: number = MaraResourceMap.CLUSTER_SIZE;

    public WoodCells: Array<MaraPoint> = [];
    public MetalCells: Array<MaraPoint> = [];
    public GoldCells: Array<MaraPoint> = [];

    private woodAmount: number = 0;

    constructor(x: number, y: number) {
        this.Index = new MaraPoint(x, y);
        this.Coordinates = new MaraPoint(x * MaraResourceMap.CLUSTER_SIZE, y * MaraResourceMap.CLUSTER_SIZE);

        let maxRow = Math.min(this.Coordinates.Y + MaraResourceMap.CLUSTER_SIZE, MaraUtils.GetScenaHeigth());
        let maxCol = Math.min(this.Coordinates.X + MaraResourceMap.CLUSTER_SIZE, MaraUtils.GetScenaWidth());

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
                
                let resourceType = MaraResourceMap.GetCellMineralType(cell.X, cell.Y);
                let isMineralCell = false;
                let isResourceCell = false;

                switch (resourceType) {
                    case ResourceType.Metal:
                        this.MetalCells.push(cell);
                        isMineralCell = true;
                        isResourceCell = true;
                        break;
                    case ResourceType.Gold:
                        this.GoldCells.push(cell);
                        isMineralCell = true;
                        isResourceCell = true;
                        break;
                    default:
                        let treesCount = MaraResourceMap.GetCellTreesCount(cell.X, cell.Y);
                        
                        if (treesCount > 0) {
                            this.WoodCells.push(cell);
                            isResourceCell = true;
                        }
                        
                        break;
                }

                if (isResourceCell) {
                    MaraResourceMap.BindCellToCluster(cell, this);
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

        this.UpdateWoodAmount();
    }

    public get WoodAmount(): number {
        return this.woodAmount;
    }

    public get GoldAmount(): number {
        let amount = 0;
        
        for (let cell of this.GoldCells) {
            amount += MaraResourceMap.GetCellMineralsAmount(cell.X, cell.Y);
        }

        return amount;
    }

    public get MetalAmount(): number {
        let amount = 0;
        
        for (let cell of this.MetalCells) {
            amount += MaraResourceMap.GetCellMineralsAmount(cell.X, cell.Y);
        }

        return amount;
    }

    public get Center(): MaraPoint {
        return new MaraPoint(this.Coordinates.X + MaraResourceMap.CLUSTER_SIZE / 2, this.Coordinates.Y + MaraResourceMap.CLUSTER_SIZE / 2);
    }

    public ToString(): string {
        return this.Index.ToString();
    }

    public UpdateWoodAmount() {
        let totalTreesCount = 0;
        
        for (let cell of this.WoodCells) {
            totalTreesCount += MaraResourceMap.GetCellTreesCount(cell.X, cell.Y);
        }

        this.woodAmount = totalTreesCount * 10;
    }
}