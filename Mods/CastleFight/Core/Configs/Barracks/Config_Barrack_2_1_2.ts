import { createHordeColor } from "library/common/primitives";
import { OpCfgUidToCfg } from "../IConfig";
import { IBarrack } from "./IBarrack";
import { IBarrackUnit } from "./IBarrackUnit";

export class Config_Unit_2_1_2 extends IBarrackUnit {
    public static CfgUid      : string = "#CastleFight_Unit_2_1_2";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Beamman";

    constructor() { super(); }

    public static InitConfig() {
        IBarrackUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 2500);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 0);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 600);
    }
}

export class Config_Barrack_2_1_2 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_2_1_2";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_StoneBarrack";

    public static spawnedUnit        : typeof IBarrackUnit = Config_Unit_2_1_2;

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Академия дубины");
        // меняем цвет
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "TintColor", createHordeColor(255, 170, 107, 0));
    }
}
