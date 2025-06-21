import { Cell } from "./Geometry";
import { IUnit } from "./IUnit";
import { ISpawner } from "./ISpawner";
import { Point2D } from "library/common/primitives";
import { Settlement } from "library/game-logic/horde-types";

export class Team {
    teimurSettlementId: number;
    teimurSettlement: any;
    allSettlementsIdx: Array<number>;
    settlementsIdx: Array<number>;
    settlements:    Array<Settlement>;
    /** точки спавна героев игрока */
    spawnCell : Array<Point2D>;
    castle:         IUnit;
    castleCell:     Cell;
    spawner:        ISpawner;
}
