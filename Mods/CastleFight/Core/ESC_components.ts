import { printObjectItems } from "library/common/introspection";
import { log } from "library/common/logging";
import { Point } from "./Utils";

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
};

export class UnitComponent extends IComponent {
    /** ссылка на юнита */
    unit: any;
    /** ссылка на конфиг */
    cfgId: string;

    public constructor(unit:any, cfgId: string) {
        super(COMPONENT_TYPE.UNIT_COMPONENT);
        this.unit = unit;
        this.cfgId = cfgId;
    }

    public Clone(): UnitComponent {
        return new UnitComponent(this.unit, this.cfgId);
    }
};

export class SpawnBuildingComponent extends IComponent {
    /** ид конфига юнита */
    spawnUnitConfigId: string;
    /** такт с которого нужно спавнить юнитов */
    spawnTact: number;
    /** частота спавна в тактах */
    spawnPeriodTact: number

    public constructor(spawnUnitConfigId: string, spawnTact: number, spawnPeriodTact: number) {
        super(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT);

        this.spawnUnitConfigId = spawnUnitConfigId;
        this.spawnTact         = spawnTact;
        this.spawnPeriodTact   = spawnPeriodTact;
    }

    public Clone(): SpawnBuildingComponent {
        return new SpawnBuildingComponent(this.spawnUnitConfigId, this.spawnTact, this.spawnPeriodTact);
    }
}

export class AttackingAlongPathComponent extends IComponent {
    /** путь атаки */
    attackPath: Array<Point>;
    /** номер точки в которую нужно сейчас идти */
    currentPathPointNum: number;

    public constructor(attackPath?: Array<Point>, currentPathPointNum?: number) {
        super(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT);

        if (attackPath) {
            this.attackPath = attackPath;
        }
        if (currentPathPointNum) {
            this.currentPathPointNum = currentPathPointNum;
        } else {
            this.currentPathPointNum = 0;
        }
    }

    public Clone(): AttackingAlongPathComponent {
        return new AttackingAlongPathComponent(this.attackPath, this.currentPathPointNum);
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
    point: Point;
    /** время возрождения */
    reviveTicks: number;
    /** время когда рабочего нужно реснуть */
    tick: number;
    /** флаг, что юнит ждет респа */
    waitingToRevive: boolean;
    
    public constructor(point: Point, reviveTicks: number, tick: number) {
        super(COMPONENT_TYPE.REVIVE_COMPONENT);

        this.point           = point;
        this.reviveTicks     = reviveTicks;
        this.tick            = tick;
        this.waitingToRevive = false;
    }

    public Clone() : ReviveComponent {
        return new ReviveComponent(this.point, this.reviveTicks, this.tick);
    }
};

export class UpgradableBuildingComponent extends IComponent {
    /** список ид конфигов, в которые здание можно улучшить */
    upgradeCfgIds: Array<string>;
    /** список ид конфигов, которые нужно построить чтобы получить соответствующие улучшение */
    upgradeUnitCfgIds: Array<string>;

    public constructor(upgradeCfgIds: Array<string>, upgradeUnitCfgIds: Array<string>) {
        super(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT);

        this.upgradeCfgIds = upgradeCfgIds;
        this.upgradeUnitCfgIds = upgradeUnitCfgIds;
    }

    public Clone(): UpgradableBuildingComponent {
        return new UpgradableBuildingComponent(this.upgradeCfgIds, this.upgradeUnitCfgIds);
    }
};

/** тип баффа */
export enum BUFF_TYPE {
    ATTACK = 0,
    HEALTH,
    DEFFENSE,
    CLONING,
    EMPTY
};

/** Компонент с информацией о текущем бафе, его наличие означает, что юнита можно баффать */
export class BuffableComponent extends IComponent {
    /** тип наложенного баффа на юнита */
    buffType: BUFF_TYPE;
    /** баффнутый Cfg */
    buffCfg: any;

    public constructor(buffType?: BUFF_TYPE, buffCfg?: any) {
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
    }

    public Clone() : BuffableComponent {
        return new BuffableComponent(this.buffType, this.buffCfg);
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
