import { MaraUtils } from "../../MaraUtils";
import { MaraRect } from "../MaraRect";
import { MaraSettlementUnitsCache } from "./MaraSettlementUnitsCache";
import { MaraUnitCacheItem } from "./MaraUnitCacheItem";

export class MaraUnitCache {
    public static AllSettlements: Array<any>;

    private static settlementCaches: Array<MaraSettlementUnitsCache> = [];

    public static Init(): void {
        MaraUnitCache.AllSettlements = MaraUtils.GetAllSettlements();
        
        for (let settlement of MaraUnitCache.AllSettlements) {
            MaraUnitCache.watchSettlement(settlement);
        }
    }

    public static GetSettlementsUnitsInArea(
        area: MaraRect,
        settlements: Array<any>,
        unitFilter? : (unit) => boolean
    ): Array<MaraUnitCacheItem> {
        let caches: Array<MaraSettlementUnitsCache> = [];

        for (let settlement of settlements) {
            let settlementCache = MaraUnitCache.settlementCaches.find((v) => v.Settlement == settlement)!;
            caches.push(settlementCache);
        }

        let result: Array<MaraUnitCacheItem> = [];

        for (let cache of caches) {
            let units = cache.GetUnitsInArea(area.TopLeft, area.BottomRight);
            result.push(...units);
        }

        if (unitFilter) {
            result = result.filter((unit) => unitFilter(unit));
        }

        return result;
    }

    public static GetAllUnitsInArea(area: MaraRect, unitFilter? : (unit) => boolean): Array<MaraUnitCacheItem> {
        return MaraUnitCache.GetSettlementsUnitsInArea(
            area,
            MaraUnitCache.AllSettlements,
            unitFilter
        );
    }

    public static GetAllSettlementUnits(settlement: any): Array<MaraUnitCacheItem> {
        let settlementCache = MaraUnitCache.settlementCaches.find((c) => c.Settlement == settlement);

        if (settlementCache) {
            return settlementCache.GetAllUnits();
        }
        else {
            return [];
        }
    }

    public static GetUnitById(unitId: number): MaraUnitCacheItem | undefined {
        for (let settlementCache of this.settlementCaches) {
            let result = settlementCache.GetUnitById(unitId);

            if (result) {
                return result;
            }
        }

        return undefined;
    }

    private static watchSettlement(settlement: any): void {
        let cache = new MaraSettlementUnitsCache(settlement);
        this.settlementCaches.push(cache);
    }
}