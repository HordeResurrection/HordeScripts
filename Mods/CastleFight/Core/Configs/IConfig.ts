import { UnitFlags } from "library/game-logic/horde-types";
import { CreateUnitConfig } from "../Utils";
import { getUnitProfessionParams, UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { Entity } from "../Entity";

/** все конфиги */
export var OpCfgUidToCfg    : any = {};
/** сущности для конфигов */
export var OpCfgUidToEntity : Map<string, Entity> = new Map<string, Entity>();

export class IConfig {
    public static CfgUid      : string = "";
    public static BaseCfgUid  : string = "";
    public static Entity      : Entity;
    
    constructor () {}

    public static InitEntity() {
        this.Entity = new Entity();
        OpCfgUidToEntity.set(this.CfgUid, this.Entity);
    }

    public static InitConfig() {
        // создаем конфиг
        OpCfgUidToCfg[this.CfgUid] = CreateUnitConfig(this.BaseCfgUid, this.CfgUid);

        // убираем требования
        OpCfgUidToCfg[this.CfgUid].TechConfig.Requirements.Clear();
        // описание
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Description", "");
        // убираем производство людей
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "ProducedPeople", 0);
        // убираем налоги
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "SalarySlots", 0);
        // делаем 0-ую стоимость
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Gold",   0);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Metal",  0);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Lumber", 0);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "People", 0);

        // убираем дружественный огонь
        if (OpCfgUidToCfg[this.CfgUid].MainArmament) {
            var bulletCfg = HordeContentApi.GetBulletConfig(OpCfgUidToCfg[this.CfgUid].MainArmament.BulletConfig.Uid);
            ScriptUtils.SetValue(bulletCfg, "CanDamageAllied", false);
        }
        // убираем захват
        if (OpCfgUidToCfg[this.CfgUid].ProfessionParams.ContainsKey(UnitProfession.Capturable)) {
            OpCfgUidToCfg[this.CfgUid].ProfessionParams.Remove(UnitProfession.Capturable);
        }
        // здания
        if (OpCfgUidToCfg[this.CfgUid].Flags.HasFlag(UnitFlags.Building)) {
            // настраиваем починку
            if (OpCfgUidToCfg[this.CfgUid].ProfessionParams.ContainsKey(UnitProfession.Reparable)) {
                ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].ProfessionParams.Item.get(UnitProfession.Reparable).RecoverCost, "Gold",   0);
                ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].ProfessionParams.Item.get(UnitProfession.Reparable).RecoverCost, "Metal",  0);
                ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].ProfessionParams.Item.get(UnitProfession.Reparable).RecoverCost, "Lumber", 0);
                ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].ProfessionParams.Item.get(UnitProfession.Reparable).RecoverCost, "People", 0);
                ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].ProfessionParams.Item.get(UnitProfession.Reparable), "RecoverTime", 4000);
            }
        }
        // очищаем список построек (чтобы нормально работал перезапуск)
        if (getUnitProfessionParams(OpCfgUidToCfg[this.CfgUid], UnitProfession.UnitProducer)) {
            // очищаем список
            var producerParams = OpCfgUidToCfg[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();
        }
    }
}
