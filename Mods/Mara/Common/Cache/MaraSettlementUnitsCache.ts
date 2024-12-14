import { MaraPoint } from "../MaraPoint";
import { MaraUnitBushItem } from "./MaraUnitBushItem";
import { MaraUnitCacheItem } from "./MaraUnitCacheItem";
import RBush from "../RBush/rbush.js"

export class MaraSettlementUnitsCache {
    Settlement: any;
    
    private bush: RBush;
    private cacheItemIndex: Map<number, MaraUnitCacheItem>;

    constructor(settlement: any) {
        this.Settlement = settlement;
        this.bush = new RBush();
        this.cacheItemIndex = new Map<number, MaraUnitCacheItem>();
        
        settlement.Units.UnitsListChanged.connect(
            (sender, UnitsListChangedEventArgs) => {
                this.unitListChangedProcessor(sender, UnitsListChangedEventArgs);
            }
        );

        settlement.Units.UnitUnitMovedToCell.connect(
            (sender, args) => {
                this.unitPositionChangedProcessor(sender, args);
            }
        );

        settlement.Units.UnitHealthChanged.connect(
            (sender, args) => {
                this.unitHealthChangedProcessor(sender, args);
            }
        );

        ForEach(settlement.Units, (unit) => {
                this.subscribeToUnit(unit);
            }
        );
    }

    public GetUnitsInArea(topLeft: MaraPoint, bottomRight: MaraPoint): Array<MaraUnitCacheItem> {
        let cacheItems = this.bush.search({
            minX: topLeft.X,
            minY: topLeft.Y,
            maxX: bottomRight.X,
            maxY: bottomRight.Y
        }) as Array<MaraUnitBushItem>;

        return cacheItems.map((item) => item.UnitCacheItem);
    }

    public GetAllUnits(): Array<MaraUnitCacheItem> {
        let cacheItems = Array.from(this.cacheItemIndex.values());
        
        return cacheItems;
    }

    public GetUnitById(unitId: number): MaraUnitCacheItem | undefined {
        return this.cacheItemIndex.get(unitId);
    }

    private unitListChangedProcessor(sender, UnitsListChangedEventArgs): void {
        let unit = UnitsListChangedEventArgs.Unit;
        let unitId = unit.Id;
        
        if (UnitsListChangedEventArgs.IsAdded) {
            this.subscribeToUnit(unit);
        }
        else {
            let cacheItem = this.cacheItemIndex.get(unitId)!;
            this.bush.remove(cacheItem.UnitBushItem, MaraUnitBushItem.IsEqual);
            this.cacheItemIndex.delete(unitId);
        }
    }

    private subscribeToUnit(unit: any): void {
        let cacheItem = new MaraUnitCacheItem(unit);
        let bushItem = new MaraUnitBushItem(cacheItem);
        cacheItem.UnitBushItem = bushItem;

        this.bush.insert(bushItem);
        this.cacheItemIndex.set(cacheItem.UnitId, cacheItem);
    }

    private unitPositionChangedProcessor(sender, args): void {
        let cacheItem = this.cacheItemIndex.get(args.TriggeredUnit.Id);

        if (!cacheItem) {
            return;
        }
    
        let oldBushItem = cacheItem.UnitBushItem;
        this.bush.remove(oldBushItem, MaraUnitBushItem.IsEqual);

        let newBushItem = new MaraUnitBushItem(cacheItem);
        this.bush.insert(newBushItem);
        cacheItem.UnitBushItem = newBushItem;
    }

    private unitHealthChangedProcessor(sender, args): void {
        let unit = args.TriggeredUnit;
        let cacheItem = this.cacheItemIndex.get(unit.Id);
        
        if (cacheItem) {
            cacheItem.UnitHealth = unit.Health;
        }
    }
}