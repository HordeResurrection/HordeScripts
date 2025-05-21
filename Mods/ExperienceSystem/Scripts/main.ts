import { activePlugins } from "active-plugins";
import { log } from "library/common/logging";
import { broadcastMessage } from "library/common/messages";
import { createHordeColor, HordeColor } from "library/common/primitives";
import { eNext, enumerate } from "library/dotnet/dotnet-utils";
import { BattleController, TileType, Unit, UnitConfig, UnitFlags, UnitSpecification } from "library/game-logic/horde-types";
import { UnitProfession } from "library/game-logic/unit-professions";
import HordePluginBase from "plugins/base-plugin";

const ReplaceUnitParameters = HordeClassLibrary.World.Objects.Units.ReplaceUnitParameters;

const UnitUpdatePeriod : number = 32;

// переименовать в Систему Опыта
// Рабочим тоже опыт за добычу
// проверять, что юнит ничего не делает и держит позицию

/**
 * Вызывается до вызова "onFirstRun()" при первом запуске скрипт-машины, а так же при hot-reload
 */
export function onInitialization() {
    activePlugins.register(new ExperienceSystemPlugin());

    //activePlugins.register(new PrintSelectedSquadOrdersPlugin());
}

class UnitExperienceSystem {
    unit:                       Unit;
    tickMask:                   number;
    unitDTO:                    any;
    Cfg_MaxHealth:              number;
    selfMedication_DoNothingTick: number;
    selfMedication_prevTick:    number;
    selfMedication_prevHeal:    number;
    selfMedication_healPerTick: number;
    selfMedication_minHP:       number;
    passiveExpIncomePrevTick:   number;
    experience:                 number;
    level:                      number;

    configExpCoeff:             number;

    constructor (unit: Unit, baseUnit?: Unit) {
        this.unit                       = unit;
        this.unitDTO                    = ScriptUtils.GetValue(this.unit, "Model");
        this.tickMask                   = unit.PseudoTickCounter % UnitUpdatePeriod;
        this.Cfg_MaxHealth              = unit.Cfg.MaxHealth

        var gameTickNum                 = BattleController.GameTimer.GameFramesCounter;

        this.selfMedication_DoNothingTick = gameTickNum;
        this.selfMedication_prevTick    = gameTickNum;
        this.selfMedication_prevHeal    = 0;

        this.passiveExpIncomePrevTick   = gameTickNum;

        this.selfMedication_minHP       = Math.sqrt(this.Cfg_MaxHealth);
        this.selfMedication_healPerTick = 0.02 * 0.5 * this.selfMedication_minHP / Math.log(this.Cfg_MaxHealth);

        this.configExpCoeff             = LEVEL_SYSTEM_GLOBAL_DATA.GetConfigExpCoeff(unit.Cfg);

        // находим текущее количество опыта и уровень

        if (baseUnit) {
            var baseUnit_levelSystem : UnitExperienceSystem = baseUnit.ScriptData.ExperienceSystem;

            this.unit.KillsCounter = baseUnit.KillsCounter;
            this.level             = baseUnit_levelSystem.level;
            this.experience        = baseUnit_levelSystem.experience;
        } else {
            this.level             = -1;
            this.experience        = this.unitDTO.Experience;
        }

        // проверяем не прокачались ли мы

        if (this.experience >= ExperienceSystemGlobalData.MaxExp) {
            this.level++;
            this.experience = 0;
        }

        this.unitDTO.Experience = this.experience;

        // записываем юниту ссылка на систему опыта

        this.unit.ScriptData.ExperienceSystem = this;
    }

