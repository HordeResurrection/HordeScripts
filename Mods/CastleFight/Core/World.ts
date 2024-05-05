import { log } from "library/common/logging";
import { createHordeColor, createPoint } from "library/common/primitives";
import { isReplayMode } from "library/game-logic/game-tools";
import { UnitCommand, TileType, UnitFlags, UnitSpecification, UnitDeathType, UnitDirection } from "library/game-logic/horde-types";
import { UnitProfession, UnitProducerProfessionParams } from "library/game-logic/unit-professions";
import { spawnUnit } from "library/game-logic/unit-spawn";
import { world } from "./CastleFightPlugin";
import { Entity, COMPONENT_TYPE, UnitComponent, AttackingAlongPathComponent, BuffableComponent, SpawnBuildingComponent, UpgradableBuildingComponent, BuffComponent, BUFF_TYPE, ReviveComponent, HeroAltarComponent, IncomeEvent, IncomeIncreaseEvent, SettlementComponent, IncomeLimitedPeriodicalComponent, UnitProducedEvent } from "./Components/ESC_components";
import { Polygon, Cell as Cell, CfgAddUnitProducer, getCurrentTime, MetricType, distance_L1, distance_L2, CfgSetSpeed } from "./Utils";
import { AI_Init } from "./Systems/AISystems";
import { mergeFlags } from "library/dotnet/dotnet-utils";

const PeopleIncomeLevelT = HCL.HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;

export enum GameState {
    INIT = 0,
    PLAY,
    CLEAR,
    END
};

export class IAttackPathChoiser {
    public choiseAttackPath(unit: any, world: World) : number {
        return 0;
    }
};
export class AttackPathChoiser_NearDistance extends IAttackPathChoiser {
    _metricType: MetricType;

    public constructor (metricType?: MetricType) {
        super();

        this._metricType = metricType ?? MetricType.L1;
    };

    public choiseAttackPath(unit: any, world: World) : number {
        var nearAttackPathNum      = -1;
        var nearAttackPathDistance = Number.MAX_VALUE;
        for (var attackPathNum = 0; attackPathNum < world.settlements_attack_paths[unit.Owner.Uid].length; attackPathNum++) {
            var distance = 0.0;
            switch (this._metricType) {
                case MetricType.L1:
                    distance = distance_L1(unit.Cell.X, unit.Cell.Y, world.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].X, world.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].Y);
                    break;
                case MetricType.L2:
                    distance = distance_L2(unit.Cell.X, unit.Cell.Y, world.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].X, world.settlements_attack_paths[unit.Owner.Uid][attackPathNum][0].Y);
                    break;
            }
            if (distance < nearAttackPathDistance) {
                nearAttackPathDistance = distance;
                nearAttackPathNum      = attackPathNum;
            }
        }
        return nearAttackPathNum;
    }
};
export class AttackPathChoiser_Periodically extends IAttackPathChoiser {
    settlements_nextAttackPathNum: Array<number>;

    public constructor() {
        super();

        this.settlements_nextAttackPathNum = [];
    }

    public choiseAttackPath(unit: any, world: World) : number {
        if (this.settlements_nextAttackPathNum.length != world.settlementsCount) {
            this.settlements_nextAttackPathNum = new Array<number>(world.settlementsCount);
            for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                this.settlements_nextAttackPathNum[settlementId] = 0;
            }
        }

        this.settlements_nextAttackPathNum[unit.Owner.Uid] = (this.settlements_nextAttackPathNum[unit.Owner.Uid] + 1) % world.settlements_attack_paths[unit.Owner.Uid].length;
        return this.settlements_nextAttackPathNum[unit.Owner.Uid];
    }
};
export class AttackPathChoiser_Periodically_WithCondCell extends IAttackPathChoiser {
    settlements_nextAttackPathNum: Array<number>;
    settlements_attackPaths_condCell: Array<Array<Array<Cell>>>;
    settlements_attackPaths_condUnit: Array<Array<Array<any>>>;
    
    public constructor(settlements_attackPaths_condCell: Array<Array<Array<Cell>>>) {
        super();

        this.settlements_nextAttackPathNum    = [];
        this.settlements_attackPaths_condCell = settlements_attackPaths_condCell;
        this.settlements_attackPaths_condUnit = [];
    }

    public choiseAttackPath(unit: any, world: World) : number {
        // инициализируем

        if (this.settlements_nextAttackPathNum.length != world.settlementsCount) {
            this.settlements_nextAttackPathNum = new Array<number>(world.settlementsCount);
            for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                this.settlements_nextAttackPathNum[settlementId] = 0;
            }

            var unitsMap        = world.realScena.UnitsMap

            this.settlements_attackPaths_condUnit = new Array<Array<Array<Cell>>>(this.settlements_attackPaths_condCell.length);
            for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                this.settlements_attackPaths_condUnit[settlementId] = new Array<Array<Cell>>(this.settlements_attackPaths_condCell[settlementId].length);
                for (var attackPathNum = 0; attackPathNum < world.settlements_attack_paths[settlementId].length; attackPathNum++) {
                    this.settlements_attackPaths_condUnit[settlementId][attackPathNum] = new Array<Array<Cell>>(this.settlements_attackPaths_condCell[settlementId][attackPathNum].length);
                    for (var condUnitNum = 0; condUnitNum < this.settlements_attackPaths_condUnit[settlementId][attackPathNum].length; condUnitNum++) {
                        var condUnit = unitsMap.GetUpperUnit(
                            this.settlements_attackPaths_condCell[settlementId][attackPathNum][condUnitNum].X,
                            this.settlements_attackPaths_condCell[settlementId][attackPathNum][condUnitNum].Y
                        );
                        if (!condUnit) {
                            throw "Can't find condUnit";
                        }
                        this.settlements_attackPaths_condUnit[settlementId][attackPathNum][condUnitNum] = condUnit;
                    }
                }
            }
        }

        const unitSettlementId = unit.Owner.Uid;

        // удаляем ссылки если юниты убиты

        for (var attackPathNum = 0; attackPathNum < this.settlements_attackPaths_condUnit[unitSettlementId].length; attackPathNum++) {
            for (var condUnitNum = 0; condUnitNum < this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum].length; condUnitNum++) {
                if (this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum][condUnitNum] &&
                    this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum][condUnitNum].IsDead) {
                    this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum][condUnitNum] = null;
                }
            }
        }

        // выбираем след точку атаки

        for (var attackPathNum = 0; attackPathNum < this.settlements_attackPaths_condUnit[unitSettlementId].length; attackPathNum++) {
            this.settlements_nextAttackPathNum[unitSettlementId] = (this.settlements_nextAttackPathNum[unitSettlementId] + 1) % world.settlements_attack_paths[unitSettlementId].length;
            // проверяем, что путь доступен
            var pathEmpty = true;
            for (var condUnitNum = 0; condUnitNum < this.settlements_attackPaths_condUnit[unitSettlementId][attackPathNum].length; condUnitNum++) {
                if (this.settlements_attackPaths_condUnit[unitSettlementId][this.settlements_nextAttackPathNum[unitSettlementId]][condUnitNum]) {
                    pathEmpty = false;
                    break;
                }
            }
            if (!pathEmpty) {
                break;
            }
        }

        return this.settlements_nextAttackPathNum[unitSettlementId];
    }
};

export class World {
    /** количество поселений */
    settlementsCount: number;
    /** ссылки на поселения, если не в игре, то будет null */
    settlements: Array<any>;
    /** для каждого поселения хранит список сущностей */
    settlements_entities: Array<Array<Entity>>;
    /** для каждого поселения хранится ссылка на главного замка */
    settlements_castleUnit: Array<any>;
    /** для каждого поселения хранится область вокруг главного замка, которую нужно охранять */
    settlements_field: Array<Polygon>;
    /** для каждого поселения хранится точка спавна рабочих */
    settlements_workers_reviveCells: Array<Array<Cell>>;
    /** для каждого поселения хранится точка замка */
    settlements_castle_cell: Array<Cell>;
    /** таблица войны */
    settlements_settlements_warFlag: Array<Array<boolean>>;
    /** для каждого поселения хранится набор путей атаки */
    settlements_attack_paths: Array<Array<Array<Cell>>>;
    /** для каждого поселения хранится селектор пути атаки */
    settlements_attackPathChoiser: Array<IAttackPathChoiser>;

