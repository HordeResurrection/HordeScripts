import { printObjectItems } from "library/common/introspection";
import { log } from "library/common/logging";
import { Cell, CfgAddUnitProducer, CreateUnitConfig } from "../Utils";
import { OpCfgUidToCfg as OpCfgUidToCfg, OpCfgUidToEntity } from "../Configs/IConfig";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { TileType, UnitFlags } from "library/game-logic/horde-types";

export class Entity {
    /** компоненты */
    components: Map<COMPONENT_TYPE, IComponent>;

    public constructor() {
        this.components = new Map<COMPONENT_TYPE, IComponent>();
    }
    
    /** клонировать сущность */
    public Clone() : Entity {
        var entity = new Entity();
        for (var componentNum = 0; componentNum < COMPONENT_TYPE.SIZE; componentNum++) {
            var componentType : COMPONENT_TYPE = componentNum;
            var component = this.components.get(componentType);
            if (!component) {
                continue;
            }
            entity.components.set(componentType, component.Clone());
        }

        return entity;
    }

    public Print(depth: number) {
        if (depth < 0) {
            return;
        }
        for (var componentNum = 0; componentNum < COMPONENT_TYPE.SIZE; componentNum++) {
            var componentType : COMPONENT_TYPE = componentNum;
            if (!this.components.has(componentType)) {
                continue;
            }
            log.info("имеется компонент ", componentType.toString());
            if (depth > 0) {
                printObjectItems(this.components.get(componentType), depth - 1);
            }
        }
    }

    /** настройка конфига под сущность */
    public InitConfig(cfg : any) {
        for (var componentNum = 0; componentNum < COMPONENT_TYPE.SIZE; componentNum++) {
            var componentType : COMPONENT_TYPE = componentNum;
            if (!this.components.has(componentType)) {
                continue;
            }
            this.components.get(componentType)?.InitConfig(cfg);
        }
    }
};

export enum COMPONENT_TYPE {
    UNIT_COMPONENT = 0,
    SPAWN_BUILDING_COMPONENT,
    ATTACKING_ALONG_PATH_COMPONENT,
    SETTLEMENT_COMPONENT,
    REVIVE_COMPONENT,
    UPGRADABLE_BUILDING_COMPONENT,
    BUFFABLE_COMPONENT,
    BUFF_COMPONENT,

    HERO_COMPONENT,
    HERO_ALTAR_COMPONENT,

    INCOME_INCREASE_COMPONENT,
    INCOME_LIMITED_PERIODICAL_COMPONENT,
    /**
     * событие разового дохода
     */ 
    INCOME_EVENT,
    INCOME_INCREASE_EVENT,
    UNIT_PRODUCED_EVENT,

    SIZE
}; 

export class IComponent {
    /** ид компонента */
    id: COMPONENT_TYPE;

    public constructor(id:COMPONENT_TYPE) {
        this.id = id;
    }

    public Clone() : IComponent {
        return new IComponent(this.id);
    }

    /** настройка конфига под сущность */
    public InitConfig(cfg : any) {}
};

export class UnitComponent extends IComponent {
    /** ссылка на юнита */
    unit: any;
    /** ссылка на конфиг */
    cfgUid: string;

    public constructor(unit:any, cfgUid: string) {
        super(COMPONENT_TYPE.UNIT_COMPONENT);
        this.unit   = unit;
        this.cfgUid = cfgUid;
    }

    public Clone(): UnitComponent {
        return new UnitComponent(this.unit, this.cfgUid);
    }
};

export class SpawnBuildingComponent extends IComponent {
    /** ид конфига юнита */
    spawnUnitConfigUid: string;
    /** такт с которого нужно спавнить юнитов */
    spawnTact: number;
    /** частота спавна в тактах */
    spawnPeriodTact: number;
    /** количество юнитов, которые спавнятся */
    spawnCount: number = 1;

    /** юнит для сброса таймера спавна */
    public static resetSpawnCfgUid = "#CastleFight_Reset_spawn";

    public constructor(spawnUnitConfigUid: string, spawnTact: number, spawnPeriodTact: number, spawnCount: number) {
        super(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT);

        this.spawnUnitConfigUid = spawnUnitConfigUid;
        this.spawnTact          = spawnTact;
        this.spawnPeriodTact    = spawnPeriodTact;
        this.spawnCount         = spawnCount;
    }

