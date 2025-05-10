import { createHordeColor } from "library/common/primitives";
import { OpCfgUidToCfg } from "../IConfig";
import { IBarrack } from "./IBarrack";
import { IAttackingUnit } from "../IAttackingUnit";
import { Config_Barrack_1_2_1 } from "./Config_Barrack_1_2_1";

export class Config_Unit_1_2 extends IAttackingUnit {
    public static CfgUid      : string = "#CastleFight_Unit_1_2";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Crossbowman";

    constructor() { super(); }

    public static InitConfig() {
        IAttackingUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 1000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 100);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 800);
    }
}

export class Config_Barrack_1_2 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_1_2";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Sawmill";

    public static spawnedUnit        : typeof IAttackingUnit = Config_Unit_1_2;
    public static improvesToBarracks : Array<typeof IBarrack> = [Config_Barrack_1_2_1];

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Стрельбище металла");
        // меняем цвет
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "TintColor", createHordeColor(255, 170, 169, 173));
    }
}