    /** текущее состояние игры */
    state: GameState;

    /** массив конфигов */
    configs: any;
    /** для каждого Uid конфига хранит готовую ESC сущность */
    cfgUid_entity: Map<string, Entity>;

    /** для каждой системы хранит функцию */
    systems_func: Array<(world: World, gameTickNum: number)=>void>;
    /** для каждой системы хранит имя */
    systems_name: Array<string>;
    /** для каждой системы хранит время выполнения */
    systems_executionTime: Array<number>;

    /** реальная сцена */
    realScena: any;

    /** для каждого поселения хранит обработчик построенных юнитов */
    unitProducedCallbacks: Array<any>;

    /** параметры */
    castle_health_coeff: number;
    spawn_count_coeff: number;
    
    public constructor ( )
    {
        this.state      = GameState.INIT;

        this.configs       = {};
        this.cfgUid_entity = new Map<string, Entity>();

        this.systems_func          = new Array<any>();
        this.systems_name          = new Array<string>();
        this.systems_executionTime = new Array<number>();

        this.castle_health_coeff = 1;
        this.spawn_count_coeff = 1;
    }

    public Init() {
        this.realScena                = ActiveScena.GetRealScena();

        this.settlements              = new Array<any>(this.settlementsCount);
        this.settlements_entities     = new Array<Array<Entity>>(this.settlementsCount);
        this.settlements_castleUnit   = new Array<any>(this.settlementsCount);
        this.settlements_settlements_warFlag = new Array<Array<boolean>>(this.settlementsCount);

        this.unitProducedCallbacks = new Array<any>(this.settlementsCount);

        for (var i = 0; i < this.settlementsCount; i++) {
            this.settlements[i] = null;
            this.settlements_entities[i] = new Array<Entity>();
            this.unitProducedCallbacks[i] = null;
            this.settlements_settlements_warFlag[i] = new Array<boolean>(this.settlementsCount);
        }

        this._InitConfigs();
        this._InitSettlements();
        this._PlaceCastle();
        AI_Init(this);
    }

    private _InitConfigs() {
        ////////////////////
        // замок
        ////////////////////

        this.configs["castle"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_StoneCastle"));
        // запрещаем самоуничтожение
        this.configs["castle"].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // убираем строительство
        this.configs["castle"].ProfessionParams.Remove(UnitProfession.UnitProducer);
        // убираем починку
        this.configs["castle"].ProfessionParams.Remove(UnitProfession.Reparable);
        // здоровье
        ScriptUtils.SetValue(this.configs["castle"], "MaxHealth", Math.round(300000*this.castle_health_coeff));
        // броня
        ScriptUtils.SetValue(this.configs["castle"], "Shield", 200);

        ////////////////////
        // Стрельбище (лучник)
        ////////////////////
        
        // юнит

        this.configs["unit_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_1"], "MaxHealth", 800);
        // броня
        ScriptUtils.SetValue(this.configs["unit_1"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_1"].MainArmament.BulletCombatParams, "Damage", 400);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_1"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_1"].Uid, entity);
        }

        // баррак
        this.configs["barrack_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Sawmill"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_1"], "Name", "Стрельбище");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_1"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_1"].CostResources, "Gold",   0);
        ScriptUtils.SetValue(this.configs["barrack_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_1"].CostResources, "People", 0);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_1"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_1", -1, 1500));
            entity.components.set(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT,
                new UpgradableBuildingComponent(
                    ["barrack_1_1", "barrack_1_2"],
                    ["#UnitConfig_Slavyane_Archer_2", "#UnitConfig_Slavyane_Crossbowman"]));
            this.cfgUid_entity.set(this.configs["barrack_1"].Uid, entity);
        }

        ////////////////////
        // Стрельбище -> Стрельбище огня (поджигатель)
        ////////////////////
        
        // юнит

        this.configs["unit_1_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer_2"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_1_1"], "MaxHealth", 1500);
        // броня
        ScriptUtils.SetValue(this.configs["unit_1_1"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_1_1"].MainArmament.BulletCombatParams, "Damage", 400);
        // увеличиваем количество выпускаемых стрел
        ScriptUtils.SetValue(this.configs["unit_1_1"].MainArmament, "EmitBulletsCountMin", 4);
        ScriptUtils.SetValue(this.configs["unit_1_1"].MainArmament, "EmitBulletsCountMax", 4);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_1_1"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_1_1"].Uid, entity);
        }

        // баррак

        this.configs["barrack_1_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Sawmill"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_1_1"], "Name", "Стрельбище огня");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_1_1"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_1_1"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_1_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_1_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_1_1"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_1_1"], "TintColor", createHordeColor(255, 200, 0, 0));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_1_1"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_1_1", -1, 1500));
            entity.components.set(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT,
                new UpgradableBuildingComponent(
                    ["barrack_1_1_1", "barrack_1_1_2"],
                    ["#UnitConfig_Mage_Mag_2", "#UnitConfig_Slavyane_Balista"]));
            this.cfgUid_entity.set(this.configs["barrack_1_1"].Uid, entity);
        }

        ////////////////////
        // Стрельбище -> Стрельбище огня -> Лаборатория огня (фантом)
        ////////////////////
        
        // юнит

