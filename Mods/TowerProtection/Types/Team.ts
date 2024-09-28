import { Cell } from "./Geometry";
import { IUnit } from "./IUnit";
import { ISpawner } from "./ISpawner";
import { Player_TOWER_BASE } from "../Realizations/Player_units";

export class Team {
    teimurSettlementIdx: number;
    teimurSettlement:   any;
    settlementIdx:      number;
    settlement:         any;
    tower:              IUnit;
    towerCell:          Cell;
    spawner:            ISpawner;
    inGame:             boolean;
    nickname:           string;
    color:              any;
    
    incomeGold:         number;
    incomeMetal:        number;
    incomeLumber:       number;
    incomePeople:       number;
}
