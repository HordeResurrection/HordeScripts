import { log } from "library/common/logging";
import { CreateConfig } from "../Utils";

export class IUnit {
    unit: any;
    teamNum: number;

    static CfgUid      : string = "";
    static BaseCfgUid  : string = "";

    constructor (unit: any, teamNum: number) {
        this.unit    = unit;
        this.teamNum = teamNum;
    }

    public static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);
    }

    public OnEveryTick(gameTickNum: number) {
    }

    public OnDead(gameTickNum: number) {
        
    }
}

var rnd = ActiveScena.GetRealScena().Context.Randomizer;
export function RandomUnit<T>(UnitsClass: Array<T>) : T {
    return UnitsClass[rnd.RandomNumber(0, UnitsClass.length - 1)];
}
