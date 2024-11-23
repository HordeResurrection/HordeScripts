import { MaraUtils } from "../../MaraUtils";
import { MaraRect } from "../MaraRect";
import { MaraSettlementUnitsCache } from "./MaraSettlementUnitsCache";

export class MaraCache {
    private static settlementCaches: Array<MaraSettlementUnitsCache> = [];

    public static AllSettlements: Array<any>;

    public static Init(): void {
        MaraCache.AllSettlements = MaraUtils.GetAllSettlements();
        
        for (let settlement of MaraCache.AllSettlements) {
            MaraCache.watchSettlement(settlement);
        }
    }

    public static GetSettlementsUnitsInArea(
        area: MaraRect,
        settlements: Array<any>,
        unitFilter? : (unit) => boolean
    ): Array<any> {
        let caches: Array<MaraSettlementUnitsCache> = [];

        for (let settlement of settlements) {
            let settlementCache = MaraCache.settlementCaches.find((v) => v.Settlement == settlement)!;
            caches.push(settlementCache);
        }

        let result: Array<any> = [];

        for (let cache of caches) {
            let units = cache.GetUnitsInArea(area.TopLeft, area.BottomRight);
            result.push(...units);
        }

        if (unitFilter) {
            result = result.filter((unit) => unitFilter(unit));
        }

        return result;
    }

    public static GetAllUnitsInArea(area: MaraRect, unitFilter? : (unit) => boolean): Array<any> {
        return MaraCache.GetSettlementsUnitsInArea(
            area,
            MaraCache.AllSettlements,
            unitFilter
        );
    }

    public static GetAllSettlementUnits(settlement: any): Array<any> {
        let settlementCache = MaraCache.settlementCaches.find((c) => c.Settlement == settlement);

        if (settlementCache) {
            return settlementCache.GetAllUnits();
        }
        else {
            return [];
        }
    }

    private static watchSettlement(settlement: any): void {
        let cache = new MaraSettlementUnitsCache(settlement);
        this.settlementCaches.push(cache);
    }
}