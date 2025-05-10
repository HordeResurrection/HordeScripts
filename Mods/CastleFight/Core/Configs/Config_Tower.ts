import { BUFF_TYPE, BuffableComponent } from "../Components/BuffableComponent";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { UnitComponent } from "../Components/UnitComponent";
import { OpCfgUidToCfg, IConfig } from "./IConfig";

export class Config_Tower extends IConfig {
    public static CfgUid      : string = "#CastleFight_Tower";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Tower";

    constructor() { super(); }

    public static InitEntity() {
        IConfig.InitEntity.call(this);

        this.Entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
        var buffMask = new Array<boolean>(BUFF_TYPE.SIZE);
        for (var i = 0; i < BUFF_TYPE.SIZE; i++) {
            buffMask[i] = true;
        }
        buffMask[BUFF_TYPE.CLONING] = false;
        this.Entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent(buffMask));
    }

    public static InitConfig() {
        IConfig.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Башня");
        // описание
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Description", "Защитное строение. Не допускайте катапульты. Можно усилить духами (кроме духа клонирования).");
        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 60000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 300);
        // делаем урон = 0
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 600);
        // стоимость
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Gold",   200);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Metal",  0);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Lumber", 200);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "People", 0);
    }
}