import { OpCfgUidToCfg } from "../IConfig";
import { Config_Barrack_2_1_1 } from "./Config_Barrack_2_1_1";
import { Config_Barrack_2_1_2 } from "./Config_Barrack_2_1_2";
import { IBarrack } from "./IBarrack";
import { IAttackingUnit } from "../IAttackingUnit";

export class Config_Unit_2_1 extends IAttackingUnit {
    public static CfgUid      : string = "#CastleFight_Unit_2_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Heavymen";

    constructor() { super(); }

    public static InitConfig() {
        IAttackingUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 1500);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 200);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 500);
    }
}

export class Config_Barrack_2_1 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_2_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Barrack";

    public static spawnedUnit        : typeof IAttackingUnit = Config_Unit_2_1;
    public static improvesToBarracks : Array<typeof IBarrack> = [Config_Barrack_2_1_1, Config_Barrack_2_1_2];

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Казарма");
    }
}