    public OnEveryTick(gameTickNum: number) {
        if (this.level < ExperienceSystemGlobalData.Levels_ExpCoeff.length - 1) {
            // пассивная прибавка опыта
        
            // Проверяем, что юнит не в здании и не оператор техники
            if (!this.unit.EffectsMind.InContainer) {

                if (this.level < 0 && gameTickNum > this.passiveExpIncomePrevTick + ExperienceSystemGlobalData.PassiveExpIncome_Period) {
                    //log.info("passive exp ", ExperienceSystemGlobalData.PassiveExpIncome_Value);
                    this.experience               += this.configExpCoeff
                        * ExperienceSystemGlobalData.Levels_ExpCoeff[this.level + 1]
                        * ExperienceSystemGlobalData.PassiveExpIncome_Value;
                    this.passiveExpIncomePrevTick += ExperienceSystemGlobalData.PassiveExpIncome_Period;
                }

                // обновляем синюю полосу

                this.unitDTO.Experience = Math.floor(this.experience);

                // проверка, что пора давать новый уровень

                if (this.experience >= ExperienceSystemGlobalData.MaxExp) {
                    // заменяем юнита

                    let replaceParams                   = new ReplaceUnitParameters();
                    replaceParams.OldUnit               = this.unit;
                    replaceParams.NewUnitConfig         = LEVEL_SYSTEM_GLOBAL_DATA.GetNextLevelCfg(this);
                    // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
                    replaceParams.Cell                  = null;
                    // Нужно ли передать уровень здоровья? (в процентном соотношении)
                    replaceParams.PreserveHealthLevel   = true;
                    // Нужно ли передать приказы?
                    replaceParams.PreserveOrders        = true;
                    // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
                    replaceParams.Silent                = true;
                    
                    var replacedUnit = this.unit.Owner.Units.ReplaceUnit(replaceParams);
                    if (replacedUnit) {
                        // оповещения всех
                        if (ExperienceSystemGlobalData.Levels_Alerts[this.level + 1]) {
                            broadcastMessage("БЛАГОВЕСТЬ! " + this.unit.Owner.TownName + " получил " + replacedUnit.Cfg.Name.replace("\n", ""), this.unit.Owner.SettlementColor);
                        }
                    }
                }
            }
        }

        // проверяем, что юнит ничего не делает
        if (!this.unit.OrdersMind.HasMotionDoNothingNow()) {
            this.selfMedication_DoNothingTick = gameTickNum;
        }

        // пассивное самолечение
        if (this.selfMedication_DoNothingTick + 250 < gameTickNum && this.selfMedication_minHP < this.unit.Health && this.unit.Health < this.Cfg_MaxHealth) {
            var heal                        = this.selfMedication_healPerTick * (gameTickNum - this.selfMedication_prevTick) + this.selfMedication_prevHeal;
            var heal_int                    = Math.floor(heal);
            
            this.unit.Health                = Math.min(this.unit.Health + heal_int, this.Cfg_MaxHealth);
            this.selfMedication_prevTick    = gameTickNum;
            this.selfMedication_prevHeal    = heal - heal_int;
        } else {
            this.selfMedication_prevTick    = gameTickNum;
            this.selfMedication_prevHeal    = 0;
        }
    }

    public OnCauseDamage(victimUnit: Unit, damage: number) {
        var trueDamage = damage - victimUnit.Cfg.Shield;
        if (trueDamage > 0 && this.level < ExperienceSystemGlobalData.Levels_ExpCoeff.length - 1) {
            this.experience += trueDamage
                * this.configExpCoeff
                * ExperienceSystemGlobalData.Levels_ExpCoeff[this.level + 1]
                * LEVEL_SYSTEM_GLOBAL_DATA.GetConfigExpPerHP(victimUnit.Cfg);
        }
    }

    public OnDead() {
        if (ExperienceSystemGlobalData.Levels_Alerts[this.level]) {
            broadcastMessage("СКОРБИМ! " + this.unit.Owner.TownName + " потерял " + this.unit.Cfg.Name.replace("\n", ""), this.unit.Owner.SettlementColor);
        }
    }
}

class ExperienceSystemGlobalData {
    static MaxExp:                              number         = 32;

