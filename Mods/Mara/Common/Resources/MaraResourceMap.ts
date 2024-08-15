import { MaraCellDataHolder } from "../MaraCellDataHolder";
import { MaraPoint } from "../MaraPoint";
import { MaraResourceCluster } from "./MaraResourceCluster";
import { MaraUtils } from "../../MaraUtils";

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