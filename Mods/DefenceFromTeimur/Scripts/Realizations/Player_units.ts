import { UnitProfession, UnitProducerProfessionParams } from "library/game-logic/unit-professions";
import { IUnit } from "../Types/IUnit";
import { CreateUnitConfig } from "../Utils";
import { AttackPlansClass } from "./AttackPlans";
import { GlobalVars } from "../GlobalData";
import { ACommandArgs, GeometryCanvas, GeometryVisualEffect, Stride_Color, Stride_Vector2, TileType, Unit, UnitCommand, UnitConfig, UnitFlags, UnitHurtType, UnitSpecification } from "library/game-logic/horde-types";
import { TeimurLegendaryUnitsClass, Teimur_Legendary_GREED_HORSE } from "./Teimur_units";
import { log } from "library/common/logging";
import { WaveUnit } from "../Types/IAttackPlan";
import { eNext, enumerate } from "library/dotnet/dotnet-utils";
import { ITeimurUnit } from "../Types/ITeimurUnit";
import { IReviveUnit } from "../Types/IReviveUnit";
import { IUnitCaster } from "../Spells/IUnitCaster";
import { createGameMessageWithNoSound } from "library/common/messages";
import { createHordeColor, createPoint } from "library/common/primitives";
import { spawnGeometry } from "library/game-logic/decoration-spawn";
import { Spell_fiery_dash } from "../Spells/Fire/Spell_fiery_dash";
import { Spell_fiery_trail } from "../Spells/Fire/Spell_fiery_trail";
import { Spell_Fireball } from "../Spells/Fire/Spell_Fireball";
import { ISpell } from "../Spells/ISpell";
import { Spell_fear_attack } from "../Spells/Magic/Spell_fear_attack";
import { Spell_PoisonBomb } from "../Spells/Magic/Spell_PoisonBomb";
import { Spell_Teleportation } from "../Spells/Magic/Spell_Teleportation";
import { Spell_Agr_attack } from "../Spells/Melle/Spell_Agr_attack";
import { Spell_Blocking } from "../Spells/Melle/Spell_Blocking";
import { Spell_Power_Attack } from "../Spells/Melle/Spell_Power_Attack";
import { Spell_Vampirism } from "../Spells/Melle/Spell_Vampirism";
import { Spell_FireArrowsRain } from "../Spells/Fire/Spell_FireArrowsRain";
import { Spell_fortress } from "../Spells/Utillity/Spell_fortress";
import { Spell_healing_aura } from "../Spells/Utillity/Spell_healing_aura";
import { Spell_Magic_shield } from "../Spells/Utillity/Spell_Magic_shield";
import { Spell_WorkerSaleList } from "../Spells/Worker/Spell_WorkerSaleList";

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
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Sight", 25);
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

            var choise_BaseCfgUids = ["#UnitConfig_Slavyane_Worker1", "#UnitConfig_Barbarian_Swordmen", "#UnitConfig_Slavyane_Heavymen"];
            var choise_CfgUid     = this.CfgUid + "_";
            for (var difficultIdx = 1; difficultIdx <= GlobalVars.difficult + 2; difficultIdx++) {
                var baseCfgUid : string;
                if (difficultIdx < GlobalVars.difficult) {
                    baseCfgUid = choise_BaseCfgUids[0];
                } else if (difficultIdx == GlobalVars.difficult) {
                    baseCfgUid = choise_BaseCfgUids[1];
                } else {
                    baseCfgUid = choise_BaseCfgUids[2];
                }

                var unitChoise_CfgUid = choise_CfgUid + difficultIdx;
                GlobalVars.configs[unitChoise_CfgUid] = CreateUnitConfig(baseCfgUid, unitChoise_CfgUid);

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
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "PreferredProductListPosition", createPoint(0, difficultIdx - 1));

                produceList.Add(GlobalVars.configs[unitChoise_CfgUid]);
            }
        }
    }
}

