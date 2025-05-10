import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { IConfig, OpCfgUidToCfg } from "../IConfig";
import { Config_Mercenary_Swordmen } from "./Config_Mercenary_Swordmen";
import { Config_Mercenary_Archer } from "./Config_Mercenary_Archer";
import { Config_Mercenary_Archer_2 } from "./Config_Mercenary_Archer_2";
import { Config_Mercenary_Heavymen } from "./Config_Mercenary_Heavymen";
import { Config_Mercenary_Raider } from "./Config_Mercenary_Raider";
import { COMPONENT_TYPE } from "../../Components/IComponent";
import { UnitComponent } from "../../Components/UnitComponent";

export class Config_MercenaryCamp extends IConfig {
    public static CfgUid      : string = "#CastleFight_MercenaryCamp";
    public static BaseCfgUid  : string = "#UnitConfig_Barbarian_Shater";

    constructor() { super(); }

    public static InitEntity() {
        IConfig.InitEntity.call(this);

        this.Entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
    }

    public static InitConfig() {
        IConfig.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Лагерь наёмников");
        // описание
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Description", "Позволяет нанять могучих войнов Теймура. Теймуровцы не верят в нашу веру, поэтому святые духи на них не действуют.");
        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 60000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 300);
        // стоимость
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Gold",   500);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Metal",  0);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Lumber", 0);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "People", 0);
        // наемники
        {
            var producerParams = OpCfgUidToCfg[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();
            produceList.Add(OpCfgUidToCfg[Config_Mercenary_Swordmen.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Mercenary_Archer.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Mercenary_Heavymen.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Mercenary_Archer_2.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Mercenary_Raider.CfgUid]);
        }
    }
}