import { UnitProfession, UnitProducerProfessionParams } from "library/game-logic/unit-professions";
import { IUnit } from "../Types/IUnit";
import { CreateConfig } from "../Utils";
import { AttackPlansClass } from "../Types/AttackPlan";
import { GlobalVars } from "../GlobalData";
import { UnitCommand } from "library/game-logic/horde-types";

export class Player_GOALCASTLE extends IUnit {
    static CfgUid      : string = "#DefenceTeimur_GoalCastle";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_StoneCastle";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);

        // ХП
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "MaxHealth", 2000);
        // убираем починку
        configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        // запрещаем самоуничтожение
        configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // очищаем список построек
        var producerParams = configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        produceList.Clear();
    }
}

export class Player_CASTLE_CHOISE_DIFFICULT extends IUnit {
    static CfgUid      : string = "#DefenceTeimur_Castle_CHOISE_DIFFICULT";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_StoneCastle";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);
        // описание
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Name", "Выберите сложность");
        // ХП
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "MaxHealth", 2000);
        // Броня
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Shield", 1000);
        // убираем починку
        configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        // запрещаем самоуничтожение
        configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // добавляем постройку волн
        {
            var producerParams = configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();

            var choise_BaseCfgUid = "#UnitConfig_Barbarian_Swordmen";
            var choise_CfgUid     = this.CfgUid + "_";
            for (var difficultIdx = 1; difficultIdx <= difficult + 2; difficultIdx++) {
                var unitChoise_CfgUid = choise_CfgUid + difficultIdx;
                configs[unitChoise_CfgUid] = CreateConfig(choise_BaseCfgUid, unitChoise_CfgUid);

                // назначаем имя
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid], "Name", "Выбрать сложность " + difficultIdx);
                // Броня
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid], "Shield", difficultIdx);
                // описание
                if (difficultIdx < difficult) {
                    GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid], "Description", "Эта сложность меньше рекомендуемой");
                } else if (difficultIdx == difficult) {
                    GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid], "Description", "Рекомендуемая сложность");
                } else {
                    GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid], "Description", "Эта сложность больше рекомендуемой");
                }
                // убираем цену
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid].CostResources, "Gold",   0);
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid].CostResources, "Metal",  0);
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid].CostResources, "Lumber", 0);
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid].CostResources, "People", 0);
                // убираем требования
                configs[unitChoise_CfgUid].TechConfig.Requirements.Clear();

                produceList.Add(configs[unitChoise_CfgUid]);
            }
        }
    }
}

export class Player_CASTLE_CHOISE_ATTACKPLAN extends IUnit {
    static CfgUid      : string = "#DefenceTeimur_Castle_CHOISE_ATTACKPLAN";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_StoneCastle";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);

        // описание
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Name", "Выберите волну");
        // ХП
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "MaxHealth", 2000);
        // Броня
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Shield", 1000);
        // убираем починку
        configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        // запрещаем самоуничтожение
        configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // добавляем постройку волн
        {
            var producerParams = configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();

            var choise_BaseCfgUid = "#UnitConfig_Barbarian_Swordmen";
            var choise_CfgUid     = this.CfgUid + "_";
            for (var planIdx = 0; planIdx < AttackPlansClass.length; planIdx++) {
                var unitChoise_CfgUid = choise_CfgUid + planIdx;
                configs[unitChoise_CfgUid] = CreateConfig(choise_BaseCfgUid, unitChoise_CfgUid);

                // назначаем имя
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid], "Name", "Выбрать волну " + planIdx);
                // Броня
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid], "Shield", planIdx);
                // описание
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid], "Description", AttackPlansClass[planIdx].Description);
                // убираем цену
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid].CostResources, "Gold",   0);
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid].CostResources, "Metal",  0);
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid].CostResources, "Lumber", 0);
                GlobalVars.ScriptUtils.SetValue(configs[unitChoise_CfgUid].CostResources, "People", 0);
                // убираем требования
                configs[unitChoise_CfgUid].TechConfig.Requirements.Clear();

                produceList.Add(configs[unitChoise_CfgUid]);
            }
        }
    }
}

export const PlayerUnitsClass : Array<typeof IUnit> = [
    Player_GOALCASTLE
];
