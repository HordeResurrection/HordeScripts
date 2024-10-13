import { OpCfgUidToCfg } from "../IConfig";
import { IBarrack } from "./IBarrack";
import { IBarrackUnit } from "./IBarrackUnit";

export class Config_Unit_2_1_1 extends IBarrackUnit {
    public static CfgUid      : string = "#CastleFight_Unit_2_1_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_FireforgedWarrior";

    constructor() { super(); }

    public static InitConfig() {
        IBarrackUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 3000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 300);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 350);
    }
}

export class Config_Barrack_2_1_1 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_2_1_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_StoneBarrack";

    public static spawnedUnit        : typeof IBarrackUnit = Config_Unit_2_1_1;

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Академия меча");
    }
}
