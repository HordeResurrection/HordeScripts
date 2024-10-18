import { createHordeColor } from "library/common/primitives";
import { OpCfgUidToCfg } from "../IConfig";
import { IBarrack } from "./IBarrack";
import { IAttackingUnit } from "../IAttacingUnit";
import { Config_Barrack_2_3_1 } from "./Config_Barrack_2_3_1";

export class Config_Unit_2_3 extends IAttackingUnit {
    public static CfgUid      : string = "#CastleFight_Unit_2_3";
    public static BaseCfgUid  : string = "#UnitConfig_Mage_Skeleton";

    constructor() { super(); }

    public static InitConfig() {
        IAttackingUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 1500);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 0);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 500);
    }
}

export class Config_Barrack_2_3 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_2_3";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Barrack";

    public static spawnedUnit        : typeof IAttackingUnit = Config_Unit_2_3;
    public static improvesToBarracks : Array<typeof IBarrack> = [Config_Barrack_2_3_1];

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Казарма нежити");
        // меняем цвет
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "TintColor", createHordeColor(255, 203, 3, 247));
    }
}
