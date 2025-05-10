import { UnitCommand } from "library/game-logic/horde-types";
import { OpCfgUidToCfg, IConfig } from "./IConfig";
import { UnitProfession } from "library/game-logic/unit-professions";

export class Config_Castle extends IConfig {
    /** коэффициент ХП */
    public static HealthCoeff : number = 1.0;

    public static CfgUid      : string = "#CastleFight_Castle";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_StoneCastle";

    constructor() { super(); }

    public static InitConfig() {
        IConfig.InitConfig.call(this);

        // запрещаем самоуничтожение
        OpCfgUidToCfg[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // убираем строительство
        OpCfgUidToCfg[this.CfgUid].ProfessionParams.Remove(UnitProfession.UnitProducer);
        // убираем починку
        OpCfgUidToCfg[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", Math.round(300000*this.HealthCoeff));
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 200);
        // увеличиваем видимость
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Sight", 12);
    }
}