    public Clone(): SpawnBuildingComponent {
        return new SpawnBuildingComponent(this.spawnUnitConfigUid, this.spawnTact, this.spawnPeriodTact, this.spawnCount);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        // даем профессию найма юнитов
        CfgAddUnitProducer(cfg);

        // добавляем сброс таймера спавна
        this.InitResetSpawnCfg();
        var producerParams = cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        produceList.Add(OpCfgUidToCfg[SpawnBuildingComponent.resetSpawnCfgUid]);

        // добавляем описание спавнующего юнита
        var spawnUnitCfg = OpCfgUidToCfg[this.spawnUnitConfigUid];
        ScriptUtils.SetValue(cfg, "Description", cfg.Description + (cfg.Description == "" ? "" : "\n") + "Тренирует: " + 
            spawnUnitCfg.Name + "\n" +
            "  здоровье " + spawnUnitCfg.MaxHealth + "\n" +
            "  броня " + spawnUnitCfg.Shield + "\n" +
            (
                spawnUnitCfg.MainArmament
                ? "  атака " + spawnUnitCfg.MainArmament.ShotParams.Damage + "\n" +
                  "  радиус атаки " + spawnUnitCfg.MainArmament.Range + "\n"
                : ""
            ) +
            "  скорость бега " + spawnUnitCfg.Speeds.Item(TileType.Grass) + "\n"
            + (spawnUnitCfg.Flags.HasFlag(UnitFlags.FireResistant) || spawnUnitCfg.Flags.HasFlag(UnitFlags.MagicResistant)
                ? "  иммунитет к " + (spawnUnitCfg.Flags.HasFlag(UnitFlags.FireResistant) ? "огню " : "") + 
                    (spawnUnitCfg.Flags.HasFlag(UnitFlags.MagicResistant) ? "магии " : "") + "\n"
                : "")
            + "  радиус видимости " + spawnUnitCfg.Sight
            );
    }

    public InitResetSpawnCfg() {
        if (OpCfgUidToCfg[SpawnBuildingComponent.resetSpawnCfgUid] != undefined) {
            return;
        }

        // создаем конфиг
        OpCfgUidToCfg[SpawnBuildingComponent.resetSpawnCfgUid] = CreateUnitConfig("#UnitConfig_Slavyane_Swordmen", SpawnBuildingComponent.resetSpawnCfgUid);
        
        var cfg = OpCfgUidToCfg[SpawnBuildingComponent.resetSpawnCfgUid];

        // имя
        ScriptUtils.SetValue(cfg, "Name", "Перезапустить найм");
        // описание
        ScriptUtils.SetValue(cfg, "Description", "Перезапустить найм юнитов. Юниты будут наняты через обычное время с перезапуска.");
        // время постройки
        ScriptUtils.SetValue(cfg, "ProductionTime", 500);
        // убираем требования
        cfg.TechConfig.Requirements.Clear();
        // убираем производство людей
        ScriptUtils.SetValue(cfg, "ProducedPeople", 0);
        // убираем налоги
        ScriptUtils.SetValue(cfg, "SalarySlots", 0);
        // делаем 0-ую стоимость
        ScriptUtils.SetValue(cfg.CostResources, "Gold",   0);
        ScriptUtils.SetValue(cfg.CostResources, "Metal",  0);
        ScriptUtils.SetValue(cfg.CostResources, "Lumber", 0);
        ScriptUtils.SetValue(cfg.CostResources, "People", 0);
    }
}

export class AttackingAlongPathComponent extends IComponent {
    /** номер выбранного пути атаки */
    selectedAttackPathNum: number;
    /** путь атаки */
    attackPath: Array<Cell>;
    /** номер точки в которую нужно сейчас идти */
    currentPathPointNum: number;

    public constructor(selectedAttackPathNum?: number, attackPath?: Array<Cell>, currentPathPointNum?: number) {
        super(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT);

        this.selectedAttackPathNum = selectedAttackPathNum ?? 0;
        if (attackPath) {
            this.attackPath = attackPath;
        }
        this.currentPathPointNum = currentPathPointNum ?? 0;
    }

    public Clone(): AttackingAlongPathComponent {
        return new AttackingAlongPathComponent(this.selectedAttackPathNum, this.attackPath, this.currentPathPointNum);
    }
}

/**
 * событие разового дохода
 */ 
export class IncomeEvent extends IComponent {
    /** доход железа */
    metal: number;
    /** доход золота */
    gold: number;
    /** доход дерева */
    lumber: number;
    /** доход населения */
    people: number;

    public constructor(metal:number, gold:number, lumber:number, people: number) {
        super(COMPONENT_TYPE.INCOME_EVENT);

        this.metal  = metal;
        this.gold   = gold;
        this.lumber = lumber;
        this.people = people;
    }

