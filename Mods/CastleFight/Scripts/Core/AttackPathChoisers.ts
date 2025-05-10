import { MetricType, distance_Chebyshev, distance_Minkovsky, distance_Euclid, Cell } from "./Utils";
import { World } from "./World";

export class IAttackPathChoiser {
    public choiseAttackPath(unit: any, world: World) : number {
        return 0;
    }
};
export class AttackPathChoiser_NearDistance extends IAttackPathChoiser {
    _metricType: MetricType;

    public constructor (metricType?: MetricType) {
        super();

        this._metricType = metricType ?? MetricType.Minkovsky;
    };

    public choiseAttackPath(unit: any, world: World) : number {
        var nearAttackPathNum      = -1;
        var nearAttackPathDistance = Number.MAX_VALUE;
        for (var attackPathNum = 0; attackPathNum < world.scena.settlements_attack_paths[unit.Owner.Uid].length; attackPathNum++) {
            var distance = 0.0;
            switch (this._metricType) {
                case MetricType.Chebyshev:
                    distance = distance_Chebyshev(unit.Cell.X, unit.Cell.Y, world.scena.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].X, world.scena.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].Y);
                    break;
                case MetricType.Minkovsky:
                    distance = distance_Minkovsky(unit.Cell.X, unit.Cell.Y, world.scena.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].X, world.scena.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].Y);
                    break;
                case MetricType.Euclid:
                    distance = distance_Euclid(unit.Cell.X, unit.Cell.Y, world.scena.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].X, world.scena.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].Y);
                    break;
            }
            if (distance < nearAttackPathDistance) {
                nearAttackPathDistance = distance;
                nearAttackPathNum      = attackPathNum;
            }
        }
        return nearAttackPathNum;
    }
};
export class AttackPathChoiser_Periodically extends IAttackPathChoiser {
    settlements_nextAttackPathNum: Array<number>;

    public constructor() {
        super();

        this.settlements_nextAttackPathNum = [];
    }

    public choiseAttackPath(unit: any, world: World) : number {
        if (this.settlements_nextAttackPathNum.length != world.scena.settlementsCount) {
            this.settlements_nextAttackPathNum = new Array<number>(world.scena.settlementsCount);
            for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
                this.settlements_nextAttackPathNum[settlementId] = 0;
            }
        }

        this.settlements_nextAttackPathNum[unit.Owner.Uid] = (this.settlements_nextAttackPathNum[unit.Owner.Uid] + 1) % world.scena.settlements_attack_paths[unit.Owner.Uid].length;
        return this.settlements_nextAttackPathNum[unit.Owner.Uid];
    }
};
export class AttackPathChoiser_Periodically_WithCondCell extends IAttackPathChoiser {
    settlements_nextAttackPathNum: Array<number>;
    settlements_attackPaths_condCell: Array<Array<Array<Cell>>>;
    settlements_attackPaths_condUnit: Array<Array<Array<any>>>;
    
    public constructor(settlements_attackPaths_condCell: Array<Array<Array<Cell>>>) {
        super();

        this.settlements_nextAttackPathNum    = [];
        this.settlements_attackPaths_condCell = settlements_attackPaths_condCell;
        this.settlements_attackPaths_condUnit = [];
    }

    public choiseAttackPath(unit: any, world: World) : number {
        // инициализируем

        if (this.settlements_nextAttackPathNum.length != world.scena.settlementsCount) {
            this.settlements_nextAttackPathNum = new Array<number>(world.scena.settlementsCount);
            for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
                this.settlements_nextAttackPathNum[settlementId] = 0;
            }

            var unitsMap        = world.realScena.UnitsMap

            this.settlements_attackPaths_condUnit = new Array<Array<Array<Cell>>>(this.settlements_attackPaths_condCell.length);
            for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
                this.settlements_attackPaths_condUnit[settlementId] = new Array<Array<Cell>>(this.settlements_attackPaths_condCell[settlementId].length);
                for (var attackPathNum = 0; attackPathNum < world.scena.settlements_attack_paths[settlementId].length; attackPathNum++) {
                    this.settlements_attackPaths_condUnit[settlementId][attackPathNum] = new Array<Array<Cell>>(this.settlements_attackPaths_condCell[settlementId][attackPathNum].length);
                    for (var condUnitNum = 0; condUnitNum < this.settlements_attackPaths_condUnit[settlementId][attackPathNum].length; condUnitNum++) {
                        var condUnit = unitsMap.GetUpperUnit(
                            this.settlements_attackPaths_condCell[settlementId][attackPathNum][condUnitNum].X,
                            this.settlements_attackPaths_condCell[settlementId][attackPathNum][condUnitNum].Y
                        );
                        this.settlements_attackPaths_condUnit[settlementId][attackPathNum][condUnitNum] = condUnit;
                    }
                }
            }
        }

        const unitSettlementId = unit.Owner.Uid;

        // удаляем ссылки если юниты убиты

        for (var attackPathNum = 0; attackPathNum < this.settlements_attackPaths_condUnit[unitSettlementId].length; attackPathNum++) {
            for (var condUnitNum = 0; condUnitNum < this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum].length; condUnitNum++) {
                if (this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum][condUnitNum] &&
                    this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum][condUnitNum].IsDead) {
                    this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum][condUnitNum] = null;
                }
            }
        }

        // выбираем след точку атаки

        for (var attackPathNum = 0; attackPathNum < this.settlements_attackPaths_condUnit[unitSettlementId].length; attackPathNum++) {
            this.settlements_nextAttackPathNum[unitSettlementId] = (this.settlements_nextAttackPathNum[unitSettlementId] + 1) % world.scena.settlements_attack_paths[unitSettlementId].length;
            // проверяем, что путь доступен
            var pathEmpty = true;
            for (var condUnitNum = 0; condUnitNum < this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum].length; condUnitNum++) {
                if (this.settlements_attackPaths_condUnit[unitSettlementId][this.settlements_nextAttackPathNum[unitSettlementId]][condUnitNum] != null) {
                    pathEmpty = false;
                    break;
                }
            }
            if (!pathEmpty) {
                break;
            }
        }

        return this.settlements_nextAttackPathNum[unitSettlementId];
    }
};