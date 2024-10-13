import { Entity, COMPONENT_TYPE, UnitComponent, BUFF_TYPE, BuffableComponent } from "../Components/ESC_components";
import { OpCfgUidToCfg, IConfig, OpCfgUidToEntity } from "./IConfig";

export class Config_Tower extends IConfig {
    public static CfgUid      : string = "#CastleFight_Tower";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Tower";

    constructor() { super(); }

    public static InitEntity() {
        IConfig.InitEntity.call(this);

        var entity : Entity = new Entity();
        entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
        OpCfgUidToEntity.set(this.CfgUid, entity);
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
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
            var buffMask = new Array<boolean>(BUFF_TYPE.SIZE);
            for (var i = 0; i < BUFF_TYPE.SIZE; i++) {
                buffMask[i] = true;
            }
            buffMask[BUFF_TYPE.CLONING] = false;
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent(buffMask));
            OpCfgUidToEntity.set(this.CfgUid, entity);
        }
    }
}