    static Levels_ExpCoeff:                     Array<number>  = [1.0, 1.0, 0.75, 0.5];
    static Levels_NamePrefix:                   Array<string>  = ["{храбрый}", "{ратник}", "{дружинник}", "{витязь}"];
    static Levels_AdditionalDamageCoeff:        Array<number>  = [1.0, 1.2, 1.3, 1.4];
    static Levels_AdditionalAccuracy:           Array<number>  = [2, 4, 6, 7];
    static Levels_MoveSpeedCoeff:               Array<number>  = [1, 1.1, 1.2, 1.2];
    static Levels_WeaponReloadingSpeedCoeff:    Array<number>  = [1.0/1.14, 1.0/1.33, 1.0/1.6, 1.0/2.0];
    static Levels_HpCoeff:                      Array<number>  = [1.25, 1.57, 3.735, 12.15];
    static Levels_AdditionalShield:             Array<number>  = [0, 0, 0, 0];
    static Levels_AdditionalSight:              Array<number>  = [0, 1, 1, 2];
    static Levels_AdditionalWeight:             Array<number>  = [1, 2, 3, 4];
    static Levels_AdditionalPressureResist:     Array<number>  = [1, 2, 3, 4];
    static Levels_TintColor:                    Array<HordeColor> = [createHordeColor(255, 150, 255, 150), createHordeColor(255, 180, 180, 255), createHordeColor(255, 255, 150, 255), createHordeColor(150, 255, 170, 0)];
    static Levels_Alerts:                       Array<boolean> = [false, false, false, true];

    static PassiveExpIncome_Period:             number = 512;
    static PassiveExpIncome_Value:              number = 1;

    static ExpPerKill:                          number = 8;

    public settlementsWarTable:                 Array<Array<boolean>>;
    public unitsExperienceSystem:                    Array<UnitExperienceSystem>;
    constructor() {
        this.settlementsWarTable   = new Array<Array<boolean>>();
        this.unitsExperienceSystem = new Array<UnitExperienceSystem>();

        this._isCombadConfigsCash = new Map<string, boolean>();
        this._getConfigExpCoeff   = new Map<string, number>();
        this._getConfigExpPerHP   = new Map<string, number>();
        this._getNextLevelCfgCash = new Map<string, UnitConfig>();
    }

    private _isCombadConfigsCash: Map<string, boolean>;
    /// для конфига вернет флаг, что для конфига нужна система опыта
    public IsCombatConfig(unitConfig: UnitConfig): boolean {
        var isCombat              : boolean               = false;
        if (this._isCombadConfigsCash.has(unitConfig.Uid)) {
            isCombat = this._isCombadConfigsCash.get(unitConfig.Uid) as boolean;
        } else {
            let mainArmament = unitConfig.MainArmament;
            isCombat = mainArmament != null &&
                unitConfig.GetProfessionParams(UnitProfession.Harvester, true) == null &&
                !unitConfig.Flags.HasFlag(UnitFlags.Building) &&
                !unitConfig.Specification.HasFlag(UnitSpecification.Machine);
                this._isCombadConfigsCash.set(unitConfig.Uid, isCombat);
        }
        return isCombat;
    }

    private _getConfigExpCoeff: Map<string, number>;
    /// для конфига вернет коэффициент прокачки
    public GetConfigExpCoeff(unitConfig: UnitConfig): number {
        var res: number = 0;
        if (this._getConfigExpCoeff.has(unitConfig.Uid)) {
            res = this._getConfigExpCoeff.get(unitConfig.Uid) as number;
        } else {
            // считаем, что рыцарь обычный качается с оптимальной скоростью
            // GetConfigExpPerHP - можно сказать оценивает силу юнита
            // поэтому коэффициент прокачки можно вычислить = сила рыцаря (8) / сила юнита
            res = 8.0 / (this.GetConfigExpPerHP(unitConfig) * unitConfig.MaxHealth);

            log.info("Прокачивается неизвестный конфиг ", unitConfig.Uid, " вычисленный коэффиент опыта ", res);

            this._getConfigExpCoeff.set(unitConfig.Uid, res);
        }
        return res;
    }