        this.configs["unit_1_1_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Mage_Mag_2"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_1_1_1"], "MaxHealth", 3000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_1_1_1"], "Shield", 100);
        // урон
        ScriptUtils.SetValue(this.configs["unit_1_1_1"].MainArmament.BulletCombatParams, "Damage", 1000);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_1_1_1"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_1_1_1"].Uid, entity);
        }

        // здание

        this.configs["barrack_1_1_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Labor"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_1_1_1"], "Name", "Лаборатория огня");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_1_1_1"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_1_1_1"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_1_1_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_1_1_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_1_1_1"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_1_1_1"], "TintColor", createHordeColor(255, 200, 0, 0));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_1_1_1"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_1_1_1", -1, 1500));
            entity.components.set(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT,
                new UpgradableBuildingComponent(
                    ["barrack_1_1_1_1", "barrack_1_1_1_2"],
                    ["#UnitConfig_Mage_Mag_16", "#UnitConfig_Mage_Olga"]));
            this.cfgUid_entity.set(this.configs["barrack_1_1_1"].Uid, entity);
        }

        ////////////////////
        // Стрельбище -> Стрельбище огня -> Лаборатория огня -> Приют мага огня (Икон)
        ////////////////////
        
        // юнит

        this.configs["unit_1_1_1_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Mage_Mag_16"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_1_1_1_1"], "MaxHealth", 1000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_1_1_1_1"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_1_1_1_1"].MainArmament.BulletCombatParams, "Damage", 500);
        // убираем стоимость
        ScriptUtils.SetValue(this.configs["unit_1_1_1_1"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["unit_1_1_1_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["unit_1_1_1_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["unit_1_1_1_1"].CostResources, "People", 0);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_1_1_1_1"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_1_1_1_1"].Uid, entity);
        }

        // здание

        this.configs["barrack_1_1_1_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Mage_MageHouse"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_1"], "Name", "Приют мага огня");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_1"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_1"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_1"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_1"], "TintColor", createHordeColor(255, 200, 0, 0));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_1_1_1_1"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_1_1_1_1", -1, 1500));
            this.cfgUid_entity.set(this.configs["barrack_1_1_1_1"].Uid, entity);
        }

        ////////////////////
        // Стрельбище -> Стрельбище огня -> Лаборатория огня -> Приют мага молний (Ольга)
        ////////////////////
        
        // юнит

        this.configs["unit_1_1_1_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Mage_Olga"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_1_1_1_2"], "MaxHealth", 2000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_1_1_1_2"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_1_1_1_2"].MainArmament.BulletCombatParams, "Damage", 1000);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_1_1_1_2"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_1_1_1_2"].Uid, entity);
        }

        // здание

        this.configs["barrack_1_1_1_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Mage_MageHouse"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_2"], "Name", "Приют мага молний");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_2"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_2"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_2"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_2"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_2"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_1_1_1_2"], "TintColor", createHordeColor(255, 27, 42, 207));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_1_1_1_2"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_1_1_1_2", -1, 1500));
            this.cfgUid_entity.set(this.configs["barrack_1_1_1_2"].Uid, entity);
        }

        ////////////////////
        // Стрельбище -> Стрельбище огня -> Завод огня (баллиста)
        ////////////////////
        
        // юнит

        this.configs["unit_1_1_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Balista"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_1_1_2"], "MaxHealth", 2000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_1_1_2"], "Shield", 300);
        // урон
        ScriptUtils.SetValue(this.configs["unit_1_1_2"].MainArmament.BulletCombatParams, "Damage", 1000);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_1_1_2"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_1_1_2"].Uid, entity);
        }

        // здание

        this.configs["barrack_1_1_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Factory"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_1_1_2"], "Name", "Завод огня");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_1_1_2"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_1_1_2"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_1_1_2"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_1_1_2"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_1_1_2"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_1_1_2"], "TintColor", createHordeColor(255, 200, 0, 0));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_1_1_2"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_1_1_2", -1, 1500));
            this.cfgUid_entity.set(this.configs["barrack_1_1_2"].Uid, entity);
        }

        ////////////////////
        // Стрельбище -> Стрельбище металла (самостельщик)
        ////////////////////
        
        // юнит

        this.configs["unit_1_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Crossbowman"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_1_2"], "MaxHealth", 1000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_1_2"], "Shield", 100);
        // урон
        ScriptUtils.SetValue(this.configs["unit_1_2"].MainArmament.BulletCombatParams, "Damage", 800);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_1_2"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_1_2"].Uid, entity);
        }

        // баррак

        this.configs["barrack_1_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Sawmill"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_1_2"], "Name", "Стрельбище металла");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_1_2"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_1_2"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_1_2"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_1_2"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_1_2"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_1_2"], "TintColor", createHordeColor(255, 170, 169, 173));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_1_2"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_1_2", -1, 1500));
            entity.components.set(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT,
                new UpgradableBuildingComponent(
                    ["barrack_1_2_1"],
                    ["#UnitConfig_Slavyane_Catapult"]));
            this.cfgUid_entity.set(this.configs["barrack_1_2"].Uid, entity);
        }

        ////////////////////
        // Стрельбище -> Стрельбище металла -> Завод металла (катапульта)
        ////////////////////
        
        // юнит

        this.configs["unit_1_2_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Catapult"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_1_2_1"], "MaxHealth", 2000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_1_2_1"], "Shield", 300);
        // урон
        ScriptUtils.SetValue(this.configs["unit_1_2_1"].MainArmament.BulletCombatParams, "Damage", 500);
        // параметры атаки
        ScriptUtils.SetValue(this.configs["unit_1_2_1"], "Sight", 11);
        ScriptUtils.SetValue(this.configs["unit_1_2_1"], "OrderDistance", 11);
        ScriptUtils.SetValue(this.configs["unit_1_2_1"].MainArmament, "Range", 11);
        ScriptUtils.SetValue(this.configs["unit_1_2_1"].MainArmament, "BaseAccuracy", 1);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_1_2_1"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_1_2_1"].Uid, entity);
        }

        // баррак

        this.configs["barrack_1_2_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Factory"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_1_2_1"], "Name", "Завод металла");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_1_2_1"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_1_2_1"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_1_2_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_1_2_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_1_2_1"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_1_2_1"], "TintColor", createHordeColor(255, 170, 169, 173));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_1_2_1"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_1_2_1", -1, 1500));
            this.cfgUid_entity.set(this.configs["barrack_1_2_1"].Uid, entity);
        }

        ////////////////////
        // Казарма ополчения (рыцарь)
        ////////////////////
        
        // юнит

        this.configs["unit_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Swordmen"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_2"], "MaxHealth", 1000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_2"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_2"].MainArmament.BulletCombatParams, "Damage", 500);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_2"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_2"].Uid, entity);
        }

        // баррак

        this.configs["barrack_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Farm"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_2"], "Name", "Казарма ополчения");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_2"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_2"].CostResources, "Gold",   0);
        ScriptUtils.SetValue(this.configs["barrack_2"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_2"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_2"].CostResources, "People", 0);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_2"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_2", -1, 1500));
            entity.components.set(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT,
                new UpgradableBuildingComponent(
                    ["barrack_2_1", "barrack_2_2", "barrack_2_3"],
                    ["#UnitConfig_Slavyane_Heavymen", "#UnitConfig_Slavyane_Raider", "#UnitConfig_Mage_Skeleton"]));
            this.cfgUid_entity.set(this.configs["barrack_2"].Uid, entity);
        }

        ////////////////////
        // Казарма ополчения -> Казарма (тяжелый рыцарь)
        ////////////////////
        
        // юнит

        this.configs["unit_2_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Heavymen"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_2_1"], "MaxHealth", 1500);
        // броня
        ScriptUtils.SetValue(this.configs["unit_2_1"], "Shield", 200);
        // урон
        ScriptUtils.SetValue(this.configs["unit_2_1"].MainArmament.BulletCombatParams, "Damage", 500);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_2_1"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_2_1"].Uid, entity);
        }

        // баррак

        this.configs["barrack_2_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Barrack"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_2_1"], "Name", "Казарма");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_2_1"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_2_1"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_2_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_2_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_2_1"].CostResources, "People", 0);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_2_1"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_2_1", -1, 1500));
            entity.components.set(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT,
                new UpgradableBuildingComponent(
                    ["barrack_2_1_1", "barrack_2_1_2"],
                    ["#UnitConfig_Slavyane_FireforgedWarrior", "#UnitConfig_Slavyane_Beamman"]));
            this.cfgUid_entity.set(this.configs["barrack_2_1"].Uid, entity);
        }

        ////////////////////
        // Казарма ополчения -> Казарма -> Академия меча (паладин)
        ////////////////////
        
        // юнит

        this.configs["unit_2_1_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_FireforgedWarrior"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_2_1_1"], "MaxHealth", 3000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_2_1_1"], "Shield", 300);
        // урон
        ScriptUtils.SetValue(this.configs["unit_2_1_1"].MainArmament.BulletCombatParams, "Damage", 350);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_2_1_1"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_2_1_1"].Uid, entity);
        }

        // баррак

        this.configs["barrack_2_1_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_StoneBarrack"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_2_1_1"], "Name", "Академия меча");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_2_1_1"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_2_1_1"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_2_1_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_2_1_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_2_1_1"].CostResources, "People", 0);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_2_1_1"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_2_1_1", -1, 1500));
            this.cfgUid_entity.set(this.configs["barrack_2_1_1"].Uid, entity);
        }

        ////////////////////
        // Казарма ополчения -> Казарма -> Аккадемия дубины (воин с дубиной)
        ////////////////////
        
        // юнит

        this.configs["unit_2_1_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Beamman"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_2_1_2"], "MaxHealth", 2500);
        // броня
        ScriptUtils.SetValue(this.configs["unit_2_1_2"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_2_1_2"].MainArmament.BulletCombatParams, "Damage", 600);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_2_1_2"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_2_1_2"].Uid, entity);
        }

        // баррак

        this.configs["barrack_2_1_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_StoneBarrack"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_2_1_2"], "Name", "Академия дубины");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_2_1_2"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_2_1_2"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_2_1_2"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_2_1_2"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_2_1_2"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_2_1_2"], "TintColor", createHordeColor(255, 170, 107, 0));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_2_1_2"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_2_1_2", -1, 1500));
            this.cfgUid_entity.set(this.configs["barrack_2_1_2"].Uid, entity);
        }

        ////////////////////
        // Казарма ополчения -> Конюшня (всадник)
        ////////////////////
        
        // юнит

        this.configs["unit_2_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Raider"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_2_2"], "MaxHealth", 2000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_2_2"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_2_2"].MainArmament.BulletCombatParams, "Damage", 500);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_2_2"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_2_2"].Uid, entity);
        }

        // баррак

        this.configs["barrack_2_2"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Stables"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_2_2"], "Name", "Конюшня");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_2_2"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_2_2"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_2_2"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_2_2"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_2_2"].CostResources, "People", 0);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_2_2"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_2_2", -1, 1500));
            entity.components.set(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT,
                new UpgradableBuildingComponent(
                    ["barrack_2_2_1"],
                    ["#UnitConfig_Mage_Bearmen"]));
            this.cfgUid_entity.set(this.configs["barrack_2_2"].Uid, entity);
        }

        ////////////////////
        // Казарма ополчения -> Конюшня -> Медвежья конюшня (всадник на медведе)
        ////////////////////
        
        // юнит

        this.configs["unit_2_2_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Mage_Bearmen"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_2_2_1"], "MaxHealth", 3000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_2_2_1"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_2_2_1"].MainArmament.BulletCombatParams, "Damage", 700);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_2_2_1"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_2_2_1"].Uid, entity);
        }

        // баррак

        this.configs["barrack_2_2_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Stables"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_2_2_1"], "Name", "Медвежья конюшня");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_2_2_1"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_2_2_1"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_2_2_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_2_2_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_2_2_1"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_2_2_1"], "TintColor", createHordeColor(255, 60, 105, 31));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_2_2_1"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_2_2_1", -1, 1500));
            this.cfgUid_entity.set(this.configs["barrack_2_2_1"].Uid, entity);
        }

        ////////////////////
        // Казарма ополчения -> Казарма нежити (скелет)
        ////////////////////
        
        // юнит

        this.configs["unit_2_3"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Mage_Skeleton"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_2_3"], "MaxHealth", 1500);
        // броня
        ScriptUtils.SetValue(this.configs["unit_2_3"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_2_3"].MainArmament.BulletCombatParams, "Damage", 500);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_2_3"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_2_3"].Uid, entity);
        }

        // баррак

        this.configs["barrack_2_3"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Barrack"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_2_3"], "Name", "Казарма нежити");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_2_3"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_2_3"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_2_3"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_2_3"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_2_3"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_2_3"], "TintColor", createHordeColor(255, 203, 3, 247));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_2_3"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_2_3", -1, 1500));
            entity.components.set(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT,
                new UpgradableBuildingComponent(
                    ["barrack_2_3_1"],
                    ["#UnitConfig_Mage_Minotaur"]));
            this.cfgUid_entity.set(this.configs["barrack_2_3"].Uid, entity);
        }

        ////////////////////
        // Казарма ополчения -> Казарма нежити -> Кузница нежити (Минотавр)
        ////////////////////
        
        // юнит

        this.configs["unit_2_3_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Mage_Minotaur"));
        // здоровье
        ScriptUtils.SetValue(this.configs["unit_2_3_1"], "MaxHealth", 4000);
        // броня
        ScriptUtils.SetValue(this.configs["unit_2_3_1"], "Shield", 0);
        // урон
        ScriptUtils.SetValue(this.configs["unit_2_3_1"].MainArmament.BulletCombatParams, "Damage", 500);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "unit_2_3_1"));
            entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
            this.cfgUid_entity.set(this.configs["unit_2_3_1"].Uid, entity);
        }

        // баррак

        this.configs["barrack_2_3_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_StoneBarrack"));
        // имя
        ScriptUtils.SetValue(this.configs["barrack_2_3_1"], "Name", "Кузница нежити");
        // описание
        ScriptUtils.SetValue(this.configs["barrack_2_3_1"], "Description", "");
        // стоимость
        ScriptUtils.SetValue(this.configs["barrack_2_3_1"].CostResources, "Gold",   100);
        ScriptUtils.SetValue(this.configs["barrack_2_3_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["barrack_2_3_1"].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(this.configs["barrack_2_3_1"].CostResources, "People", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["barrack_2_3_1"], "TintColor", createHordeColor(255, 203, 3, 247));
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "barrack_2_3_1"));
            entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent("unit_2_3_1", -1, 1500));
            this.cfgUid_entity.set(this.configs["barrack_2_3_1"].Uid, entity);
        }

        ////////////////////
        // башня
        ////////////////////

        this.configs["tower_1"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Tower"));
        // имя
        ScriptUtils.SetValue(this.configs["tower_1"], "Name", "Башня");
        // описание
        ScriptUtils.SetValue(this.configs["tower_1"], "Description", "Защитное строение. Не допускайте катапульты. Можно усилить духами (кроме духа клонирования).");
        // здоровье
        ScriptUtils.SetValue(this.configs["tower_1"], "MaxHealth", 60000);
        // броня
        ScriptUtils.SetValue(this.configs["tower_1"], "Shield", 300);
        // делаем урон = 0
        ScriptUtils.SetValue(this.configs["tower_1"].MainArmament.BulletCombatParams, "Damage", 600);
        // стоимость
        ScriptUtils.SetValue(this.configs["tower_1"].CostResources, "Gold",   200);
        ScriptUtils.SetValue(this.configs["tower_1"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["tower_1"].CostResources, "Lumber", 200);
        ScriptUtils.SetValue(this.configs["tower_1"].CostResources, "People", 0);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "tower_1"));
            var buffMask = new Array<boolean>(BUFF_TYPE.SIZE);
            for (var i = 0; i < BUFF_TYPE.SIZE; i++) {
                buffMask[i] = true;
            }
            buffMask[BUFF_TYPE.CLONING] = false;
            entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent(buffMask));
            this.cfgUid_entity.set(this.configs["tower_1"].Uid, entity);
        }

        ////////////////////
        // мельница - сундук сокровищ
        ////////////////////

        // this.configs["treasure_chest"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Mill"));
        // // имя
        // ScriptUtils.SetValue(this.configs["treasure_chest"], "Name", "Мельница сокровищ");
        // // описание
        // ScriptUtils.SetValue(this.configs["treasure_chest"], "Description", "Увеличивает инком. Первая на 25%, вторая на 21.25%, третья на 18.06%");
        // // стоимость
        // ScriptUtils.SetValue(this.configs["treasure_chest"].CostResources, "Gold",   350);
        // ScriptUtils.SetValue(this.configs["treasure_chest"].CostResources, "Metal",  0);
        // ScriptUtils.SetValue(this.configs["treasure_chest"].CostResources, "Lumber", 500);
        // ScriptUtils.SetValue(this.configs["treasure_chest"].CostResources, "People", 0);
        // {
        //     var entity : Entity = new Entity();
        //     entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "treasure_chest"));
        //     entity.components.set(COMPONENT_TYPE.INCOME_INCREASE_COMPONENT, new IncomeIncreaseComponent());
        //     this.cfgUid_entity.set(this.configs["treasure_chest"].Uid, entity);
        // }

        ////////////////////
        // церковь - место для заклинаний и баффов
        ////////////////////
        
        // святой дух - атаки

        this.configs["holy_spirit_attack"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Raider"));
        // имя
        ScriptUtils.SetValue(this.configs["holy_spirit_attack"], "Name", "Святой дух атаки");
        // описание
        ScriptUtils.SetValue(this.configs["holy_spirit_attack"], "Description", "Тот кого ударит данный дух, получит его силу\n" +
            "Увеличение урона в 5 раз (макс 1 000)\n" +
            "Для дальнего боя:\n" +
            "Увеличение дальности атаки, видимости на 2 (макс 13)\n" +
            "Увеличение снарядов на 2 (макс 5)"
        );
        // здоровье
        ScriptUtils.SetValue(this.configs["holy_spirit_attack"], "MaxHealth", 1);
        // делаем урон = 0
        ScriptUtils.SetValue(this.configs["holy_spirit_attack"].MainArmament.BulletCombatParams, "Damage", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["holy_spirit_attack"], "TintColor", createHordeColor(150, 150, 0, 0));
        // время постройки
        ScriptUtils.SetValue(this.configs["holy_spirit_attack"], "ProductionTime", 1500);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "holy_spirit_attack"));
            entity.components.set(COMPONENT_TYPE.BUFF_COMPONENT, new BuffComponent(BUFF_TYPE.ATTACK));
            this.cfgUid_entity.set(this.configs["holy_spirit_attack"].Uid, entity);
        }

        // святой дух - меткости

        this.configs["holy_spirit_accuracy"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Raider"));
        // имя
        ScriptUtils.SetValue(this.configs["holy_spirit_accuracy"], "Name", "Святой дух меткости");
        // описание
        ScriptUtils.SetValue(this.configs["holy_spirit_accuracy"], "Description", "Тот кого ударит данный дух, получит его силу\n" +
            "Увеличение дальности видимости на 4 (макс 14)\n" +
            "Для дальнего боя:\n" +
            "Увеличение перезарядки в 2 раза\n" +
            "Увеличение дальности атаки в 2 раза\n" +
            "Увеличение скорости снаряда примерно в 3 раза\n"
        );
        // здоровье
        ScriptUtils.SetValue(this.configs["holy_spirit_accuracy"], "MaxHealth", 1);
        // делаем урон = 0
        ScriptUtils.SetValue(this.configs["holy_spirit_accuracy"].MainArmament.BulletCombatParams, "Damage", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["holy_spirit_accuracy"], "TintColor", createHordeColor(150, 148, 0, 211));
        // время постройки
        ScriptUtils.SetValue(this.configs["holy_spirit_accuracy"], "ProductionTime", 1500);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "holy_spirit_accuracy"));
            entity.components.set(COMPONENT_TYPE.BUFF_COMPONENT, new BuffComponent(BUFF_TYPE.ACCURACY));
            this.cfgUid_entity.set(this.configs["holy_spirit_accuracy"].Uid, entity);
        }

        // святой дух - здоровья

        this.configs["holy_spirit_health"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Raider"));
        // имя
        ScriptUtils.SetValue(this.configs["holy_spirit_health"], "Name", "Святой дух здоровья");
        // описание
        ScriptUtils.SetValue(this.configs["holy_spirit_health"], "Description", "Тот кого ударит данный дух, получит его силу.\n" +
            "Увеличение здоровья в 10 раз (макс 200 000)"
        );
        // здоровье
        ScriptUtils.SetValue(this.configs["holy_spirit_health"], "MaxHealth", 1);
        // делаем урон = 0
        ScriptUtils.SetValue(this.configs["holy_spirit_health"].MainArmament.BulletCombatParams, "Damage", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["holy_spirit_health"], "TintColor", createHordeColor(150, 0, 150, 0));
        // время постройки
        ScriptUtils.SetValue(this.configs["holy_spirit_health"], "ProductionTime", 1500);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "holy_spirit_health"));
            entity.components.set(COMPONENT_TYPE.BUFF_COMPONENT, new BuffComponent(BUFF_TYPE.HEALTH));
            this.cfgUid_entity.set(this.configs["holy_spirit_health"].Uid, entity);
        }

        // святой дух - защиты

        this.configs["holy_spirit_defense"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Raider"));
        // имя
        ScriptUtils.SetValue(this.configs["holy_spirit_defense"], "Name", "Святой дух защиты");
        // описание
        ScriptUtils.SetValue(this.configs["holy_spirit_defense"], "Description", "Тот кого ударит данный дух, получит его силу.\n" +
            "Увеличение защиты до max(390, текущая защита)\n" +
            "Увеличение здоровья в 2 раза\n" +
            "Имунн к огню, магии"
        );
        // здоровье
        ScriptUtils.SetValue(this.configs["holy_spirit_defense"], "MaxHealth", 1);
        // делаем урон = 0
        ScriptUtils.SetValue(this.configs["holy_spirit_defense"].MainArmament.BulletCombatParams, "Damage", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["holy_spirit_defense"], "TintColor", createHordeColor(150, 255, 215, 0));
        // время постройки
        ScriptUtils.SetValue(this.configs["holy_spirit_defense"], "ProductionTime", 1500);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "holy_spirit_defense"));
            entity.components.set(COMPONENT_TYPE.BUFF_COMPONENT, new BuffComponent(BUFF_TYPE.DEFFENSE));
            this.cfgUid_entity.set(this.configs["holy_spirit_defense"].Uid, entity);
        }

        // святой дух - клонирования

        this.configs["holy_spirit_cloning"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Raider"));
        // имя
        ScriptUtils.SetValue(this.configs["holy_spirit_cloning"], "Name", "Святой дух клонирования");
        // описание
        ScriptUtils.SetValue(this.configs["holy_spirit_cloning"], "Description", "Тот кого ударит данный дух, получит его силу.\n" +
            "Создание 12 клонов, которых нельзя баффать!"
        );
        // здоровье
        ScriptUtils.SetValue(this.configs["holy_spirit_cloning"], "MaxHealth", 1);
        // делаем урон = 0
        ScriptUtils.SetValue(this.configs["holy_spirit_cloning"].MainArmament.BulletCombatParams, "Damage", 0);
        // меняем цвет
        ScriptUtils.SetValue(this.configs["holy_spirit_cloning"], "TintColor", createHordeColor(150, 255, 255, 255));
        // время постройки
        ScriptUtils.SetValue(this.configs["holy_spirit_cloning"], "ProductionTime", 4000);
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "holy_spirit_cloning"));
            entity.components.set(COMPONENT_TYPE.BUFF_COMPONENT, new BuffComponent(BUFF_TYPE.CLONING));
            this.cfgUid_entity.set(this.configs["holy_spirit_cloning"].Uid, entity);
        }

        // здание

        this.configs["church"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Church"));
        // имя
        ScriptUtils.SetValue(this.configs["church"], "Name", "Церковь");
        // описание
        ScriptUtils.SetValue(this.configs["church"], "Description", "Святое место, позволяющее заполучить силу святых духов. Для вызова духа требуется хотя бы 1 свободная клетка вокруг церкви.");
        // стоимость
        ScriptUtils.SetValue(this.configs["church"].CostResources, "Gold",   500);
        ScriptUtils.SetValue(this.configs["church"].CostResources, "Metal",  0);
        ScriptUtils.SetValue(this.configs["church"].CostResources, "Lumber", 500);
        ScriptUtils.SetValue(this.configs["church"].CostResources, "People", 0);
        {
            // даем профессию найма юнитов
            CfgAddUnitProducer(this.configs["church"]);

            // очищаем список тренировки
            var producerParams = this.configs["church"].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();

            // добавляем святые духи
            produceList.Add(this.configs["holy_spirit_attack"]);
            produceList.Add(this.configs["holy_spirit_accuracy"]);
            produceList.Add(this.configs["holy_spirit_health"]);
            produceList.Add(this.configs["holy_spirit_defense"]);
            produceList.Add(this.configs["holy_spirit_cloning"]);
        }
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "church"));
            this.cfgUid_entity.set(this.configs["church"].Uid, entity);
        }

        ////////////////////
        // Алтарь героя
        ////////////////////
        
        // герой - лучник - unit_1
        // this.configs["hero_unit_1"] = HordeContentApi.CloneConfig(world.configs["unit_1"]);
        // {
        //     var entity : Entity = new Entity();
        //     entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "hero_altar"));
        //     entity.components.set(COMPONENT_TYPE.HERO_ALTAR_COMPONENT,
        //         new HeroAltarComponent(["unit_1", "unit_2"]));
        //     this.cfgUid_entity.set(this.configs["hero_altar"].Uid, entity);
        // }

        // // алтарь

        // // на UnitConfig_Slavyane_HeroAltar есть ограничение в 1 штуку, поэтому клонировать нельзя
        // this.configs["hero_altar"] = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_HeroAltar");
        // // имя
        // ScriptUtils.SetValue(this.configs["hero_altar"], "Name", "Алтарь героя");
        // // описание
        // ScriptUtils.SetValue(this.configs["hero_altar"], "Description", "Место, где можно создать уникального героя. Герой прокачивается за убийства. Героем можно управлять с помощью места сбора алтаря героя.");
        // // стоимость
        // ScriptUtils.SetValue(this.configs["hero_altar"].CostResources, "Gold",   300);
        // ScriptUtils.SetValue(this.configs["hero_altar"].CostResources, "Metal",  0);
        // ScriptUtils.SetValue(this.configs["hero_altar"].CostResources, "Lumber", 300);
        // ScriptUtils.SetValue(this.configs["hero_altar"].CostResources, "People", 0);
        // {
        //     var entity : Entity = new Entity();
        //     entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "hero_altar"));
        //     entity.components.set(COMPONENT_TYPE.HERO_ALTAR_COMPONENT,
        //         new HeroAltarComponent(["unit_1", "unit_2"]));
        //     this.cfgUid_entity.set(this.configs["hero_altar"].Uid, entity);
        // }

        ////////////////////
        // юнит для сброса таймера спавна
        ////////////////////

        // юнит-сброс таймера спавна
        this.configs["reset_spawn"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Swordmen"));
        // имя
        ScriptUtils.SetValue(this.configs["reset_spawn"], "Name", "Перезапустить найм");
        // описание
        ScriptUtils.SetValue(this.configs["reset_spawn"], "Description", "Перезапустить найм юнитов. Юниты будут наняты через обычное время с перезапуска.");
        // время постройки
        ScriptUtils.SetValue(this.configs["reset_spawn"], "ProductionTime", 5000);

        ////////////////////
        // рабочий
        ////////////////////

        this.configs["worker"] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Worker1"));
        // устанавливаем имя
        ScriptUtils.SetValue(this.configs["worker"], "Name", "Работяга");
        // удаляем команду атаки
        this.configs["worker"].AllowedCommands.Remove(UnitCommand.Attack);
        // здоровье
        ScriptUtils.SetValue(this.configs["worker"], "MaxHealth", 5000);
        // число людей
        ScriptUtils.SetValue(this.configs["worker"].CostResources, "People", 0);
        // добавляем иммун к огню
        ScriptUtils.SetValue(this.configs["worker"], "Flags", mergeFlags(UnitFlags, this.configs["worker"].Flags, UnitFlags.FireResistant));
        // убираем профессию добычу
        if (this.configs["worker"].ProfessionParams.ContainsKey(UnitProfession.Harvester)) {
            this.configs["worker"].ProfessionParams.Remove(UnitProfession.Harvester);
        }
        
        // добавляем постройки
        {
            var producerParams = this.configs["worker"].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();
            produceList.Add(this.configs["barrack_1"]);
            produceList.Add(this.configs["barrack_2"]);

            produceList.Add(this.configs["church"]);

            //produceList.Add(this.configs["tower_1"]);
            //produceList.Add(this.configs["hero_altar"]);
        }
        {
            var entity : Entity = new Entity();
            entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "worker"));
            entity.components.set(COMPONENT_TYPE.REVIVE_COMPONENT, new ReviveComponent(new Cell(0,0), 500, -1));
            this.cfgUid_entity.set(this.configs["worker"].Uid, entity);
        }

        ////////////////////
        // убираем дружественный огонь
        ////////////////////

        for (var cfgId in this.configs) {
            if (this.configs[cfgId].MainArmament) {
                //log.info(this.configs[cfgId].Name, " friend fire off, bullet = ", this.configs[cfgId].MainArmament.BulletConfig.Uid);
                var bulletCfg = HordeContentApi.GetBulletConfig(this.configs[cfgId].MainArmament.BulletConfig.Uid);
                ScriptUtils.SetValue(bulletCfg, "CanDamageAllied", false);
            }
        }

        ////////////////////
        // устанавливаем скорость юнитов
        ////////////////////

        /** скорость бега пехоты */
        var infantrySpeed = new Map<TileType, number>();
        infantrySpeed.set(TileType.Grass, 10);
        infantrySpeed.set(TileType.Forest, 6);
        infantrySpeed.set(TileType.Water, 0);
        infantrySpeed.set(TileType.Marsh, 7);
        infantrySpeed.set(TileType.Sand, 8);
        infantrySpeed.set(TileType.Mounts, 0);
        infantrySpeed.set(TileType.Road, 13);
        infantrySpeed.set(TileType.Ice, 10);

        var machineSpeed = new Map<TileType, number>();
        machineSpeed.set(TileType.Grass, 10);
        machineSpeed.set(TileType.Water, 0);
        machineSpeed.set(TileType.Marsh, 7);
        machineSpeed.set(TileType.Sand, 8);
        machineSpeed.set(TileType.Mounts, 0);
        machineSpeed.set(TileType.Road, 13);
        machineSpeed.set(TileType.Ice, 10);
        for (var cfgId in this.configs) {
            if (!this.configs[cfgId].Flags.HasFlag(UnitFlags.Building) &&
                !this.configs[cfgId].Specification.HasFlag(UnitSpecification.Rider)) {
                if (this.configs[cfgId].Specification.HasFlag(UnitSpecification.Machine)) {
                    CfgSetSpeed(this.configs[cfgId], machineSpeed);
                } else {
                    CfgSetSpeed(this.configs[cfgId], infantrySpeed);
                }
            }
        }

        ////////////////////
        // общие параметры для всех зданий
        ////////////////////
        
        for (var cfgId in this.configs) {
            // убираем захват
            if (this.configs[cfgId].ProfessionParams.ContainsKey(UnitProfession.Capturable)) {
                this.configs[cfgId].ProfessionParams.Remove(UnitProfession.Capturable);
            }
            // убираем требования
            this.configs[cfgId].TechConfig.Requirements.Clear();
            // убираем производство людей
            ScriptUtils.SetValue(this.configs[cfgId], "ProducedPeople", 0);
            // убираем налоги
            ScriptUtils.SetValue(this.configs[cfgId], "SalarySlots", 0);
            // здания
            if (this.configs[cfgId].Flags.HasFlag(UnitFlags.Building)) {
                // задаем количество здоровья
                if (cfgId != "castle" && cfgId != "tower_1") {
                    // здоровье
                    ScriptUtils.SetValue(this.configs[cfgId], "MaxHealth", 60000);
                    // броня
                    ScriptUtils.SetValue(this.configs[cfgId], "Shield", 0);
                }
                // настраиваем починку
                if (this.configs[cfgId].ProfessionParams.ContainsKey(UnitProfession.Reparable)) {
                    ScriptUtils.SetValue(this.configs[cfgId].ProfessionParams.Item.get(UnitProfession.Reparable).RecoverCost, "Gold",   0);
                    ScriptUtils.SetValue(this.configs[cfgId].ProfessionParams.Item.get(UnitProfession.Reparable).RecoverCost, "Metal",  0);
                    ScriptUtils.SetValue(this.configs[cfgId].ProfessionParams.Item.get(UnitProfession.Reparable).RecoverCost, "Lumber", 0);
                    ScriptUtils.SetValue(this.configs[cfgId].ProfessionParams.Item.get(UnitProfession.Reparable).RecoverCost, "People", 0);
                    ScriptUtils.SetValue(this.configs[cfgId].ProfessionParams.Item.get(UnitProfession.Reparable), "RecoverTime", 4000);
                }
            }
            // юниты
            else {
                // делаем 0-ую стоимость
                ScriptUtils.SetValue(this.configs[cfgId].CostResources, "Gold",   0);
                ScriptUtils.SetValue(this.configs[cfgId].CostResources, "Metal",  0);
                ScriptUtils.SetValue(this.configs[cfgId].CostResources, "Lumber", 0);
                ScriptUtils.SetValue(this.configs[cfgId].CostResources, "People", 0);
            }

            // проверяем наличие ECS сущности для конфига
            if (this.cfgUid_entity.has(this.configs[cfgId].Uid)) {
                var entity = this.cfgUid_entity.get(this.configs[cfgId].Uid) as Entity;

                // проверка, что нужно добавить профессию найма и сбросить список
                if (entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT) ||
                    entity.components.has(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) ||
                    entity.components.has(COMPONENT_TYPE.HERO_ALTAR_COMPONENT)) {
                    
                    // даем профессию найма юнитов
                    CfgAddUnitProducer(this.configs[cfgId]);

                    // очищаем список тренировки
                    var producerParams = this.configs[cfgId].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
                    var produceList    = producerParams.CanProduceList;
                    produceList.Clear();
                }

                // проверка, что это здание, которое спавнит мобов
                if (entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT)) {
                    var spawnBuildingComponent = entity.components.get(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT) as SpawnBuildingComponent;

                    // добавляем сброс таймера
                    var producerParams = this.configs[cfgId].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
                    var produceList    = producerParams.CanProduceList;
                    produceList.Add(this.configs["reset_spawn"]);

                    // время постройки
                    ScriptUtils.SetValue(this.configs[cfgId], "ProductionTime", 500);

                    // Добавляем в описание здание информацию о юните
                    var spawnUnitCfg = this.configs[spawnBuildingComponent.spawnUnitConfigId];
                    ScriptUtils.SetValue(this.configs[cfgId], "Description", this.configs[cfgId].Description + "Тренирует: " + 
                        spawnUnitCfg.Name + "\n" +
                        "  здоровье " + spawnUnitCfg.MaxHealth + "\n" +
                        "  броня " + spawnUnitCfg.Shield + "\n" +
                        "  атака " + spawnUnitCfg.MainArmament.BulletCombatParams.Damage + "\n" +
                        "  радиус атаки " + spawnUnitCfg.MainArmament.Range + "\n" +
                        "  скорость бега " + spawnUnitCfg.Speeds.Item(TileType.Grass) + "\n"
                        + (spawnUnitCfg.Flags.HasFlag(UnitFlags.FireResistant) || spawnUnitCfg.Flags.HasFlag(UnitFlags.MagicResistant)
                            ? "  иммунитет к " + (spawnUnitCfg.Flags.HasFlag(UnitFlags.FireResistant) ? "огню " : "") + 
                                (spawnUnitCfg.Flags.HasFlag(UnitFlags.MagicResistant) ? "магии " : "") + "\n"
                            : ""));
                }

                // проверка, что здание это алтарь героя
                if (entity.components.has(COMPONENT_TYPE.HERO_ALTAR_COMPONENT)) {
                    var heroAltarComponent = entity.components.get(COMPONENT_TYPE.HERO_ALTAR_COMPONENT) as HeroAltarComponent;

                    // добавляем героев на выбор
                    var producerParams = this.configs[cfgId].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
                    var produceList    = producerParams.CanProduceList;

                    for (var heroCfgId of heroAltarComponent.heroesCfgIdxs) {
                        produceList.Add(this.configs[heroCfgId]);
                    }
                }

                // проверка, что здание разово приносит доход
                if (entity.components.has(COMPONENT_TYPE.INCOME_EVENT)) {
                    var incomeComponent = entity.components.get(COMPONENT_TYPE.INCOME_EVENT) as IncomeEvent;
                    
                    ScriptUtils.SetValue(this.configs[cfgId], "Description", this.configs[cfgId].Description + "Разово дает " +
                        (incomeComponent.metal > 0 ? incomeComponent.metal + " железа" : "") +
                        (incomeComponent.gold > 0 ? incomeComponent.gold + " золота" : "") +
                        (incomeComponent.lumber > 0 ? incomeComponent.lumber + " дерева" : "") +
                        (incomeComponent.people > 0 ? incomeComponent.people + " людей" : "") + "\n");
                }

                // проверка, что здание увеличивает инком
                if (entity.components.has(COMPONENT_TYPE.INCOME_INCREASE_EVENT)) {
                    var incomeComponent = entity.components.get(COMPONENT_TYPE.INCOME_INCREASE_EVENT) as IncomeIncreaseEvent;
                    
                    ScriptUtils.SetValue(this.configs[cfgId], "Description", this.configs[cfgId].Description + "Увеличивает доход на " +
                        (incomeComponent.metal > 0 ? incomeComponent.metal + " железа" : "") +
                        (incomeComponent.gold > 0 ? incomeComponent.gold + " золота" : "") +
                        (incomeComponent.lumber > 0 ? incomeComponent.lumber + " дерева" : "") + "\n");
                }
            }
        }

        // рекурсивно создаем дерево исследования
        var recurciveUpgradeInfoFlag : Map<string, boolean> = new Map<string, boolean>();
        const recurciveUpgradeInfoStr = (cfgId: string, shiftStr: string) => {
            if (recurciveUpgradeInfoFlag.has(cfgId)) {
                return "";
            } else {
                recurciveUpgradeInfoFlag.set(cfgId, true);
            }

            var resStr = "";
            if (this.cfgUid_entity.has(this.configs[cfgId].Uid)) {
                var entity = this.cfgUid_entity.get(this.configs[cfgId].Uid) as Entity;
                if (entity.components.has(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT)) {
                    var upgradableBuildingComponent = entity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as UpgradableBuildingComponent;    
                    for (var num = 0; num < upgradableBuildingComponent.upgradeCfgIds.length; num++) {
                        var upgradeCfgId     = upgradableBuildingComponent.upgradeCfgIds[num];
                        var upgradeUnitCfgId = upgradableBuildingComponent.upgradeUnitCfgIds[num];     

                        resStr += shiftStr + this.configs[upgradeCfgId].Name + "\n";
                        var res2Str = recurciveUpgradeInfoStr(upgradeCfgId, shiftStr + "    ");
                        if (res2Str != "") {
                            resStr += res2Str;
                        }

                        // на основе переданного конфига в компоненте создаем новый
                        // и заменяем старый на новый
                        var newUpgradeUnitCfgId = cfgId + "_to_" + upgradeCfgId;
                        this.configs[newUpgradeUnitCfgId] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig(upgradeUnitCfgId));
                        upgradeUnitCfgId = newUpgradeUnitCfgId;
                        upgradableBuildingComponent.upgradeUnitCfgIds[num] = newUpgradeUnitCfgId;
                        // имя
                        ScriptUtils.SetValue(this.configs[upgradeUnitCfgId], "Name", "Улучшить до " + this.configs[upgradeCfgId].Name);
                        // описание
                        ScriptUtils.SetValue(this.configs[upgradeUnitCfgId], "Description", this.configs[upgradeCfgId].Description);
                        // стоимость
                        ScriptUtils.SetValue(this.configs[upgradeUnitCfgId].CostResources, "Gold",   this.configs[upgradeCfgId].CostResources.Gold);
                        ScriptUtils.SetValue(this.configs[upgradeUnitCfgId].CostResources, "Metal",  this.configs[upgradeCfgId].CostResources.Metal);
                        ScriptUtils.SetValue(this.configs[upgradeUnitCfgId].CostResources, "Lumber", this.configs[upgradeCfgId].CostResources.Lumber);
                        ScriptUtils.SetValue(this.configs[upgradeUnitCfgId].CostResources, "People", this.configs[upgradeCfgId].CostResources.People);
                        // убираем требования
                        this.configs[upgradeUnitCfgId].TechConfig.Requirements.Clear();
                        // ставим долгую постройку
                        ScriptUtils.SetValue(this.configs[upgradeUnitCfgId], "ProductionTime", 500);
                        
                        // добавляем конфиг улучшения
                        var producerParams = this.configs[cfgId].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
                        var produceList    = producerParams.CanProduceList;
                        produceList.Add(this.configs[upgradeUnitCfgId]);
                    }
                    ScriptUtils.SetValue(this.configs[cfgId], "Description", this.configs[cfgId].Description + "\nМожно улучшить до " + resStr);
                }
            }
            return resStr;
        };
        for (var cfgId in this.configs) {
            recurciveUpgradeInfoStr(cfgId, "");
        }
    }

    private _InitSettlements () {
        for (var playerId = 0; playerId < Players.length; playerId++) {
            var realPlayer    = Players[playerId].GetRealPlayer();
            var settlement    = realPlayer.GetRealSettlement();
            var settlementId  = settlement.Uid;

            if (isReplayMode() && !realPlayer.IsReplay) {
                continue;
            }

            // проверяем, что это игрок
            if (settlementId >= this.settlementsCount) {
                continue;
            }

            // если поселение неинициализировано, то инициализируем
            if (this.settlements[settlementId] == null) {
                this.settlements[settlementId] = settlement;

                // создаем сущность для поселения
                {
                    // полное количество дерева на игрока
                    var totalLumberPerPlayer = 4800;
                    // время за которое будет выдано все дерево
                    var totalLumberTime      = 50*60*20;

                    // полное количество золото которое должно быть выдано к определенному моменту времени
                    var goldPerPlayer   = 3600;
                    // время к которому должно быть выдано столько золота
                    var goldTime        = totalLumberTime * 1.5;

                    var entity = new Entity();
                    entity.components.set(COMPONENT_TYPE.SETTLEMENT_COMPONENT, new SettlementComponent(0, 100, 0, goldTime / goldPerPlayer * 100, 0));
                    entity.components.set(COMPONENT_TYPE.INCOME_EVENT, new IncomeEvent(0, 0, 5000 - totalLumberPerPlayer, 1));
                    entity.components.set(COMPONENT_TYPE.INCOME_LIMITED_PERIODICAL_COMPONENT,
                        new IncomeLimitedPeriodicalComponent(0, 0, totalLumberPerPlayer, 0, 0, 100, totalLumberTime / totalLumberPerPlayer * 100, 0))
                    this.settlements_entities[settlementId].push(entity);
                }

                // Отключить прирост населения
                let censusModel = ScriptUtils.GetValue(settlement.Census, "Model");
                censusModel.PeopleIncomeLevels.Clear();
                censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevelT(0, 0, -1));
                censusModel.LastPeopleIncomeLevel = 0;
            }

            // создаем сущность для рабочего для каждого игрока
            for (var workerNum = 0; workerNum < this.settlements_workers_reviveCells[settlementId].length; workerNum++) 
            {
                var baseEntity = this.cfgUid_entity.get(this.configs["worker"].Uid) as Entity;
                var entity     = baseEntity.Clone();
                var reviveComponent   = entity.components.get(COMPONENT_TYPE.REVIVE_COMPONENT) as ReviveComponent;
                reviveComponent.cell = this.settlements_workers_reviveCells[settlementId][workerNum];
                reviveComponent.waitingToRevive = true;
                this.settlements_entities[settlementId].push(entity);
            }
        }

        for (var settlementId = 0; settlementId < this.settlementsCount; settlementId++) {
            if (this.settlements[settlementId] == null) {
                continue;
            }

            var that = this;
            // добавляем обработчик создания юнитов
            this.unitProducedCallbacks[settlementId] =
                this.settlements[settlementId].Units.UnitProduced.connect(function (sender, UnitProducedEventArgs) {
                    try {
                        // создаем событие - постройку юнита
                        var event_entity = new Entity();
                        event_entity.components.set(COMPONENT_TYPE.UNIT_PRODUCED_EVENT, new UnitProducedEvent(UnitProducedEventArgs.ProducerUnit, UnitProducedEventArgs.Unit));
                        that.settlements_entities[UnitProducedEventArgs.ProducerUnit.Owner.Uid].push(event_entity);
                    } catch (ex) {
                        log.exception(ex);
                    }
                });

            // удаляем лишних юнитов на карте
            var units = this.settlements[settlementId].Units;
            var enumerator = units.GetEnumerator();
            while(enumerator.MoveNext()) {
                var battleMind = enumerator.Current.BattleMind;
                battleMind.InstantDeath(null, UnitDeathType.Mele);
                break;
            }
            enumerator.Dispose();

            // заполняем таблицу альянсов
            for (var other_settlementId = 0; other_settlementId < this.settlementsCount; other_settlementId++) {
                if (other_settlementId == settlementId) {
                    this.settlements_settlements_warFlag[settlementId][other_settlementId] = false;
                } else {
                    this.settlements_settlements_warFlag[settlementId][other_settlementId]
                        = this.settlements[settlementId].Diplomacy.IsWarStatus(this.settlements[other_settlementId]);
                }
            }

            // убираем налоги
            var censusModel = ScriptUtils.GetValue(this.settlements[settlementId].Census, "Model");
            // Установить период сбора налогов и выплаты жалования (чтобы отключить сбор, необходимо установить 0)
            censusModel.TaxAndSalaryUpdatePeriod = 0;

            // объявляем войну 16 игроку
            //this.settlements[settlementId].Diplomacy.DeclareWar(other_settlement);
            //other_settlement.Diplomacy.DeclareWar(this.settlements[settlementId]);
        }

        // for (var settlementId = 0; settlementId < this.settlementsCount; settlementId++) {
        //     logi(settlementId);
        //     for (var other_settlementId = 0; other_settlementId < this.settlementsCount; other_settlementId++) {
        //         logi(other_settlementId, " ", this.settlements_settlements_warFlag[settlementId][other_settlementId]);
        //     }
        //     logi("\n");
        // }
    }

    private _PlaceCastle() {
        var unitsMap        = this.realScena.UnitsMap;

        for (var settlementId = 0; settlementId < this.settlementsCount; settlementId++) {
            // проверяем, что поселение в игре
            if (!this.settlements[settlementId]) {
                continue;
            }

            var castleUnit = unitsMap.GetUpperUnit(this.settlements_castle_cell[settlementId].X, this.settlements_castle_cell[settlementId].Y);
            if (castleUnit) {
                this.settlements_castleUnit[settlementId] = castleUnit;                    
            } else {
                this.settlements_castleUnit[settlementId] = spawnUnit(
                    this.settlements[settlementId],
                    this.configs["castle"],
                    createPoint(this.settlements_castle_cell[settlementId].X, this.settlements_castle_cell[settlementId].Y),
                    UnitDirection.Down
                );
            }
        }
    }

    public IsSettlementInGame (settlementId: number) {
        return this.settlements[settlementId] &&
            this.settlements_castleUnit[settlementId] &&
            !this.settlements_castleUnit[settlementId].IsDead;
    }

    /** загеристрировать систему */
    public RegisterSystem(system_func: (world: World, gameTickNum: number)=>void, system_name: string) {
        this.systems_func.push(system_func);
        this.systems_name.push(system_name);
        this.systems_executionTime.push(0.0);
    }

    /** запустить следующую систему */
    public RunSystems(gameTickNum: number) {
        var systemId = gameTickNum % Math.max(50, this.systems_func.length);
        if (this.systems_func.length <= systemId) {
            return;
        }

        var time : number = getCurrentTime();

        this.systems_func[systemId](this, gameTickNum);
        
        time = getCurrentTime() - time;
        this.systems_executionTime[systemId] += time;
    }

    /** вывести статистику времени выполнения */
    public PrintTimeStat() {
        var statStr : string = "";
        for (var settlementId = 0; settlementId < this.settlementsCount; settlementId++) {
            statStr += "settlement " + settlementId + ", entities " + this.settlements_entities[settlementId].length + "\n";
        }
        for (var systemId = 0; systemId < this.systems_func.length; systemId++) {
            statStr += systemId + " " + this.systems_name[systemId] + " : " + this.systems_executionTime[systemId] + " milliseconds\n";
        }
        log.info(statStr);
    }

    /**
     * зарегистрировать в мире сущность для юнита, также идет автозаполнение компонентов в зависимости от поселения
     * @param unit юнит для которого нужно зарегистрировать сущность
     * @param baseEntity базовая сущность, на основе которого будет создана новая (если нет, то берется по умолчанию)
     * @returns вернет ссылку на сущность юнита
     */
    public RegisterUnitEntity(unit: any, baseEntity?: Entity) {
        var settlementId = unit.Owner.Uid;

        // создаем сущность
        var newEntity : Entity;

        if (baseEntity == undefined) {
            baseEntity = world.cfgUid_entity.get(unit.Cfg.Uid) as Entity;
        }
        newEntity = baseEntity.Clone();

        // настройка
        if (newEntity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
            var newEntity_unitComponent = newEntity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            newEntity_unitComponent.unit = unit;
        }

        // если это здание, то запрещаем самоуничтожение
        if (unit.Cfg.IsBuilding) {
            var commandsMind       = unit.CommandsMind;
            var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");
            disallowedCommands.Add(UnitCommand.DestroySelf, 1);
        }
        
        // регистрируем сущность
        world.settlements_entities[settlementId].push(newEntity);

        return newEntity;
    }
};
