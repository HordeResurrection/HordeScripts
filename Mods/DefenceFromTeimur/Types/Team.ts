import { Cell } from "./Geometry";
import { IUnit } from "./IUnit";
import { ISpawner } from "./ISpawner";

export class Team {
    teimurSettlementId: number;
    teimurSettlement: any;
    allSettlementsIdx: Array<number>;
    settlementsIdx: Array<number>;
    settlements:    Array<any>;
    castle:         IUnit;
    castleCell:     Cell;
    spawner:        ISpawner;
}
