import { ITeimurUnit } from "./ITeimurUnit";
import { GlobalVars } from "../GlobalData";
import { IncomePlan_0, IncomePlan_1 } from "../Realizations/IncomePlans";
import { IIncomePlan } from "./IIncomePlan";

export class WaveUnit {
    unitClass: typeof ITeimurUnit;
    count: number;

    constructor (unitClass: typeof ITeimurUnit, count: number) {
        this.unitClass = unitClass;
        this.count  = count;
    }
}

export class Wave {
    message: string;
    gameTickNum: number;
    waveUnits: Array<WaveUnit>;

    constructor (message: string, gameTickNum: number, units: Array<WaveUnit>) {
        this.message     = message;
        this.gameTickNum = gameTickNum;
        this.waveUnits       = units;
    }
}

export class IAttackPlan {
    static Description : string = "";
    static IncomePlanClass : typeof IIncomePlan = IncomePlan_0;

    public waves: Array<Wave>;
    public waveNum: number;

    public constructor () {
        this.waves   = new Array<Wave>();
        this.waveNum = 0;
    }

    public IsEnd() {
        return this.waveNum >= this.waves.length;
    }

    public GetUnitsCount() : any {
        var unitsTotalCount = {};
        for (var wave of GlobalVars.attackPlan.waves) {
            for (var waveUnit of wave.waveUnits) {
                if (unitsTotalCount[waveUnit.unitClass.CfgUid] == undefined) {
                    unitsTotalCount[waveUnit.unitClass.CfgUid] = 0;
                }
                unitsTotalCount[waveUnit.unitClass.CfgUid] += waveUnit.count;
            }
        }
        return unitsTotalCount;
    }
}