    private _getConfigExpPerHP: Map<string, number>;
    /// для конфига вернет опыт за единицу хп
    public GetConfigExpPerHP(unitConfig: UnitConfig): number {
        var res: number = 0;
        if (this._getConfigExpPerHP.has(unitConfig.Uid)) {
            res = this._getConfigExpPerHP.get(unitConfig.Uid) as number;
        } else {
            // вычисляем всего опыта

            var hp           = unitConfig.MaxHealth;
            var shield       = unitConfig.Shield;
            var mainArmament = unitConfig.MainArmament;
            if (unitConfig.Flags.HasFlag(UnitFlags.Building)) {
                if (mainArmament) {
                    var damage = Math.max(mainArmament.ShotParams.Damage, 1);
                    res        = Math.sqrt(hp/damage)*(1 + 0.5*shield/damage)*5.67375886524;
                } else {
                    //res        = Math.log10(hp)*(1+0.5*shield)*5.67375886524;
                    res        = 4;
                }
            } else {
                var speed = unitConfig.Speeds.Item.get(TileType.Grass) as number;
                if (mainArmament) {
                    var damage = Math.max(mainArmament.ShotParams.Damage, 1);
                    res        = Math.sqrt(hp/damage)*(1 + 0.5*shield/damage)*Math.sqrt(speed * 0.1)*5.67375886524;
                } else {
                    res        = 4;
                }
            }

            // вычисляем опыт на 1 хп

            log.info("Нанесен урон по неизвестному конфигу ", unitConfig.Uid, " вычисленный опыт ", res);

            res = res / hp;
            this._getConfigExpPerHP.set(unitConfig.Uid, res);
        }
        return res;
    }