    public Clone(): IncomeEvent {
        return new IncomeEvent(this.metal, this.gold, this.lumber, this.people);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        ScriptUtils.SetValue(cfg, "Description", cfg.Description + "\nРазово дает " +
            (this.metal > 0  ? this.metal  + " железа" : "") +
            (this.gold > 0   ? this.gold   + " золота" : "") +
            (this.lumber > 0 ? this.lumber + " дерева" : "") +
            (this.people > 0 ? this.people + " людей"  : "") + "\n");
    }
}

/** событие разового увеличение пассивного дохода поселения */
export class IncomeIncreaseEvent extends IComponent {
    /** увеличение дохода железа */
    metal: number;
    /** увеличение дохода золота */
    gold: number;
    /** увеличение дохода дерева */
    lumber: number;

    public constructor(metal:number, gold:number, lumber:number) {
        super(COMPONENT_TYPE.INCOME_INCREASE_EVENT);

        this.metal = metal;
        this.gold = gold;
        this.lumber = lumber;
    }

    public Clone(): IncomeIncreaseEvent {
        return new IncomeIncreaseEvent(this.metal, this.gold, this.lumber);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        ScriptUtils.SetValue(cfg, "Description", cfg.Description + "\nУвеличивает доход на " +
            (this.metal > 0  ? this.metal  + " железа" : "") +
            (this.gold > 0   ? this.gold   + " золота" : "") +
            (this.lumber > 0 ? this.lumber + " дерева" : "") + "\n");
    }
}

/** компонент увеличивающий в процентах пассивный доход поселения */
export class IncomeIncreaseComponent extends IComponent {
    public constructor() {
        super(COMPONENT_TYPE.INCOME_INCREASE_COMPONENT);
    }

    public Clone(): IncomeIncreaseComponent {
        return new IncomeIncreaseComponent();
    }
}

/** компонент ограниченного дохода */
export class IncomeLimitedPeriodicalComponent extends IComponent {
    /** всего железа */
    totalMetal: number;
    /** всего золота */
    totalGold: number;
    /** всего дерева */
    totalLumber: number;

    /** железа в период */
    metal: number;
    /** золота в период */
    gold: number;
    /** дерева в период */
    lumber: number;

    /** период прихода инкома */
    periodTacts: number;
    /** такт получения следующего инкома */
    tact: number;

    public constructor(totalMetal: number, totalGold: number, totalLumber: number, metal: number, gold: number,
                       lumber: number, periodTacts: number, tact: number) {
        super(COMPONENT_TYPE.INCOME_LIMITED_PERIODICAL_COMPONENT);

        this.totalMetal  = totalMetal;
        this.totalGold   = totalGold;
        this.totalLumber = totalLumber;
        this.metal       = metal;
        this.gold        = gold;
        this.lumber      = lumber;
        this.periodTacts = periodTacts;
        this.tact        = tact;
    }

    public Clone() : IncomeLimitedPeriodicalComponent {
        return new IncomeLimitedPeriodicalComponent(this.totalMetal,
            this.totalGold,
            this.totalLumber,
            this.metal,
            this.gold,
            this.lumber,
            this.periodTacts,
            this.tact);
    }
};

export class SettlementComponent extends IComponent {        
    /** пассивный доход железа */
    incomeMetal: number;
    /** пассивный доход золота */
    incomeGold: number;
    /** пассивный доход дерева */
    incomeLumber: number;
    /** сколько ждать тактов для начисления пассивного дохода */
    incomeWaitTacts: number;
    /** такт пассивного дохода */
    incomeTact: number;

    public constructor(
        incomeMetal:number,
        incomeGold:number,
        incomeLumber:number,
        incomeWaitTacts: number,
        incomeTact:number) {
        super(COMPONENT_TYPE.SETTLEMENT_COMPONENT);

        this.incomeMetal  = incomeMetal;
        this.incomeGold   = incomeGold;
        this.incomeLumber = incomeLumber;
        this.incomeWaitTacts = incomeWaitTacts;
        this.incomeTact   = incomeTact;
    }

    public Clone() : SettlementComponent {
        throw "Cant Clone SettlementComponent";
    }
};

export class ReviveComponent extends IComponent {
    /** точка - места респа рабочего */
    cell: Cell;
    /** время возрождения */
    reviveTicks: number;
    /** время когда рабочего нужно реснуть */
    tick: number;
    /** флаг, что юнит ждет респа */
    waitingToRevive: boolean;
    
    public constructor(point: Cell, reviveTicks: number, tick: number) {
        super(COMPONENT_TYPE.REVIVE_COMPONENT);

        this.cell           = point;
        this.reviveTicks     = reviveTicks;
        this.tick            = tick;
        this.waitingToRevive = false;
    }

