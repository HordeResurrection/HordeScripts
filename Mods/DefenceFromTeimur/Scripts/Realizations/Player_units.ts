import { UnitProfession, UnitProducerProfessionParams } from "library/game-logic/unit-professions";
import { IUnit } from "../Types/IUnit";
import { CreateUnitConfig } from "../Utils";
import { AttackPlansClass } from "./AttackPlans";
import { GlobalVars } from "../GlobalData";
import { UnitCommand, UnitFlags, UnitHurtType, UnitSpecification } from "library/game-logic/horde-types";
import { TeimurLegendaryUnitsClass, Teimur_Legendary_GREED_HORSE } from "./Teimur_units";
import { log } from "library/common/logging";
import { WaveUnit } from "../Types/IAttackPlan";
import { eNext, enumerate } from "library/dotnet/dotnet-utils";
import { ITeimurUnit } from "../Types/ITeimurUnit";

export class Player_GOALCASTLE extends IUnit {
    static CfgUid      : string = "#DefenceTeimur_GoalCastle";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_StoneCastle";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        // ХП
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", 2000);
        // убираем починку
        GlobalVars.configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        // запрещаем самоуничтожение
        GlobalVars.configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // очищаем список построек
        var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
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

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Выберите сложность");
        // ХП
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", 2000);
        // Броня
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 1000);
        // убираем починку
        GlobalVars.configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        // запрещаем самоуничтожение
        GlobalVars.configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // добавляем постройку волн
        {
            var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();

            var choise_BaseCfgUid = "#UnitConfig_Barbarian_Swordmen";
            var choise_CfgUid     = this.CfgUid + "_";
            for (var difficultIdx = 1; difficultIdx <= GlobalVars.difficult + 2; difficultIdx++) {
                var unitChoise_CfgUid = choise_CfgUid + difficultIdx;
                GlobalVars.configs[unitChoise_CfgUid] = CreateUnitConfig(choise_BaseCfgUid, unitChoise_CfgUid);

                // назначаем имя
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Name", "Выбрать сложность " + difficultIdx);
                // Броня
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Shield", difficultIdx);
                // описание
                if (difficultIdx < GlobalVars.difficult) {
                    ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", "Эта сложность меньше рекомендуемой");
                } else if (difficultIdx == GlobalVars.difficult) {
                    ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", "Рекомендуемая сложность");
                } else {
                    ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", "Эта сложность больше рекомендуемой");
                }
                // убираем цену
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Gold",   0);
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Metal",  0);
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Lumber", 0);
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "People", 0);
                // убираем требования
                GlobalVars.configs[unitChoise_CfgUid].TechConfig.Requirements.Clear();

                produceList.Add(GlobalVars.configs[unitChoise_CfgUid]);
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

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Выберите волну");
        // ХП
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", 2000);
        // Броня
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 1000);
        // убираем починку
        GlobalVars.configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        // запрещаем самоуничтожение
        GlobalVars.configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // добавляем постройку волн
        {
            var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();

            var choise_BaseCfgUid = "#UnitConfig_Barbarian_Swordmen";
            var choise_CfgUid     = this.CfgUid + "_";
            for (var planIdx = 0; planIdx < AttackPlansClass.length; planIdx++) {
                var unitChoise_CfgUid = choise_CfgUid + planIdx;
                GlobalVars.configs[unitChoise_CfgUid] = CreateUnitConfig(choise_BaseCfgUid, unitChoise_CfgUid);

                // назначаем имя
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Name", "Выбрать волну " + planIdx);
                // Броня
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Shield", planIdx);
                // описание
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", AttackPlansClass[planIdx].Description + "\nИнком:" + AttackPlansClass[planIdx].IncomePlanClass.Description);
                // убираем цену
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Gold",   0);
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Metal",  0);
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Lumber", 0);
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "People", 0);
                // убираем требования
                GlobalVars.configs[unitChoise_CfgUid].TechConfig.Requirements.Clear();

                produceList.Add(GlobalVars.configs[unitChoise_CfgUid]);
            }
        }
    }
}