    private _getNextLevelCfgCash: Map<string, UnitConfig>;
    public GetNextLevelCfg(unitExperienceSystem: UnitExperienceSystem) : UnitConfig {
        var currCfg    = unitExperienceSystem.unit.Cfg;
        var currCfgUid = currCfg.Uid;
        var nextCfg    = this._getNextLevelCfgCash.get(currCfgUid);
        var nextLevel  = unitExperienceSystem.level + 1;
        
        // конфиг нету в кэше, тогда инициализируем его
        if (!nextCfg) {
            var nextConfigUid = currCfgUid + "_LS" + (unitExperienceSystem.level + 1);
            // создаем конфиг

            if (HordeContentApi.HasUnitConfig(nextConfigUid)) {
                nextCfg = HordeContentApi.GetUnitConfig(nextConfigUid);
            } else {
                nextCfg = HordeContentApi.CloneConfig(currCfg, nextConfigUid) as UnitConfig;
            }

            // настраиваем конфиг

            if (nextLevel == 0) {
                ScriptUtils.SetValue(nextCfg, "Name", currCfg.Name + "\n" + ExperienceSystemGlobalData.Levels_NamePrefix[nextLevel]);
                ScriptUtils.SetValue(nextCfg.MainArmament.ShotParams, "Damage", Math.round(currCfg.MainArmament.ShotParams.Damage * ExperienceSystemGlobalData.Levels_AdditionalDamageCoeff[nextLevel]));
                ScriptUtils.SetValue(nextCfg.MainArmament, "BaseAccuracy", currCfg.MainArmament.BaseAccuracy + ExperienceSystemGlobalData.Levels_AdditionalAccuracy[nextLevel]);
                var tylesType = [
                    TileType.Grass,
                    TileType.Forest,
                    TileType.Water,
                    TileType.Marsh,
                    TileType.Sand,
                    TileType.Mounts,
                    TileType.Road,
                    TileType.Ice
                ];
                for (var tileNum = 0; tileNum < tylesType.length; tileNum++) {
                    nextCfg.Speeds.Item.set(tylesType[tileNum],
                        Math.round((currCfg.Speeds.Item.get(tylesType[tileNum]) as number)
                            * ExperienceSystemGlobalData.Levels_MoveSpeedCoeff[nextLevel]));
                }
                ScriptUtils.SetValue(nextCfg.MainArmament, "ReloadTime", Math.max(1, Math.round(currCfg.MainArmament.ReloadTime * ExperienceSystemGlobalData.Levels_WeaponReloadingSpeedCoeff[nextLevel])));
                ScriptUtils.SetValue(nextCfg, "ReloadTime", Math.max(1, Math.round(currCfg.ReloadTime * ExperienceSystemGlobalData.Levels_WeaponReloadingSpeedCoeff[nextLevel])));
                ScriptUtils.SetValue(nextCfg, "MaxHealth", Math.round(currCfg.MaxHealth * Math.pow(ExperienceSystemGlobalData.Levels_HpCoeff[nextLevel], 2.0 * currCfg.MainArmament.ShotParams.Damage / currCfg.MaxHealth)));
                ScriptUtils.SetValue(nextCfg, "Shield", currCfg.Shield + ExperienceSystemGlobalData.Levels_AdditionalShield[nextLevel]);
                ScriptUtils.SetValue(nextCfg, "Sight", currCfg.Sight + ExperienceSystemGlobalData.Levels_AdditionalSight[nextLevel]);
                ScriptUtils.SetValue(nextCfg, "Weight", currCfg.Weight + ExperienceSystemGlobalData.Levels_AdditionalWeight[nextLevel]);
                ScriptUtils.SetValue(nextCfg, "PressureResist", currCfg.PressureResist + ExperienceSystemGlobalData.Levels_AdditionalPressureResist[nextLevel]);
                ScriptUtils.SetValue(nextCfg, "TintColor", ExperienceSystemGlobalData.Levels_TintColor[nextLevel]);
                // иконка в лесу
                if (currCfg.InForestAnimationsCatalog) {
                    var inForestAnimRef        = ScriptUtils.GetValue(currCfg, "InForestAnimationsCatalogRef");
                    var inForestAnimNextCfgUid = inForestAnimRef.Uid + "_" + (nextLevel + 1);
                    log.info("inForestAnimNextCfgUid = ", inForestAnimNextCfgUid);
                    if (HordeContentApi.HasAnimation(inForestAnimNextCfgUid)) {
                        ScriptUtils.GetValue(nextCfg, "InForestAnimationsCatalogRef").SetConfig(HordeContentApi.GetAnimationCatalog(inForestAnimNextCfgUid));
                    }
                }
            } else {
                ScriptUtils.SetValue(nextCfg, "Name",
                    String(currCfg.Name).replace(ExperienceSystemGlobalData.Levels_NamePrefix[unitExperienceSystem.level], ExperienceSystemGlobalData.Levels_NamePrefix[nextLevel]));
                ScriptUtils.SetValue(nextCfg.MainArmament.ShotParams, "Damage",
                    Math.round(currCfg.MainArmament.ShotParams.Damage / ExperienceSystemGlobalData.Levels_AdditionalDamageCoeff[unitExperienceSystem.level] * ExperienceSystemGlobalData.Levels_AdditionalDamageCoeff[nextLevel]));
                ScriptUtils.SetValue(nextCfg.MainArmament, "BaseAccuracy",
                    currCfg.MainArmament.BaseAccuracy - ExperienceSystemGlobalData.Levels_AdditionalAccuracy[unitExperienceSystem.level] + ExperienceSystemGlobalData.Levels_AdditionalAccuracy[nextLevel]);
                var tylesType = [
                    TileType.Grass,
                    TileType.Forest,
                    TileType.Water,
                    TileType.Marsh,
                    TileType.Sand,
                    TileType.Mounts,
                    TileType.Road,
                    TileType.Ice
                ];
                const invMoveSpeedCoeff = 1.0 / ExperienceSystemGlobalData.Levels_MoveSpeedCoeff[unitExperienceSystem.level];
                for (var tileNum = 0; tileNum < tylesType.length; tileNum++) {
                    nextCfg.Speeds.Item.set(tylesType[tileNum],
                        Math.round((currCfg.Speeds.Item.get(tylesType[tileNum]) as number)
                            * invMoveSpeedCoeff * ExperienceSystemGlobalData.Levels_MoveSpeedCoeff[nextLevel]));
                }
                ScriptUtils.SetValue(nextCfg.MainArmament, "ReloadTime",
                    Math.max(1, Math.round(currCfg.MainArmament.ReloadTime / ExperienceSystemGlobalData.Levels_WeaponReloadingSpeedCoeff[unitExperienceSystem.level] * ExperienceSystemGlobalData.Levels_WeaponReloadingSpeedCoeff[nextLevel])));
                ScriptUtils.SetValue(nextCfg, "ReloadTime",
                    Math.max(1, Math.round(currCfg.ReloadTime / ExperienceSystemGlobalData.Levels_WeaponReloadingSpeedCoeff[unitExperienceSystem.level] * ExperienceSystemGlobalData.Levels_WeaponReloadingSpeedCoeff[nextLevel])));
                ScriptUtils.SetValue(nextCfg, "MaxHealth",
                    Math.round(currCfg.MaxHealth / Math.pow(ExperienceSystemGlobalData.Levels_HpCoeff[unitExperienceSystem.level], 2.0 * currCfg.MainArmament.ShotParams.Damage / currCfg.MaxHealth)
                               * Math.pow(ExperienceSystemGlobalData.Levels_HpCoeff[nextLevel], 2.0 * currCfg.MainArmament.ShotParams.Damage / currCfg.MaxHealth)));
                ScriptUtils.SetValue(nextCfg, "Shield",
                    currCfg.Shield - ExperienceSystemGlobalData.Levels_AdditionalShield[unitExperienceSystem.level] + ExperienceSystemGlobalData.Levels_AdditionalShield[nextLevel]);
                ScriptUtils.SetValue(nextCfg, "Sight",
                    currCfg.Sight - ExperienceSystemGlobalData.Levels_AdditionalSight[unitExperienceSystem.level] + ExperienceSystemGlobalData.Levels_AdditionalSight[nextLevel]);
                ScriptUtils.SetValue(nextCfg, "Weight",
                    currCfg.Weight - ExperienceSystemGlobalData.Levels_AdditionalWeight[unitExperienceSystem.level] + ExperienceSystemGlobalData.Levels_AdditionalWeight[nextLevel]);
                ScriptUtils.SetValue(nextCfg, "PressureResist",
                    currCfg.PressureResist - ExperienceSystemGlobalData.Levels_AdditionalPressureResist[unitExperienceSystem.level] + ExperienceSystemGlobalData.Levels_AdditionalPressureResist[nextLevel]);
                ScriptUtils.SetValue(nextCfg, "TintColor",
                    ExperienceSystemGlobalData.Levels_TintColor[nextLevel]);
                // иконка в лесу
                var inForestAnimRef        = ScriptUtils.GetValue(currCfg, "InForestAnimationsCatalogRef");
                var inForestAnimNextCfgUid = (inForestAnimRef.Uid as string).slice(0, inForestAnimRef.Uid.length - 1) + (nextLevel + 1);
                log.info("inForestAnimNextCfgUid = ", inForestAnimNextCfgUid);
                if (HordeContentApi.HasAnimation(inForestAnimNextCfgUid)) {
                    ScriptUtils.GetValue(nextCfg, "InForestAnimationsCatalogRef").SetConfig(HordeContentApi.GetAnimationCatalog(inForestAnimNextCfgUid));
                }
            }

            this._getNextLevelCfgCash.set(currCfgUid, nextCfg);
        }

        return nextCfg;
    }
}
var LEVEL_SYSTEM_GLOBAL_DATA : ExperienceSystemGlobalData;

