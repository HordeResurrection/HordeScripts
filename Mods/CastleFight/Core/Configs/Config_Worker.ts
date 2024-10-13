import { mergeFlags } from "library/dotnet/dotnet-utils";
import { UnitCommand, UnitFlags } from "library/game-logic/horde-types";
import { UnitProfession, UnitProducerProfessionParams } from "library/game-logic/unit-professions";
import { COMPONENT_TYPE, UnitComponent, ReviveComponent } from "../Components/ESC_components";
import { Cell } from "../Utils";
import { Config_Barrack_1 } from "./Barracks/Config_Barrack_1";
import { Config_Barrack_2 } from "./Barracks/Config_Barrack_2";
import { Config_Church } from "./Church/Config_Church";
import { IConfig, OpCfgUidToCfg } from "./IConfig";


export class Config_Worker extends IConfig {
    public static CfgUid      : string = "#CastleFight_Worker";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Worker1";

    constructor() { super(); }

    public static InitEntity() {
        IConfig.InitEntity.call(this);

        this.Entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
        this.Entity.components.set(COMPONENT_TYPE.REVIVE_COMPONENT, new ReviveComponent(new Cell(0,0), 500, -1));
    }

    public static InitConfig() {
        IConfig.InitConfig.call(this);

        // устанавливаем имя
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Работяга");
        // удаляем команду атаки
        OpCfgUidToCfg[this.CfgUid].AllowedCommands.Remove(UnitCommand.Attack);
        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 2000);
        // число людей
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "People", 0);
        // добавляем иммун к огню
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Flags", mergeFlags(UnitFlags, OpCfgUidToCfg[this.CfgUid].Flags, UnitFlags.FireResistant));
        // убираем профессию добычу
        if (OpCfgUidToCfg[this.CfgUid].ProfessionParams.ContainsKey(UnitProfession.Harvester)) {
            OpCfgUidToCfg[this.CfgUid].ProfessionParams.Remove(UnitProfession.Harvester);
        }
        // делаем его не даващимся
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "PressureResist", 13);
        
        // добавляем постройки
        {
            var producerParams = OpCfgUidToCfg[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();
            produceList.Add(OpCfgUidToCfg[Config_Barrack_1.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Barrack_2.CfgUid]);
            produceList.Add(OpCfgUidToCfg[Config_Church.CfgUid]);
        }
    }
}