export class Player_Teimur_Dovehouse extends IUnit {
    static CfgUid      : string = "#DefenceTeimur_Teimur_Dovehouse";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_StoneDovehouse";
    static IsHandlesInit : boolean = false;
    static WaveUnits : Array<WaveUnit>;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Голубятня Теймура");
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "В этой голубятне находятся голуби с родины Теймуров. Пошлите весточку Теймурам, чтобы они отправили в бой одного из своих бойцов.");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold",   500);
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Metal",  500);
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Lumber", 300);
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "People", 7);
        // убираем требования
        GlobalVars.configs[this.CfgUid].TechConfig.Requirements.Clear();
        // убираем точку выхода
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].BuildingConfig, "EmergePoint", null);
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].BuildingConfig, "EmergePoint2", null);

        // добавляем постройку легендарных юнитов
        this.WaveUnits = new Array<WaveUnit>();
        {
            var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();

            for (var unitNum = 0; unitNum < TeimurLegendaryUnitsClass.length; unitNum++) {
                // некоторых юнитов спавнить нельзя
                if (TeimurLegendaryUnitsClass[unitNum].CfgUid == Teimur_Legendary_GREED_HORSE.CfgUid) {
                    continue;
                }

                var unitCfgUid = this.CfgUid + "_" + unitNum;
                GlobalVars.configs[unitCfgUid] = CreateUnitConfig(TeimurLegendaryUnitsClass[unitNum].CfgUid, unitCfgUid);

                // стоимость легендарного юнита в здании для отправки врагам
                ScriptUtils.SetValue(GlobalVars.configs[unitCfgUid].CostResources, "Gold",   500);
                ScriptUtils.SetValue(GlobalVars.configs[unitCfgUid].CostResources, "Metal",  500);
                ScriptUtils.SetValue(GlobalVars.configs[unitCfgUid].CostResources, "Lumber", 300);
                ScriptUtils.SetValue(GlobalVars.configs[unitCfgUid].CostResources, "People", 7);
                // убираем требования
                GlobalVars.configs[unitCfgUid].TechConfig.Requirements.Clear();
                // время постройки 10 секунд
                ScriptUtils.SetValue(GlobalVars.configs[unitCfgUid], "ProductionTime", 250);
                // устанавливаем ид waveUnit
                ScriptUtils.SetValue(GlobalVars.configs[unitCfgUid], "Shield", unitNum);
                // добавляем waveUnit
                this.WaveUnits.push(new WaveUnit(TeimurLegendaryUnitsClass[unitNum] as typeof ITeimurUnit, 1));
                
                produceList.Add(GlobalVars.configs[unitCfgUid]);
            }
        }

        // добавляем обработчик построенных юнитов данного здания

        if (!this.IsHandlesInit) {
            this.IsHandlesInit = true;
            
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                for (var settlement of GlobalVars.teams[teamNum].settlements) {
                    settlement.Units.UnitProduced.connect(function (sender, UnitProducedEventArgs) {
                        try {
                            // проверяем, что построил нужный юнит
                            if (UnitProducedEventArgs.ProducerUnit.Cfg.Uid != Player_Teimur_Dovehouse.CfgUid) {
                                return;
                            }
                            
                            // отправляем легендарных юнитов всем
                            for (var _teamNum = 0; _teamNum < GlobalVars.teams.length; _teamNum++) {
                                GlobalVars.teams[_teamNum].spawner.SpawnUnit(Player_Teimur_Dovehouse.WaveUnits[UnitProducedEventArgs.Unit.Cfg.Shield]);
                            }

                            // убиваем юнита
                            UnitProducedEventArgs.Unit.BattleMind.InstantDeath(null, UnitHurtType.Mele);
                        } catch (ex) {
                            log.exception(ex);
                        }
                    });
                }
            }
        }
    }
}

class Player_worker extends IUnit {
    static CfgUid      : string = "#UnitConfig_Slavyane_Worker1";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_Worker1";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        // добавляем постройку голубятни Теймура если на карте более 1-ой команды
        
        var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        if (GlobalVars.teams.length == 1 && produceList.Contains(GlobalVars.configs[Player_Teimur_Dovehouse.CfgUid])) {
            produceList.Remove(GlobalVars.configs[Player_Teimur_Dovehouse.CfgUid]);
        } else if (GlobalVars.teams.length > 1 && !produceList.Contains(GlobalVars.configs[Player_Teimur_Dovehouse.CfgUid])) {
            produceList.Add(GlobalVars.configs[Player_Teimur_Dovehouse.CfgUid]);
        }

        // убираем требования у всего, что можно построить

        let cfgCache = new Map<string, boolean>();

        const RemoveTechRequirements = (cfgUid: string) => {
            // делаем так, чтобы учитывался 1 раз
            if (cfgCache.has(cfgUid)) {
                return;
            }

            var cfg : any = HordeContentApi.GetUnitConfig(cfgUid);
            // удаляем требования
            cfg.TechConfig.Requirements.Clear();
            // переходим к следующему ид
            let producerParams = cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer, true);
            if (producerParams) {
                let produceList = enumerate(producerParams.CanProduceList);
                let produceListItem;

                cfgCache.set(cfgUid, producerParams.CanProduceList.Count > 0);
                while ((produceListItem = eNext(produceList)) !== undefined) {
                    RemoveTechRequirements(produceListItem.Uid);
                }
            } else {
                var val = false;
                if (cfg.MainArmament) {
                    val = true;
                } else if (cfg.Flags.HasFlag(UnitFlags.Compound)) {
                    val = true;
                } else if (cfg.Specification.HasFlag(UnitSpecification.Church)) {
                    val = true;
                }
                cfgCache.set(cfgUid, val);
            }
        }
        RemoveTechRequirements(Player_worker.CfgUid);

        // удаляем лишние конфиги

        log.info("[cfgCache] = ", cfgCache.size);
        cfgCache.forEach((value, cfgUid) => {
            if (value) {
                return;
            }

            var cfg : any = HordeContentApi.GetUnitConfig(cfgUid);
            if (produceList.Contains(cfg)) {
                produceList.Remove(cfg);
            }
        });
    }
}

export const PlayerUnitsClass : Array<typeof IUnit> = [
    Player_GOALCASTLE,
    Player_Teimur_Dovehouse,
    Player_worker
];
