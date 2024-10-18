import { createHordeColor } from "library/common/primitives";
import { IConfig, OpCfgUidToCfg } from "../IConfig";
import { IBarrack } from "./IBarrack";
import { IAttackingUnit } from "../IAttacingUnit";

export class Config_Unit_1_1_1_1 extends IAttackingUnit {
    public static CfgUid      : string = "#CastleFight_Unit_1_1_1_1";
    public static BaseCfgUid  : string = "#UnitConfig_Mage_Mag_16";

    constructor() { super(); }

    public static InitConfig() {
        IAttackingUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 1000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 0);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 500);
        // параметры атаки
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Sight", 3);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "OrderDistance", 10);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament, "Range", 10);
    }
}

export class Config_Barrack_1_1_1_1 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_1_1_1_1";
    public static BaseCfgUid  : string = "#UnitConfig_Mage_MageHouse";

    public static spawnedUnit : typeof IAttackingUnit = Config_Unit_1_1_1_1;

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Приют мага огня");
        // меняем цвет
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "TintColor", createHordeColor(255, 200, 0, 0));
    }
}