class ExperienceSystemPlugin extends HordePluginBase {
    public constructor() {
        super("Система уровней");
    }

    public onFirstRun() {
        if (ScriptUtils.GameVersionEqualsOrGreater('v0.71pre')) {
            ActiveScena.Context.Parameters.Units.MaxExperience = ExperienceSystemGlobalData.MaxExp;
        }
    }

    public onEveryTick(gameTickNum: number) {
        if (!LEVEL_SYSTEM_GLOBAL_DATA) {
            if (!this.globalStorage.levelSystemGlobalData) {
                this.globalStorage.levelSystemGlobalData = new ExperienceSystemGlobalData();

                var levelSystemGlobalData = this.globalStorage.levelSystemGlobalData as ExperienceSystemGlobalData;
                LEVEL_SYSTEM_GLOBAL_DATA  = this.globalStorage.levelSystemGlobalData as ExperienceSystemGlobalData;
    
                let scenaSettlements = ActiveScena.GetRealScena().Settlements;

                levelSystemGlobalData.settlementsWarTable = new Array<Array<boolean>>(scenaSettlements.Count);
                for (var settlementNum = 0; settlementNum < scenaSettlements.Count; settlementNum++) {
                    levelSystemGlobalData.settlementsWarTable[settlementNum] = new Array<boolean>(scenaSettlements.Count);
                    for (var other_settlementNum = 0; other_settlementNum < scenaSettlements.Count; other_settlementNum++) {
                        levelSystemGlobalData.settlementsWarTable[settlementNum][other_settlementNum]
                            = scenaSettlements.Item.get(settlementNum + '').Diplomacy.IsWarStatus(scenaSettlements.Item.get(other_settlementNum + ''));
                    }
                }
                
                for (var settlementNum = 0; settlementNum < scenaSettlements.Count; settlementNum++) {
                    // события:
                    // UnitsInitialized, UnitsFullyInitialized, UnitsListChanged, UnitProduced, UnitSpawned
                    // UnitReplaced, UnitBuildingComplete, 
                    var settlementUnits = scenaSettlements.Item.get(settlementNum + '').Units;
    
                    // добавляем обработчики
                    // Каждое действие может вызывать каскад событий, от самого логичного до UnitsListChanged
                    // Например постройка здания вызовет UnitProduced, UnitSpawned, UnitsListChanged

                    settlementUnits.UnitsListChanged.connect(
                        function (sender, UnitsListChangedEventArgs) {
                            // Unit
                            // IsAdded = true/false
                            // log.info("------------------------------------------------");
                            // log.info("[UnitsListChanged]");
                            // printObjectItems(UnitsListChangedEventArgs, 1);

                            // если юнит добавляется, боевой и без инициализированной системы опыта
                            if (UnitsListChangedEventArgs.IsAdded &&
                                levelSystemGlobalData.IsCombatConfig(UnitsListChangedEventArgs.Unit.Cfg) &&
                                !UnitsListChangedEventArgs.Unit.ScriptData.ExperienceSystem) {
                                levelSystemGlobalData.unitsExperienceSystem.push(new UnitExperienceSystem(UnitsListChangedEventArgs.Unit));
                            }
                            // если юнит удаляется, боевой и с инициализированной системой опыта
                            else if (!UnitsListChangedEventArgs.IsAdded &&
                                levelSystemGlobalData.IsCombatConfig(UnitsListChangedEventArgs.Unit.Cfg) &&
                                UnitsListChangedEventArgs.Unit.ScriptData.ExperienceSystem) {
                                    UnitsListChangedEventArgs.Unit.ScriptData.ExperienceSystem.OnDead();
                            }
                    });

                    // settlementUnits.UnitProduced.connect(
                    //     function (sender, UnitProducedEventArgs) {
                    //         // Unit
                    //         // ProducerUnit
                    //         log.info("------------------------------------------------");
                    //         log.info("[UnitProduced]");
                    //         printObjectItems(UnitProducedEventArgs, 1);
                    // });

                    // settlementUnits.UnitSpawned.connect(
                    //     function (sender, UnitSpawnedEventArgs) {
                    //         // Unit
                    //         log.info("------------------------------------------------");
                    //         log.info("[UnitSpawned]");
                    //         printObjectItems(UnitSpawnedEventArgs, 1);
                    // });

                    settlementUnits.UnitReplaced.connect(
                        function (sender, UnitReplacedEventArgs) {
                            // OldUnit
                            // NewUnit
                            // log.info("------------------------------------------------");
                            // log.info("[UnitReplaced]");
                            // printObjectItems(UnitReplacedEventArgs, 1);

                            // переносим уровень и килы в нового юнита
                            if (UnitReplacedEventArgs.OldUnit.ScriptData.ExperienceSystem &&
                                levelSystemGlobalData.IsCombatConfig(UnitReplacedEventArgs.NewUnit.Cfg)) {
                                levelSystemGlobalData.unitsExperienceSystem.push(new UnitExperienceSystem(UnitReplacedEventArgs.NewUnit, UnitReplacedEventArgs.OldUnit));
                            }
                    });

                    settlementUnits.UnitCauseDamage.connect(
                        function (sender, args) {
                            // TriggeredUnit - атакующий юнит
                            // VictimUnit - атакованный юнит
                            // Damage - урон до вычита брони
                            // HurtType - тип атаки, Mele
                            if (args.TriggeredUnit.ScriptData.ExperienceSystem && levelSystemGlobalData.settlementsWarTable[args.TriggeredUnit.Owner.Uid][args.VictimUnit.Owner.Uid]) {
                                args.TriggeredUnit.ScriptData.ExperienceSystem.OnCauseDamage(args.VictimUnit, args.Damage);
                            }
                        }
                    );

                    // иницилизируем систему опыта для юнитов на карте
    
                    let units = enumerate(settlementUnits);
                    let unit;
                    while ((unit = eNext(units)) !== undefined) {
                        if (levelSystemGlobalData.IsCombatConfig(unit.Cfg) && unit.IsAlive) {
                            levelSystemGlobalData.unitsExperienceSystem.push(new UnitExperienceSystem(unit));
                        }
                    }
                }
            }
        } else {
            var levelSystemGlobalData = this.globalStorage.levelSystemGlobalData as ExperienceSystemGlobalData;
            var gameTickMask          = gameTickNum % UnitUpdatePeriod;
            for (var unitNum = 0; unitNum < levelSystemGlobalData.unitsExperienceSystem.length; unitNum++) {
                var unitExperienceSystem = levelSystemGlobalData.unitsExperienceSystem[unitNum];

                // проверяем, что настала очередь обработки юнитов

                if (gameTickMask != unitExperienceSystem.tickMask) {
                    continue;
                }

                // проверяем, что юнита нужно удалить из списка

                if (unitExperienceSystem.unit.IsDead) {
                    delete levelSystemGlobalData.unitsExperienceSystem[unitNum].unit.ScriptData['ExperienceSystem'];
                    levelSystemGlobalData.unitsExperienceSystem.splice(unitNum--, 1);
                    continue;
                }

                unitExperienceSystem.OnEveryTick(gameTickNum);
            }

            if (gameTickNum % 300 == 0) {
                let scenaSettlements = ActiveScena.GetRealScena().Settlements;
                for (var settlementNum = 0; settlementNum < scenaSettlements.Count; settlementNum++) {
                    for (var other_settlementNum = 0; other_settlementNum < scenaSettlements.Count; other_settlementNum++) {
                        levelSystemGlobalData.settlementsWarTable[settlementNum][other_settlementNum]
                            = scenaSettlements.Item.get(settlementNum + '').Diplomacy.IsWarStatus(scenaSettlements.Item.get(other_settlementNum + ''));
                    }
                }
            }
        }
    }
}
