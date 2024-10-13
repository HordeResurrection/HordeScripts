import { OpCfgUidToCfg } from "../IConfig";
import { Config_Barrack_2_1 } from "./Config_Barrack_2_1";
import { Config_Barrack_2_2 } from "./Config_Barrack_2_2";
import { Config_Barrack_2_3 } from "./Config_Barrack_2_3";
import { IBarrack } from "./IBarrack";
import { IBarrackUnit } from "./IBarrackUnit";

export class Config_Unit_2 extends IBarrackUnit {
    public static CfgUid      : string = "#CastleFight_Unit_2";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Swordmen";

    constructor() { super(); }

    public static InitConfig() {
        IBarrackUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 1000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 0);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 500);
    }
}


export class Config_Barrack_2 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_2";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Farm";

    public static spawnedUnit        : typeof IBarrackUnit = Config_Unit_2;
    public static improvesToBarracks : Array<typeof IBarrack> = [Config_Barrack_2_1, Config_Barrack_2_2, Config_Barrack_2_3];

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Казарма ополчения");
        // стоимость
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Gold",   0);
    }
}
