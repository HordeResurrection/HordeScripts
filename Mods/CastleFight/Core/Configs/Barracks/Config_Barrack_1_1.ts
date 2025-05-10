import { createHordeColor } from "library/common/primitives";
import { OpCfgUidToCfg } from "../IConfig";
import { IBarrack } from "./IBarrack";
import { IAttackingUnit } from "../IAttackingUnit";
import { Config_Barrack_1_1_1 } from "./Config_Barrack_1_1_1";
import { Config_Barrack_1_1_2 } from "./Config_Barrack_1_1_2";

export class Config_Unit_1_1 extends IAttackingUnit {
    public static CfgUid      : string = "#CastleFight_Unit_1_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Archer_2";

    constructor() { super(); }

    public static InitConfig() {
        IAttackingUnit.InitConfig.call(this);

        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 1500);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 0);
        // урон
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 400);
        // увеличиваем количество выпускаемых стрел
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament, "EmitBulletsCountMin", 4);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament, "EmitBulletsCountMax", 4);
    }
}


export class Config_Barrack_1_1 extends IBarrack {
    public static CfgUid      : string = "#CastleFight_Barrack_1_1";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Sawmill";

    public static spawnedUnit        : typeof IAttackingUnit = Config_Unit_1_1;
    public static improvesToBarracks : Array<typeof IBarrack> = [Config_Barrack_1_1_1, Config_Barrack_1_1_2];

    constructor() { super(); }

    public static InitConfig() {
        IBarrack.InitConfig.call(this);
        
        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Стрельбище огня");
        // меняем цвет
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "TintColor", createHordeColor(255, 200, 0, 0));
    }
}
