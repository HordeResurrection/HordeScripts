import { createHordeColor } from "library/common/primitives";
import { OpCfgUidToCfg } from "../IConfig";
import { IBarrack } from "./IBarrack";
import { IAttackingUnit } from "../IAttackingUnit";

export class Config_Unit_1_1_1_2 extends IAttackingUnit {
    public static CfgUid      : string = "#CastleFight_Unit_1_1_1_2";
    public static BaseCfgUid  : string = "#UnitConfig_Mage_Olga";

    constructor() { super(); }

    public static InitConfig() {
        IAttackingUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 2000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 200);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 1000);
        // параметры атаки
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Sight", 3);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "OrderDistance", 6);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament, "Range", 6);
    }
}

export class Config_Barrack_1_1_1_2 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_1_1_1_2";
    public static BaseCfgUid  : string = "#UnitConfig_Mage_MageHouse";
    
    public static spawnedUnit        : typeof IAttackingUnit = Config_Unit_1_1_1_2;

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Приют мага молний");
        // меняем цвет
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "TintColor", createHordeColor(255, 27, 42, 207));
    }
}