    public Clone() : ReviveComponent {
        return new ReviveComponent(this.cell, this.reviveTicks, this.tick);
    }
};

export class UpgradableBuildingComponent extends IComponent {
    /** список ид конфигов, в которые здание можно улучшить */
    upgradesCfgUid: Array<string>;

    public constructor(upgradesCfgUid: Array<string>) {
        super(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT);

        this.upgradesCfgUid     = upgradesCfgUid;
        //this.upgradesUnitCfgUid = upgradesUnitCfgUid;
    }

    public Clone(): UpgradableBuildingComponent {
        return new UpgradableBuildingComponent(this.upgradesCfgUid);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        // даем профессию найма юнитов
        CfgAddUnitProducer(cfg);

        // добавляем в постройку дерево улучшений
        var producerParams = cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        ScriptUtils.SetValue(cfg, "Description", cfg.Description + (cfg.Description == "" ? "" : "\n\n") + "Можно улучшить до:");
        for (var i = 0; i < this.upgradesCfgUid.length; i++) {
            produceList.Add(this._GenerateImproveIconCfg(this.upgradesCfgUid[i]));
            this._GenerateRecursivereImprovementTree(cfg, this.upgradesCfgUid[i], "    ");
        }
    }

    /** суффикс к улучшаемому зданию, чтобы получить иконку */
    private static upgradeIconSuffix = "_upgradeIcon";
    /** вернет cfg который нужно построить, чтобы улучишить до cfgUid */
    public static GetUpgradeCfgUid (cfgUid : string) {
        return cfgUid + this.upgradeIconSuffix;
    }

    private _GenerateRecursivereImprovementTree(cfg: any, currentCfgUid: string, shiftStr: string) {
        var currentCfg = OpCfgUidToCfg[currentCfgUid];
        ScriptUtils.SetValue(cfg, "Description", cfg.Description + "\n" + shiftStr + currentCfg.Name);

        var current_Entity = OpCfgUidToEntity.get(currentCfgUid);
        if (!current_Entity) { 
            return;
        }
        if (!current_Entity.components.has(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT)) {
            return;
        }
        var current_upgradableBuildingComponent = current_Entity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as UpgradableBuildingComponent;
        for (var i = 0; i < current_upgradableBuildingComponent.upgradesCfgUid.length; i++) {
            this._GenerateRecursivereImprovementTree(cfg, current_upgradableBuildingComponent.upgradesCfgUid[i], shiftStr + "    ");
        }
    }

    private _GenerateImproveIconCfg(cfgUid : string) : any {
        var iconCfgUid = UpgradableBuildingComponent.GetUpgradeCfgUid(cfgUid);
        var iconCfg    = OpCfgUidToCfg[iconCfgUid];
        if (iconCfg == undefined) {
            // создаем конфиг
            if (OpCfgUidToEntity.has(cfgUid)) {
                var entity = OpCfgUidToEntity.get(cfgUid) as Entity;
                if (entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT)) {
                    // если данный конфиг спавнит юнитов, то иконку делаем на основе юнита
                    var SpawnBuildingComponent = entity.components.get(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT) as SpawnBuildingComponent;
                    OpCfgUidToCfg[iconCfgUid]  = CreateUnitConfig(SpawnBuildingComponent.spawnUnitConfigUid, iconCfgUid);
                } else {
                    OpCfgUidToCfg[iconCfgUid] = CreateUnitConfig(cfgUid, iconCfgUid);
                }
            } else {
                OpCfgUidToCfg[iconCfgUid] = CreateUnitConfig(cfgUid, iconCfgUid);
            }
            iconCfg = OpCfgUidToCfg[iconCfgUid];

            // настраиваем конфиг иконки
            ScriptUtils.SetValue(iconCfg, "Name", "Улучшить до " + OpCfgUidToCfg[cfgUid].Name);
            ScriptUtils.SetValue(iconCfg, "Description", OpCfgUidToCfg[cfgUid].Description);
            ScriptUtils.SetValue(iconCfg, "ProductionTime", 250);
            ScriptUtils.SetValue(iconCfg, "MaxHealth", 1); // чтобы время постройки было ровно как надо
            ScriptUtils.SetValue(iconCfg.CostResources, "Gold",   OpCfgUidToCfg[cfgUid].CostResources.Gold);
            ScriptUtils.SetValue(iconCfg.CostResources, "Metal",  OpCfgUidToCfg[cfgUid].CostResources.Metal);
            ScriptUtils.SetValue(iconCfg.CostResources, "Lumber", OpCfgUidToCfg[cfgUid].CostResources.Lumber);
            ScriptUtils.SetValue(iconCfg.CostResources, "People", OpCfgUidToCfg[cfgUid].CostResources.People);
            iconCfg.TechConfig.Requirements.Clear();
        }

