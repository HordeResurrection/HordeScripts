import { createHordeColor } from "library/common/primitives";
import { OpCfgUidToCfg } from "../IConfig";
import { IBarrack } from "./IBarrack";
import { IBarrackUnit } from "./IBarrackUnit";

export class Config_Unit_2_2_1 extends IBarrackUnit {
    public static CfgUid      : string = "#CastleFight_Unit_2_2_1";
    public static BaseCfgUid  : string = "#UnitConfig_Mage_Bearmen";

    constructor() { super(); }

    public static InitConfig() {
        IBarrackUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 3000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 0);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 700);
    }
}

export class Config_Barrack_2_2_1 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_2_2_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Stables";

    public static spawnedUnit        : typeof IBarrackUnit = Config_Unit_2_2_1;

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Медвежья конюшня");
        // меняем цвет
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "TintColor", createHordeColor(255, 60, 105, 31));
    }
}
