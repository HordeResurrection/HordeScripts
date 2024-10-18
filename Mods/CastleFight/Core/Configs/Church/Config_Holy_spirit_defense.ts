import { createHordeColor } from "library/common/primitives";
import { COMPONENT_TYPE, UnitComponent, BuffComponent, BUFF_TYPE } from "../../Components/ESC_components";
import { IConfig, OpCfgUidToCfg } from "../IConfig";

export class Config_Holy_spirit_defense extends IConfig {
    public static CfgUid      : string = "#CastleFight_Holy_spirit_defense";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Raider";

    constructor() { super(); }

    public static InitEntity() {
        IConfig.InitEntity.call(this);

        this.Entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
        this.Entity.components.set(COMPONENT_TYPE.BUFF_COMPONENT, new BuffComponent(BUFF_TYPE.DEFFENSE));
    }

    public static InitConfig() {
        IConfig.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Святой дух защиты");
        // описание
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Description", "Тот кого ударит данный дух, получит его силу.\n" +
            "Здоровье х2\n" +
            "Защита max(390, текущая защита)\n" +
            "Имунн к огню, магии"
        );
        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 1);
        // делаем урон = 0
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 0);
        // меняем цвет
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "TintColor", createHordeColor(150, 255, 215, 0));
        // время постройки
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "ProductionTime", 1500);
    }
}