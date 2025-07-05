import { ITeimurUnit, TeimurUnitsModificators } from "./ITeimurUnit";
import { GlobalVars } from "../GlobalData";
import { IncomePlan_0 } from "../Realizations/IncomePlans";
import { IIncomePlan } from "./IIncomePlan";
import { CreateUnitConfig } from "../Utils";
import { UnitConfig } from "library/game-logic/horde-types";

export class WaveUnit {
    unitClass: typeof ITeimurUnit;
    count: number;
    modificator: TeimurUnitsModificators.Type;

    constructor (unitClass: typeof ITeimurUnit, count: number, modificator?: TeimurUnitsModificators.Type) {
        this.unitClass   = unitClass;
        this.count       = count;
        this.modificator = modificator ?? TeimurUnitsModificators.Type.NULL;
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
    protected static _UnitBaseCfgUid : string;
    protected static _UnitCfgUid : string;
    protected static _UnitName : string = "";
    protected static _UnitDescription : string = "";

    static IncomePlanClass : typeof IIncomePlan = IncomePlan_0;

    public static GetUnitConfig () : UnitConfig {
        var cfg = CreateUnitConfig(this._UnitBaseCfgUid, this._UnitCfgUid);

        GlobalVars.configs[this._UnitCfgUid] = cfg;

        // назначаем имя
        ScriptUtils.SetValue(cfg, "Name", this._UnitName);
        // описание
        ScriptUtils.SetValue(cfg, "Description", this._UnitDescription + "\nИнком:" + this.IncomePlanClass.Description);
        // убираем цену
        ScriptUtils.SetValue(cfg.CostResources, "Gold",   0);
        ScriptUtils.SetValue(cfg.CostResources, "Metal",  0);
        ScriptUtils.SetValue(cfg.CostResources, "Lumber", 0);
        ScriptUtils.SetValue(cfg.CostResources, "People", 0);
        // убираем требования
        cfg.TechConfig.Requirements.Clear();

        return cfg;
    }

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

    public AutoGenerateWaveNames() : void {
        // сортируем в порядке тиков
        this.waves.sort((a, b) => a.gameTickNum > b.gameTickNum ? 1 : -1);

        // генерируем имена волнам
        for (var waveNum = 0; waveNum < this.waves.length; waveNum++) {
            var waveMsg = "";
            for (var waveUnit of this.waves[waveNum].waveUnits) {
                waveMsg += waveUnit.count + "x{" + GlobalVars.configs[waveUnit.unitClass.CfgUid].Name;
                if (waveUnit.modificator != TeimurUnitsModificators.Type.NULL) {
                    waveMsg += ", модификатор: " + TeimurUnitsModificators.Characteristics.NameSuf[waveUnit.modificator];
                }
                waveMsg += "} ";
                
            }
            this.waves[waveNum].message = waveMsg;
        }
        for (var waveNum = 0; waveNum < this.waves.length; waveNum++) {
            this.waves[waveNum].message = "Волна " + waveNum + ": " + this.waves[waveNum].message + "\n";
            if (waveNum + 1 < this.waves.length) {
                this.waves[waveNum].message += "Следующая: " + this.waves[waveNum + 1].message;
            }
        }
    }
}
