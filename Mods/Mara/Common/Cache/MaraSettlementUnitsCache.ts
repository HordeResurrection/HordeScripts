import { MaraPoint } from "../MaraPoint";
import RBush from "./rbush.js"

class MaraUnitCacheItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;

    Unit: any
    UnitId: number;

    constructor(unit: any) {
        this.minX = unit.Cell.X;
        this.minY = unit.Cell.Y;
        this.maxX = this.minX + unit.Rect.Width - 1;
        this.maxY = this.minY + unit.Rect.Height - 1;

        this.Unit = unit;
        this.UnitId = unit.Id;
    }

    static IsEqual(a: MaraUnitCacheItem, b: MaraUnitCacheItem): boolean {
        return a.UnitId == b.UnitId;
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

    public GetUnitsInArea(topLeft: MaraPoint, bottomRight: MaraPoint): Array<any> {
        let cacheItems = this.bush.search({
            minX: topLeft.X,
            minY: topLeft.Y,
            maxX: bottomRight.X,
            maxY: bottomRight.Y
        }) as Array<MaraUnitCacheItem>;

        return cacheItems.map((item) => item.Unit);
    }

    public GetAllUnits(): Array<any> {
        let cacheItems = this.bush.all();
        
        return cacheItems.map((item) => item.Unit);
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

            let cacheItem = this.cacheItemIndex.get(unitId)!;
            this.bush.remove(cacheItem, MaraUnitCacheItem.IsEqual);
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

        let newCacheItem = new MaraUnitCacheItem(unit);
        this.bush.insert(newCacheItem);
        this.cacheItemIndex.set(newCacheItem.UnitId, newCacheItem);
    }

    private unitPositionChangedProcessor(sender, args): void {
        let oldCacheItem = this.cacheItemIndex.get(args.TriggeredUnit.Id)!;
        this.bush.remove(oldCacheItem, MaraUnitCacheItem.IsEqual);
        this.cacheItemIndex.delete(oldCacheItem.UnitId);

        let newCacheItem = new MaraUnitCacheItem(args.TriggeredUnit);
        this.bush.insert(newCacheItem);
        this.cacheItemIndex.set(newCacheItem.UnitId, newCacheItem);
    }
}