import { MaraPoint } from "../MaraPoint";
import { MaraUnitBushItem } from "./MaraUnitBushItem";
import { MaraUnitCacheItem } from "./MaraUnitCacheItem";
import RBush from "../RBush/rbush.js"
import { MaraSettlementController } from "../../MaraSettlementController";
import { Mara } from "../../Mara";

export class MaraSettlementUnitsCache {
    Settlement: any;
    SettlementController: MaraSettlementController;
    
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
                this.unitPositionChangedProcessor(args);
            }
        );

        settlement.Units.UnitHealthChanged.connect(
            (sender, args) => {
                this.unitHealthChangedProcessor(args);
            }
        );

        settlement.Units.UnitLifeStateChanged.connect(
            (sender, args) => {
                this.unitLifeStateChangedProcessor(args);
            }
        );

        settlement.Units.UnitDummyStateChangedEvent.connect(
            (sender, args) => {
                this.unitDummyStateChangedProcessor(args);
            }
        );

        ForEach(settlement.Units, 
            (unit) => {
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

    public BindToSettlementController(settlementController: MaraSettlementController): void {
        this.SettlementController = settlementController;
        let allUnits = this.GetAllUnits();

        for (let unit of allUnits) {
            this.SettlementController.OnUnitListChanged(unit, true);
        }
    }

    private finalizeCacheItem(item: MaraUnitCacheItem): void {
        this.bush.remove(item.UnitBushItem, MaraUnitBushItem.IsEqual);
        item.Parent = null;
    }

    private unitListChangedProcessor(sender, UnitsListChangedEventArgs): void {
        let unit = UnitsListChangedEventArgs.Unit;
        let unitId = unit.Id;
        let isUnitAdded = UnitsListChangedEventArgs.IsAdded;
        let cacheItem: MaraUnitCacheItem;
        
        if (isUnitAdded) {
            cacheItem = this.subscribeToUnit(unit);
        }
        else {
            cacheItem = this.cacheItemIndex.get(unitId)!;
            this.finalizeCacheItem(cacheItem);
            this.cacheItemIndex.delete(unitId);
        }

        if (this.SettlementController) {
            this.SettlementController.OnUnitListChanged(cacheItem, isUnitAdded);
        }
    }

    private subscribeToUnit(unit: any): MaraUnitCacheItem {
        let cacheItem = new MaraUnitCacheItem(unit, this);
        let bushItem = new MaraUnitBushItem(cacheItem);
        cacheItem.UnitBushItem = bushItem;

        this.bush.insert(bushItem);
        this.cacheItemIndex.set(cacheItem.UnitId, cacheItem);

        return cacheItem;
    }

    private unitPositionChangedProcessor(args): void {
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

    private unitHealthChangedProcessor(args): void {
        let unit = args.TriggeredUnit;
        let cacheItem = this.cacheItemIndex.get(unit.Id);
        
        if (cacheItem) {
            cacheItem.UnitHealth = unit.Health;
        }
    }

    private unitLifeStateChangedProcessor(args): void {
        let unit = args.TriggeredUnit;
        let cacheItem = this.cacheItemIndex.get(unit.Id);
        
        if (cacheItem) {
            cacheItem.UnitIsAlive = unit.IsAlive;

            if (this.SettlementController) {
                this.SettlementController.OnUnitLifeStateChanged(cacheItem);
            }
        }
    }

    private unitDummyStateChangedProcessor(args): void {
        let unit = args.TriggeredUnit;
        let cacheItem = this.cacheItemIndex.get(unit.Id);
        
        if (cacheItem) {
            Mara.Debug(`unit ${cacheItem.Unit.ToString()} dummy state changed to ${cacheItem.Unit.IsDummy}`);
            cacheItem.UnitIsDummy = unit.IsDummy;
        }
    }
}