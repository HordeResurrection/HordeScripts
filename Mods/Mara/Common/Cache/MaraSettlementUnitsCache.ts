import { MaraPoint } from "../MaraPoint";
import RBush from "./rbush.js"

class MaraUnitCacheItem {
    UnitBushItem: MaraUnitBushItem;
    
    Unit: any
    UnitId: number;

    constructor(unit: any) {
        this.Unit = unit;
        this.UnitId = unit.Id;
    }
}

class MaraUnitBushItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;

    UnitCacheItem: MaraUnitCacheItem;
    
    constructor(unitCacheItem: MaraUnitCacheItem) {
        let cell = unitCacheItem.Unit.Cell;
        let rect = unitCacheItem.Unit.Rect;
        
        this.minX = cell.X;
        this.minY = cell.Y;
        this.maxX = this.minX + rect.Width - 1;
        this.maxY = this.minY + rect.Height - 1;
        
        this.UnitCacheItem = unitCacheItem;
    }

    static IsEqual(a: MaraUnitBushItem, b: MaraUnitBushItem): boolean {
        return a.UnitCacheItem.UnitId == b.UnitCacheItem.UnitId;
    }
}

export class MaraSettlementUnitsCache {
    Settlement: any;
    
    private bush: RBush;
    private unitPositionChangedHandlers: Map<number, any>;
    private cacheItemIndex: Map<number, MaraUnitCacheItem>;

    constructor(settlement: any) {
        this.Settlement = settlement;
        this.bush = new RBush();
        this.cacheItemIndex = new Map<number, MaraUnitCacheItem>();

        this.unitPositionChangedHandlers = new Map<number, any>();
        
        settlement.Units.UnitsListChanged.connect(
            (sender, UnitsListChangedEventArgs) => {
                this.unitListChangedProcessor(sender, UnitsListChangedEventArgs);
            }
        );

        ForEach(settlement.Units, (unit) => {
                this.subscribeToUnit(unit);
            }
        );
    }

    public GetUnitsInArea(topLeft: MaraPoint, bottomRight: MaraPoint): Array<any> { //!!
        let cacheItems = this.bush.search({
            minX: topLeft.X,
            minY: topLeft.Y,
            maxX: bottomRight.X,
            maxY: bottomRight.Y
        }) as Array<MaraUnitBushItem>;

        return cacheItems.map((item) => item.UnitCacheItem.Unit);
    }

    public GetAllUnits(): Array<any> {
        let cacheItems = this.bush.all();
        
        return cacheItems.map((item) => item.UnitCacheItem.Unit);
    }

    private unitListChangedProcessor(sender, UnitsListChangedEventArgs): void {
        let unit = UnitsListChangedEventArgs.Unit;
        let unitId = unit.Id;
        
        if (UnitsListChangedEventArgs.IsAdded) {
            this.subscribeToUnit(unit);
        }
        else {
            let handler = this.unitPositionChangedHandlers.get(unitId);
            handler.disconnect();
            this.unitPositionChangedHandlers.delete(unitId);

            let cacheItem = this.cacheItemIndex.get(unitId)!;
            this.bush.remove(cacheItem.UnitBushItem, MaraUnitBushItem.IsEqual);
            this.cacheItemIndex.delete(unitId);
        }
    }

    private subscribeToUnit(unit: any): void {
        let handler = unit.EventsMind.UnitMovedToCell.connect(
            (sender, args) => {
                this.unitPositionChangedProcessor(sender, args);
            }
        );

        this.unitPositionChangedHandlers.set(unit.Id, handler);

        let cacheItem = new MaraUnitCacheItem(unit);
        let bushItem = new MaraUnitBushItem(cacheItem);
        cacheItem.UnitBushItem = bushItem;

        this.bush.insert(bushItem);
        this.cacheItemIndex.set(cacheItem.UnitId, cacheItem);
    }

    private unitPositionChangedProcessor(sender, args): void {
        let cacheItem = this.cacheItemIndex.get(args.TriggeredUnit.Id)!;
        
        let oldBushItem = cacheItem.UnitBushItem;
        this.bush.remove(oldBushItem, MaraUnitBushItem.IsEqual);

        let newBushItem = new MaraUnitBushItem(cacheItem);
        this.bush.insert(newBushItem);
        cacheItem.UnitBushItem = newBushItem;
    }
}