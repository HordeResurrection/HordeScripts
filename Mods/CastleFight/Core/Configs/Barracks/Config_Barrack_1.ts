import { OpCfgUidToCfg } from "../IConfig";
import { Config_Barrack_1_1 } from "./Config_Barrack_1_1";
import { Config_Barrack_1_2 } from "./Config_Barrack_1_2";
import { IBarrack } from "./IBarrack";
import { IAttackingUnit } from "../IAttackingUnit";

export class Config_Unit_1 extends IAttackingUnit {
    public static CfgUid      : string = "#CastleFight_Unit_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Archer";

    constructor() { super(); }

    public static InitConfig() {
        IAttackingUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 800);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 0);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 400);
    }
}
export class Config_Barrack_1 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Sawmill";

    public static spawnedUnit        : typeof IAttackingUnit = Config_Unit_1;
    public static improvesToBarracks : Array<typeof IBarrack> = [Config_Barrack_1_1, Config_Barrack_1_2];

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Стрельбище");
        // стоимость
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Gold",   0);
    }
}

