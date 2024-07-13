import { MaraCellDataHolder, MaraPoint } from "./Utils/Common";
import { MaraUtils, ResourceType } from "./Utils/MaraUtils";

export enum MaraResourceType {
    Wood,
    Metal,
    Gold,
    People
}

class WoodData extends MaraCellDataHolder {
    constructor () {
        super();
    }

    Get(cell: any): any {
        let index = this.makeIndex(cell);
        return (this.data[index] ?? 0);
    }

    Set(cell: any, value: any) {
        let index = this.makeIndex(cell);
        this.data[index] = value;
    }
}

class ClusterData extends MaraCellDataHolder {
    constructor () {
        super();
    }

    Get(cell: any): any {
        let index = this.makeIndex(cell);
        return this.data[index];
    }

    Set(cell: any, value: any) {
        let index = this.makeIndex(cell);
        this.data[index] = value;
    }
}

export class MaraResourceMap {
    public static ResourceClusters: Map<string, MaraResourceCluster>;
    public static ProcessedCells: Set<string> = new Set<string>();
    
    public static readonly CLUSTER_SIZE = 8;

    private static resourceMapMonitor: any;
    private static resourceData: Array<Array<any>> = [];
    private static clusterData: ClusterData = new WoodData();
    
    public static Init(): void {
        MaraResourceMap.resourceMapMonitor = MaraUtils.GetScena().ResourcesMap.CreateChangesObtainer("resource monitor");
        
        MaraResourceMap.initCellResources();
        MaraResourceMap.initClusters();
    }

    public static Tick(): void {
        let changes = MaraResourceMap.resourceMapMonitor.GetNewChanges();

        ForEach(changes, (item) => {
            let cluster = this.clusterData.Get(item.Cell);

            if (cluster) {
                cluster.UpdateWoodAmount();
            }
        });
    }

    static GetCellMineralType(x: number, y: number): any {
        let res = MaraResourceMap.resourceData[x][y];
        return res.ResourceType;
    }

    static GetCellMineralsAmount(x: number, y: number): number {
        let res = MaraResourceMap.resourceData[x][y];
        return res.ResourceAmount;
    }

    static GetCellTreesCount(x: number, y: number): number {
        let res = MaraResourceMap.resourceData[x][y];
        return res.TreesCount;
    }

    static BindCellToCluster(cell: MaraPoint, cluster: MaraResourceCluster) {
        MaraResourceMap.clusterData.Set(cell, cluster);
    }

    private static initCellResources(): void {
        let scenaWidth = MaraUtils.GetScenaWidth();
        let scenaHeigth = MaraUtils.GetScenaHeigth();
        
        for (let x = 0; x < scenaWidth; x++) {
            let columnData: Array<any> = [];
            MaraResourceMap.resourceData.push(columnData);
            
            for (let y = 0; y < scenaHeigth; y++) {
                let resourceData = MaraUtils.GetCellResourceData(x, y);
                columnData.push(resourceData);
            }
        }
    }

    private static initClusters(): void {
        let maxRowIndex = Math.floor(MaraUtils.GetScenaHeigth() / MaraResourceMap.CLUSTER_SIZE);
        let maxColIndex = Math.floor(MaraUtils.GetScenaWidth() / MaraResourceMap.CLUSTER_SIZE);

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

    UpdateWoodAmount() {
        let totalTreesCount = 0;
        
        for (let cell of this.WoodCells) {
            totalTreesCount += MaraResourceMap.GetCellTreesCount(cell.X, cell.Y);
        }

        this.woodAmount = totalTreesCount * 10;
    }
}