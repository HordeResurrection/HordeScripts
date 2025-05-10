import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { CfgAddUnitProducer } from "../../Utils";
import { IConfig, OpCfgUidToCfg } from "../IConfig";
import { Config_Holy_spirit_accuracy } from "./Config_Holy_spirit_accuracy";
import { Config_Holy_spirit_attack } from "./Config_Holy_spirit_attack";
import { Config_Holy_spirit_defense } from "./Config_Holy_spirit_defense";
import { Config_Holy_spirit_health } from "./Config_Holy_spirit_health";
import { Config_Holy_spirit_cloning } from "./Config_Holy_spirit_cloning";
import { COMPONENT_TYPE } from "../../Components/IComponent";
import { UnitComponent } from "../../Components/UnitComponent";

export class Config_Church extends IConfig {
    public static CfgUid      : string = "#CastleFight_Church";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Church";

    constructor() { super(); }

    public static InitEntity() {
        IConfig.InitEntity.call(this);

        this.Entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
    }

    public static InitConfig() {
        IConfig.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Церковь");
        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 60000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 0);
        // описание
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Description", "Святое место, позволяющее заполучить силу святых духов. Для вызова духа требуется хотя бы 1 свободная клетка вокруг церкви.");
        // стоимость
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Gold",   500);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Metal",  0);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Lumber", 500);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "People", 0);
        {
            // даем профессию найма юнитов
            CfgAddUnitProducer(OpCfgUidToCfg[this.CfgUid]);

            // очищаем список тренировки
            var producerParams = OpCfgUidToCfg[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();

            // добавляем святые духи
            produceList.Add(OpCfgUidToCfg[Config_Holy_spirit_accuracy.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Holy_spirit_attack.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Holy_spirit_cloning.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Holy_spirit_defense.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Holy_spirit_health.CfgUid]);
        }
    }
}