export class Player_CASTLE_CHOISE_GAMEMODE extends IUnit {
    static CfgUid      : string = "#DefenceTeimur_Castle_CHOISE_GAMEMODE";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_StoneCastle";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Выберите режим игры");
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

            var choise_BaseCfgUids = ["#UnitConfig_Slavyane_Worker1", "#UnitConfig_Slavyane_Spearman"];
            var choise_CfgUid     = this.CfgUid + "_";
            for (var gameMode = 1; gameMode <= 2; gameMode++) {
                var unitChoise_CfgUid = choise_CfgUid + gameMode;
                GlobalVars.configs[unitChoise_CfgUid] = CreateUnitConfig(choise_BaseCfgUids[gameMode - 1], unitChoise_CfgUid);

                // назначаем имя
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Name", "Выбрать режим игры " + gameMode);
                // Броня
                ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Shield", gameMode);
                // описание
                if (gameMode == 1) {
                    ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", "Режим игры за поселение");
                } else if (gameMode == 2) {
                    ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", "Режим игры за героев");
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

            for (var planIdx = 0; planIdx < AttackPlansClass.length; planIdx++) {
                produceList.Add(AttackPlansClass[planIdx].GetUnitConfig());
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

export class Player_worker_gamemode1 extends IReviveUnit {
    static CfgUid      : string = "#DefenceTeimur_Player_worker_gamemode1";
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
        RemoveTechRequirements(Player_worker_gamemode1.CfgUid);

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

export class Player_worker_gamemode2 extends IUnitCaster {
    static CfgUid      : string = "#DefenceTeimur_Player_worker_gamemode2";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_Worker1";

    public hero : IUnitCaster;

    constructor (unit: any, teamNum: number, targetHero: IUnitCaster) {
        super(unit, teamNum);

        this.AddSpell(Spell_WorkerSaleList, targetHero);
    }

    public static InitConfig() {
        super.InitConfig();
        
        // убираем профессию добычу
        if (GlobalVars.configs[this.CfgUid].ProfessionParams.ContainsKey(UnitProfession.Harvester)) {
            GlobalVars.configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Harvester);
        }

        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Specification", UnitSpecification.None);
    }

    // public OnOrder(commandArgs: ACommandArgs): boolean {
    //     if (commandArgs.CommandType == UnitCommand.Produce) {
    //         for (var spell of Player_worker_gamemode2.Spells) {
    //             // @ts-expect-error
    //             if (spell.GetUnitConfig().Uid != commandArgs.ProductCfg.Uid) {
    //                 continue;
    //             }

    //             // @ts-expect-error
    //             if (!this.unit.Owner.Resources.IsEnoughResources(commandArgs.ProductCfg.CostResources)) {
    //                 let msg = createGameMessageWithNoSound("Не хватает ресурсов!", createHordeColor(255, 255, 100, 100));
    //                 this.unit.Owner.Messages.AddMessage(msg);
    //                 return false;
    //             }

    //             if (!this.hero.AddSpell(spell)) {
    //                 return false;
    //             }

    //             // @ts-expect-error
    //             this.unit.Owner.Resources.TakeResources(commandArgs.ProductCfg.CostResources);

    //             return false;
    //         }

    //         // @ts-expect-error
    //         if ("#DefenceTeimur_Set_spawn_point" == commandArgs.ProductCfg.Uid) {
    //             // @ts-expect-error
    //             if (!this.unit.Owner.Resources.TakeResourcesIfEnough(commandArgs.ProductCfg.CostResources)) {
    //                 let msg = createGameMessageWithNoSound("Не хватает ресурсов!", createHordeColor(255, 255, 100, 100));
    //                 this.unit.Owner.Messages.AddMessage(msg);
    //             }

    //             for (var settlementNum = 0; settlementNum < GlobalVars.teams[this.teamNum].settlements.length; settlementNum++) {
    //                 if (GlobalVars.teams[this.teamNum].settlements[settlementNum].Uid == this.unit.Owner.Uid) {
    //                     GlobalVars.teams[this.teamNum].spawnCell[settlementNum] = this.unit.Cell;
    //                 }
    //             }

    //             return false;
    //         }
    //     }

    //     return true;
    // }
}

export class Hero_Crusader extends IUnitCaster {
    public static CfgUid      : string = "#DefenceTeimur_Teimur_Crusader";
    public static BaseCfgUid  : string = "#UnitConfig_Slavyane_Spearman";
    protected static _Spells : Array<typeof ISpell> = [];

    constructor(hordeUnit: Unit, teamNum: number) {
        super(hordeUnit, teamNum);
    }

    public ReplaceUnit(unit: Unit): void {
        super.ReplaceUnit(unit);
    }

    public static InitConfig() {
        super.InitConfig();

        var cfg = GlobalVars.configs[this.CfgUid];
        
        ScriptUtils.SetValue(cfg, "Name", "Герой {рыцарь}");
        ScriptUtils.SetValue(cfg, "MaxHealth", 60);
        ScriptUtils.SetValue(cfg, "Shield", 2);
        ScriptUtils.SetValue(cfg.MainArmament.ShotParams, "Damage", 5);
        ScriptUtils.SetValue(cfg, "Sight", 5);
        // скорость как у рыцаря
        cfg.Speeds.Item.set(TileType.Grass, 10);
        cfg.Speeds.Item.set(TileType.Forest, 6);
        cfg.Speeds.Item.set(TileType.Marsh, 7);
        cfg.Speeds.Item.set(TileType.Sand, 8);
        cfg.Speeds.Item.set(TileType.Road, 13);
        cfg.Speeds.Item.set(TileType.Ice, 10);

        // убираем дружественный огонь
        if (cfg.MainArmament) {
            var bulletCfg = HordeContentApi.GetBulletConfig(cfg.MainArmament.BulletConfig.Uid);
            ScriptUtils.SetValue(bulletCfg, "CanDamageAllied", false);
        }
        // убираем захватываемость
        if (cfg.ProfessionParams.ContainsKey(UnitProfession.Capturable)) {
            cfg.ProfessionParams.Remove(UnitProfession.Capturable);
        }
        // убираем команду захвата
        if (cfg.AllowedCommands.ContainsKey(UnitCommand.Capture)) {
            cfg.AllowedCommands.Remove(UnitCommand.Capture);
        }
        
        // убираем дружественный огонь у огня
        ScriptUtils.SetValue(HordeContentApi.GetBulletConfig("#BulletConfig_Fire"), "CanDamageAllied", false);
    }

    public OnEveryTick(gameTickNum: number): boolean {
        this._UpdateFrame();   

        return super.OnEveryTick(gameTickNum);
    }

    private _frameHideFlag : boolean = false;
    private _frame : GeometryVisualEffect | null;
    private _UpdateFrame() {
        if (this.unit.IsDead) {
            if (this._frame) {
                this._frame.Free();
                this._frame = null;
            }
            return;
        }

        if (!this._frame) {
            this._MakeFrame();
        } else {
            this._frame.Position = this.unit.Position;

            // в лесу рамка должна быть невидимой
            let landscapeMap = ActiveScena.GetRealScena().LandscapeMap;
            var tile = landscapeMap.Item.get(this.unit.Cell);
            if (this._frameHideFlag || tile.Cfg.Type == TileType.Forest) {
                this._frame.Visible = false;
            } else {
                this._frame.Visible = true;
            }
        }
    }

    private _MakeFrame() {
        // Объект для низкоуровневого формирования геометрии
        let geometryCanvas = new GeometryCanvas();
        
        const width  = 32;
        const height = 32;

        var points = host.newArr(Stride_Vector2, 5)  as Stride_Vector2[];;
        points[0] = new Stride_Vector2(Math.round(-0.6*width),  Math.round(-0.6*height));
        points[1] = new Stride_Vector2(Math.round( 0.6*width),  Math.round(-0.6*height));
        points[2] = new Stride_Vector2(Math.round( 0.6*width),  Math.round( 0.6*height));
        points[3] = new Stride_Vector2(Math.round(-0.6*width),  Math.round( 0.6*height));
        points[4] = new Stride_Vector2(Math.round(-0.6*width),  Math.round(-0.6*height));

        geometryCanvas.DrawPolyLine(points,
            new Stride_Color(
                this.unit.Owner.SettlementColor.R,
                this.unit.Owner.SettlementColor.G,
                this.unit.Owner.SettlementColor.B),
            2.0, false);

        let ticksToLive = GeometryVisualEffect.InfiniteTTL;
        this._frame = spawnGeometry(ActiveScena, geometryCanvas.GetBuffers(), this.unit.Position, ticksToLive);
    }
}

export const PlayerUnitsClass : Array<typeof IUnit> = [
    Player_GOALCASTLE,
    Player_Teimur_Dovehouse,
    Player_worker_gamemode1,
    Player_worker_gamemode2,
    Hero_Crusader
];
