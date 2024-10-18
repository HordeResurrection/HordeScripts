import { createHordeColor } from "library/common/primitives";
import { OpCfgUidToCfg } from "../IConfig";
import { IBarrack } from "./IBarrack";
import { IAttackingUnit } from "../IAttacingUnit";
import { Config_Barrack_1_1_1_1 } from "./Config_Barrack_1_1_1_1";
import { Config_Barrack_1_1_1_2 } from "./Config_Barrack_1_1_1_2";

export class Config_Unit_1_1_1 extends IAttackingUnit {
    public static CfgUid      : string = "#CastleFight_Unit_1_1_1";
    public static BaseCfgUid  : string = "#UnitConfig_Mage_Mag_2";

    constructor() { super(); }

    public static InitConfig() {
        IAttackingUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 3000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 100);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 1000);
    }
}

export class Config_Barrack_1_1_1 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_1_1_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Labor";
    
    public static spawnedUnit        : typeof IAttackingUnit = Config_Unit_1_1_1;
    public static improvesToBarracks : Array<typeof IBarrack> = [Config_Barrack_1_1_1_1, Config_Barrack_1_1_1_2];

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Лаборатория огня");
        // меняем цвет
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "TintColor", createHordeColor(255, 200, 0, 0));
    }
}