        return iconCfg;
    }
};

/** тип баффа */
export enum BUFF_TYPE {
    EMPTY = 0,
    ATTACK,
    ACCURACY,
    HEALTH,
    DEFFENSE,
    CLONING,

    SIZE
};

/** суффик в имени конфига для баффнутого юнита */
export var BuffCfgUidSuffix = [
    "",
    "_buffAttack",
    "_buffAccuracy",
    "_buffHealth",
    "_buffDeffense",
    "_buffCloning",
    ""
];

/** тип оптимальной цели */
export enum BuffOptTargetType {
    Melle = 0,
    Range,
    All
};

/** оптимальная цель баффа */
export var BuffsOptTarget = [
    BuffOptTargetType.All,
    BuffOptTargetType.Range,
    BuffOptTargetType.Range,
    BuffOptTargetType.All,
    BuffOptTargetType.All,
    BuffOptTargetType.All
];

/** Компонент с информацией о текущем бафе, его наличие означает, что юнита можно баффать */
export class BuffableComponent extends IComponent {
    /** тип наложенного баффа на юнита */
    buffType: BUFF_TYPE;
    /** баффнутый Cfg */
    buffCfg: any;
    /** маска доступных баффов */
    buffMask: Array<boolean>;

    public constructor(buffMask?: Array<boolean>, buffType?: BUFF_TYPE, buffCfg?: any) {
        super(COMPONENT_TYPE.BUFFABLE_COMPONENT);

        if (buffType) {
            this.buffType = buffType;
        } else {
            this.buffType = BUFF_TYPE.EMPTY;
        }
        if (buffCfg) {
            this.buffCfg = buffCfg;
        } else {
            this.buffCfg = null;
        }
        if (buffMask) {
            this.buffMask = buffMask;
        } else {
            this.buffMask = new Array<boolean>(BUFF_TYPE.SIZE);
            for (var i = 0; i < BUFF_TYPE.SIZE; i++) {
                this.buffMask[i] = true;
            }
        }
    }

    public Clone() : BuffableComponent {
        return new BuffableComponent(this.buffMask, this.buffType, this.buffCfg);
    }
};

/** Компонент, что юнит может баффать BuffableComponent */
export class BuffComponent extends IComponent {
    /** тип баффа */
    buffType: BUFF_TYPE;

    public constructor(buffType: BUFF_TYPE) {
        super(COMPONENT_TYPE.BUFF_COMPONENT);

        this.buffType = buffType;
    }

    public Clone() : BuffComponent {
        return new BuffComponent(this.buffType);
    }
};

/** компонент героя */
export class HeroComponent extends IComponent {
    /** количество убийств */
    kills: number;
    /** текущий уровень */
    level: number;

    public constructor () {
        super(COMPONENT_TYPE.HERO_COMPONENT);
    }

    public Clone() : HeroComponent {
        return new HeroComponent();
    }
};

/** Компонент для алтаря героя */
export class HeroAltarComponent extends IComponent {
    /** список ид всех героев */
    heroesCfgIdxs: Array<string>;
    /** номер выбранного героя */
    selectedHeroNum: number;

    public constructor (heroesCfgIdxs: Array<string>, selectedHeroNum?: number) {
        super(COMPONENT_TYPE.HERO_ALTAR_COMPONENT);

        this.heroesCfgIdxs = heroesCfgIdxs;
        if (selectedHeroNum) {
            this.selectedHeroNum = selectedHeroNum;
        } else {
            this.selectedHeroNum = -1;
        }
    }

    public Clone() : HeroAltarComponent {
        return new HeroAltarComponent(this.heroesCfgIdxs, this.selectedHeroNum);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        // даем профессию найма юнитов
        CfgAddUnitProducer(cfg);

        var producerParams = cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        for (var heroCfgId of this.heroesCfgIdxs) {
            produceList.Add(OpCfgUidToCfg[heroCfgId]);
        }
    }
};

export class UnitProducedEvent extends IComponent {
    /** ссылка на юнита-строителя */
    producerUnit: any;
    /** ссылка на построенного юнита */
    producedUnit: any;

    public constructor(producerUnit: any, producedUnit: any) {
        super(COMPONENT_TYPE.UNIT_PRODUCED_EVENT);

        this.producerUnit = producerUnit;
        this.producedUnit = producedUnit;
    }

    public Clone() : UnitProducedEvent {
        return new UnitProducedEvent(this.producerUnit, this.producedUnit);
    }
};
