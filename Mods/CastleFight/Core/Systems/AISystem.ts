import { log } from "library/common/logging";
import { World } from "../World";
import { PointCommandArgs, ProduceAtCommandArgs, ProduceCommandArgs, UnitCommand } from "library/game-logic/horde-types";
import { createPoint, createResourcesAmount } from "library/common/primitives";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { generateCellInSpiral } from "library/common/position-tools";
import { Cell, distance_Chebyshev } from "../Utils";
import { IConfig, OpCfgUidToCfg, OpCfgUidToEntity } from "../Configs/IConfig";
import { Config_Church } from "../Configs/Church/Config_Church";
import { Config_Worker } from "../Configs/Config_Worker";
import { BUFF_TYPE, BuffOptTargetType, BuffableComponent } from "../Components/BuffableComponent";
import { BuffComponent } from "../Components/BuffComponent";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { ReviveComponent } from "../Components/ReviveComponent";
import { SpawnBuildingComponent } from "../Components/SpawnBuildingComponent";
import { UnitComponent } from "../Components/UnitComponent";
import { UnitProducedEvent } from "../Components/UnitProducedEvent";
import { UpgradableBuildingComponent } from "../Components/UpgradableBuildingComponent";
import { Entity } from "../Entity";
import { Config_MercenaryCamp } from "../Configs/Mercenary/Config_MercenaryCamp";
import { IncomeLimitedPeriodicalComponent } from "../Components/IncomeLimitedPeriodicalComponent";
import { Config_Mercenary_Archer } from "../Configs/Mercenary/Config_Mercenary_Archer";
import { Config_Mercenary_Archer_2 } from "../Configs/Mercenary/Config_Mercenary_Archer_2";
import { Config_Mercenary_Heavymen } from "../Configs/Mercenary/Config_Mercenary_Heavymen";
import { Config_Mercenary_Raider } from "../Configs/Mercenary/Config_Mercenary_Raider";
import { Config_Mercenary_Swordmen } from "../Configs/Mercenary/Config_Mercenary_Swordmen";
import { Config_Holy_spirit_accuracy } from "../Configs/Church/Config_Holy_spirit_accuracy";
import { Config_Holy_spirit_attack } from "../Configs/Church/Config_Holy_spirit_attack";
import { Config_Holy_spirit_cloning } from "../Configs/Church/Config_Holy_spirit_cloning";
import { Config_Holy_spirit_defense } from "../Configs/Church/Config_Holy_spirit_defense";
import { Config_Holy_spirit_health } from "../Configs/Church/Config_Holy_spirit_health";

export const ResourcesAmount = HCL.HordeClassLibrary.World.Simple.ResourcesAmount;

class BotUnitType {
    config : typeof IConfig;
    attackType : BuffOptTargetType;

    constructor(config : typeof IConfig, unitAttackType : BuffOptTargetType) {
        this.config     = config;
        this.attackType = unitAttackType;
    }
}

class BotBuildingType {
    /** ид конфиг строения */
    cfgUid: string;
    /** полная стоимость создания данного здания с нуля */
    totalCost: any;
    /** стоимость улучшения до текущего от предыдущего */
    upgradeCost: any;
    /** номер предыдущего строения в дереве улучшений */
    upgradePrevBuildingId: number;
    
    /** тип атаки юнита спавнующего */
    spawnedUnitAttackType: BuffOptTargetType;

    constructor(cfgUid: string, totalCost: any, upgradeCost: any, upgradePrevBuildingId: number, spawnedUnitAttackType: BuffOptTargetType) {
        this.cfgUid                = cfgUid;
        this.totalCost             = totalCost;
        this.upgradeCost           = upgradeCost;
        this.upgradePrevBuildingId = upgradePrevBuildingId;
        this.spawnedUnitAttackType = spawnedUnitAttackType;
    }
};

enum BotLogLevel {
    Debug   = 0,
    Info    = 1,
    Warning = 2,
    Error   = 3
}

enum BotBuildState {
    AccMoney = 0,
    Place,
    Build,
    Upgrade
}

class IBot {
    static LogLevel: BotLogLevel = BotLogLevel.Debug;
    static TestBuildingCfg: any  = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Test_Building");

    static Buildings            : Array<BotBuildingType>;
    static op_unitCfgId_buildingId : Map<string, number>;

    static Church_buildingId    : number = 0;
    static Church_spirits_unit  : Array<BotUnitType>;
    
    static Mercenary_buildingId : number = 0;
    static Mercenary_units      : Array<BotUnitType>;

    static Init(world: World) {
        this.Buildings = new Array<BotBuildingType>();
        this.op_unitCfgId_buildingId = new Map<string, number>();
    
        const recurciveGetUnitInfo = (cfgId: string, shiftStr: string, accGold: number, accMetal: number, accLumber: number, accPeople: number) => {
            var Uid : string = OpCfgUidToCfg[cfgId].Uid;
            if (!OpCfgUidToEntity.has(Uid)) {
                return;
            }
            var entity = OpCfgUidToEntity.get(Uid) as Entity;
    
            // проверяем, что здание спавнит юнитов
            if (!entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT)) {
                return;
            }
            var spawnBuildingComponent = entity.components.get(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT) as SpawnBuildingComponent;
    
            // информация о юните который спавнится
    
            this.op_unitCfgId_buildingId.set(spawnBuildingComponent.spawnUnitConfigUid, this.Buildings.length);
    
            // обновляем накопленную стоимость здания
            
            var CostResources = OpCfgUidToCfg[cfgId].CostResources;
            accGold   += CostResources.Gold;
            accMetal  += CostResources.Metal;
            accLumber += CostResources.Lumber;
            accPeople += CostResources.People;
    
            // сохраняем
    
            var currentUnitId = this.Buildings.length;
    
            this.Buildings.push(new BotBuildingType(
                cfgId,
                createResourcesAmount(
                    accGold,
                    accMetal,
                    accLumber,
                    accPeople
                ),
                CostResources,
                -1,
                OpCfgUidToCfg[spawnBuildingComponent.spawnUnitConfigUid].MainArmament.Range > 1 ? BuffOptTargetType.Range : BuffOptTargetType.Melle
            ));
    
            // идем по улучшению вглубь
    
            if (!entity.components.has(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT)) {
                return;
            }
            var upgradableBuildingComponent = entity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as 
                UpgradableBuildingComponent;
            
            for (var nextCfgId of upgradableBuildingComponent.upgradesCfgUid) {
                recurciveGetUnitInfo(nextCfgId, shiftStr + "\t", accGold, accMetal, accLumber, accPeople);
    
                for (var i = currentUnitId + 1; i < this.Buildings.length; i++) {
                    if (this.Buildings[i].cfgUid == nextCfgId) {
                        this.Buildings[i].upgradePrevBuildingId = currentUnitId;
                    }
                }
            }
        };
    
        var producerParams = OpCfgUidToCfg[Config_Worker.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        for (var i = 0; i < produceList.Count; i++) {
            var produceUnit = produceList.Item.get(i);
            if (!OpCfgUidToEntity.has(produceUnit.Uid)) {
                continue;
            }
    
            var entity = OpCfgUidToEntity.get(produceUnit.Uid) as Entity;
    
            if (!entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT)) {
                continue;
            }
    
            var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            recurciveGetUnitInfo(unitComponent.cfgUid, "", 0, 0, 0, 0);
        }
    
        // добавляем церковь
    
        this.Church_buildingId = this.Buildings.length;
        this.Buildings.push(new BotBuildingType(
            Config_Church.CfgUid,
            OpCfgUidToCfg[Config_Church.CfgUid].CostResources,
            createResourcesAmount(0, 0, 0, 0),
            -1,
            BuffOptTargetType.All
        ));
    
        this.Church_spirits_unit = new Array<BotUnitType>();
        this.Church_spirits_unit.push(new BotUnitType(Config_Holy_spirit_accuracy, BuffableComponent.BuffsOptTarget[BUFF_TYPE.ACCURACY]));
        this.Church_spirits_unit.push(new BotUnitType(Config_Holy_spirit_attack,   BuffableComponent.BuffsOptTarget[BUFF_TYPE.ATTACK]));
        this.Church_spirits_unit.push(new BotUnitType(Config_Holy_spirit_cloning,  BuffableComponent.BuffsOptTarget[BUFF_TYPE.CLONING]));
        this.Church_spirits_unit.push(new BotUnitType(Config_Holy_spirit_defense,  BuffableComponent.BuffsOptTarget[BUFF_TYPE.DEFFENSE]));
        this.Church_spirits_unit.push(new BotUnitType(Config_Holy_spirit_health,   BuffableComponent.BuffsOptTarget[BUFF_TYPE.HEALTH]));
    
        // добавляем лагерь наемников
    
        this.Mercenary_buildingId = this.Buildings.length;
        this.Buildings.push(new BotBuildingType(
            Config_MercenaryCamp.CfgUid,
            OpCfgUidToCfg[Config_MercenaryCamp.CfgUid].CostResources,
            createResourcesAmount(0, 0, 0, 0),
            -1,
            BuffOptTargetType.All
        ));
    
        this.Mercenary_units = new Array<BotUnitType>();
        this.Mercenary_units.push(new BotUnitType(Config_Mercenary_Archer,   BuffOptTargetType.Range));
        this.Mercenary_units.push(new BotUnitType(Config_Mercenary_Archer_2, BuffOptTargetType.Range));
        this.Mercenary_units.push(new BotUnitType(Config_Mercenary_Heavymen, BuffOptTargetType.Melle));
        this.Mercenary_units.push(new BotUnitType(Config_Mercenary_Raider,   BuffOptTargetType.Melle));
        this.Mercenary_units.push(new BotUnitType(Config_Mercenary_Swordmen, BuffOptTargetType.Melle));
    }

    /** поселение */
    settlementId: number;
    /** имя бота */
    name: string;
    /** сущность поселения */
    settlement_entity: Entity;
    /** сущности рабочих */
    workers_entity: Array<Entity>;
    /** юниты церквей */
    churchs_unit: Array<any>;
    /** юниты лагерей наемников */
    mercenaries_unit: Array<any>;

    constructor(settlementId: number, name: string) {
        this.settlementId      = settlementId;
        this.name              = name;
        this._building_goal_Id = -1;
        this.churchs_unit      = new Array<any>();
        this.mercenaries_unit  = new Array<any>();
    }

    world: World;
    gameTickNum: number;

    public run(world: World, gameTickNum: number) : void {
        this.world       = world;
        this.gameTickNum = gameTickNum;

        // создаем ссылку на поселение

        if (!this.settlement_entity) {
            for (var i = 0; i < this.world.settlements_entities[this.settlementId].length; i++) {
                var entity = this.world.settlements_entities[this.settlementId][i];
                if (entity.components.has(COMPONENT_TYPE.SETTLEMENT_COMPONENT)) {
                    this.settlement_entity = entity;
                    break;
                }
            }
        }
        
        // создаем ссылки на рабочих

        if (!this.workers_entity) {
            this.workers_entity = new Array<Entity>(this.world.scena.settlements_workers_reviveCells[this.settlementId].length);
            var workerNum = 0;
            for (var i = 0; i < this.world.settlements_entities[this.settlementId].length && workerNum < this.workers_entity.length; i++) {
                var entity = this.world.settlements_entities[this.settlementId][i];

                if (!entity.components.has(COMPONENT_TYPE.REVIVE_COMPONENT)) {
                    continue;
                }

                if (!entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                    continue;
                }

                var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                
                if (unitComponent.cfgUid == Config_Worker.CfgUid) {
                    this.workers_entity[workerNum++] = entity;
                }
            }
        }

        // логика церквей

        this._church_logic();

        // логика духов

        this._spirits_logic();

        // логика лагеря наёмников

        this._mercenary_logic();

        // если ничего не строится или пока идет улучшение здания, можно чинить окружающие здания
        
        if (this._building_goal_Id == -1 ||
            this._buildingState == BotBuildState.AccMoney ||
            this._buildingState == BotBuildState.Upgrade) {
            this._repairBuilding();
        }

        // выбираем, строим следующее здание

        if (this._building_goal_Id == -1) {
            this._selectNextBuilding();
        } else {
            this._buildNextBuilding();
        }
    }

    // заглужки - виртуальные функции

    protected _selectNextBuilding(): void { };
    protected _selectNextSpiritNum(): number { return 0; };
    protected _selectSpiritsTargets(spirits_entity: Array<Entity>, spirits_targetUnitComponent: Array<UnitComponent>): void { return; }
    protected _selectNextMercenaryUnitNum(): number { return 0; }

    /** целевое строение */
    private _building_goal_Id: number;
    /** состояние постройки */
    private _buildingState: BotBuildState;
    /** текущая рассматриваемая постройка (через это можно улучшить существующее здание) */
    private _building_curr_unit: any;
    private _building_cell : Cell | null;
    private _building_curr_baseEntity: Entity | null;
    private _building_curr_id: number | null;
    private _building_next_id: number | null;

    protected _setNextBuilding(building_goal_Id: number, building_unit: any = null): void {
        this._building_goal_Id = building_goal_Id;

        if (building_unit) {
            this._building_curr_unit = building_unit;
            this._buildingState      = BotBuildState.Upgrade;

            // инициализируем ид постройки

            this._building_next_id = this._building_goal_Id
            this._building_curr_id = this._building_goal_Id;
            while (OpCfgUidToCfg[IBot.Buildings[this._building_curr_id].cfgUid].Uid != this._building_curr_unit.Cfg.Uid) {
                this._building_next_id = this._building_curr_id;
                this._building_curr_id = IBot.Buildings[this._building_curr_id].upgradePrevBuildingId;
            }

            // инициализируем точку постройку

            this._building_cell = new Cell(this._building_curr_unit.Cell.X, this._building_curr_unit.producedUnit.Cell.Y);
        } else {
            this._buildingState      = BotBuildState.AccMoney;
        }
    };

    private _buildClear() {
        this._building_goal_Id = -1;
        this._building_curr_unit = null;

        this._building_cell = null;
        this._building_curr_baseEntity = null;
        this._building_curr_id = null;
        this._building_next_id = null;
    }

    private _buildNextBuilding(): void {
        switch (this._buildingState) {
            case BotBuildState.AccMoney:
                this.Log(BotLogLevel.Debug, "State = AccMoney");
                this._accMoney();
            break;
            case BotBuildState.Place:
                this.Log(BotLogLevel.Debug, "State = Place");
                this._placeBuilding();
            break;
            case BotBuildState.Build:
                this.Log(BotLogLevel.Debug, "State = Build");
                this._buildBuilding();
            break;
            case BotBuildState.Upgrade:
                this.Log(BotLogLevel.Debug, "State = Upgrade");
                this._upgradeBuilding();
            break;
        }
    }

    private _accMoney(): void {
        // инициализируем ид постройки

        if (this._building_curr_id == null) {
            var nextId = this._building_goal_Id;
            var prevId = IBot.Buildings[nextId].upgradePrevBuildingId;
            while (prevId != -1) {
                nextId = prevId;
                prevId = IBot.Buildings[nextId].upgradePrevBuildingId;
            }
            this._building_curr_id = nextId;

            this.Log(BotLogLevel.Debug, "до целевого здания нужно построить [" + this._building_curr_id + "] = " + OpCfgUidToCfg[IBot.Buildings[this._building_curr_id].cfgUid].Name);
        }

        // проверка, что хватает денег на размещение здания
        
        if (IBot.Buildings[this._building_curr_id].totalCost.Gold <= this.world.settlements[this.settlementId].Resources.Gold &&
            IBot.Buildings[this._building_curr_id].totalCost.Metal <= this.world.settlements[this.settlementId].Resources.Metal &&
            IBot.Buildings[this._building_curr_id].totalCost.Lumber <= this.world.settlements[this.settlementId].Resources.Lumber &&
            IBot.Buildings[this._building_curr_id].totalCost.People <= this.world.settlements[this.settlementId].Resources.FreePeople) {
            this._buildingState = BotBuildState.Place;
            this.Log(BotLogLevel.Debug, "накопили денег, можно устанавливать здание");
        }
    }

    private _placeBuilding(): void {
        if (this._building_curr_id == null) {
            this.Log(BotLogLevel.Error, "_placeBuilding:_building_curr_id = null = " + this._building_curr_id);
            return;
        }

        // проверяем, что любой рабочий строит нужное здание, иначе отдаем приказ

        for (var i = 0; i < this.workers_entity.length; i++) {
            var unitComponent = this.workers_entity[i].components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

            if (unitComponent.unit.IsDead) {
                continue;
            }

            // проверка, что рабочий не занят
            if (!unitComponent.unit.OrdersMind.IsIdle()) {
                continue;
            }

            // проверка, что рабочий ничего не строит
            if (unitComponent.unit.OrdersMind.ActiveAct.GetType().Name == "ActProduce") {
                break;
            }

            // размещаем здание вокруг точки спавна рабочего
            var reviveComponent = this.workers_entity[i].components.get(COMPONENT_TYPE.REVIVE_COMPONENT) as ReviveComponent;
            var config    = OpCfgUidToCfg[IBot.Buildings[this._building_curr_id].cfgUid];
            var generator = generateCellInSpiral(reviveComponent.cell.X, reviveComponent.cell.Y);
            for (var cell = generator.next(); !cell.done; cell = generator.next()) {
                if (IBot.TestBuildingCfg.CanBePlacedByRealMap(this.world.realScena, cell.value.X, cell.value.Y)) {
                    // делаем так, чтобы инженер не отвлекался, когда строит (убираем реакцию на инстинкты)
                    unitComponent.unit.OrdersMind.AssignSmartOrder(unitComponent.unit.Cell, AssignOrderMode.Replace, 100000);

                    var produceAtCommandArgs = new ProduceAtCommandArgs(AssignOrderMode.Queue, config, createPoint(cell.value.X + 1, cell.value.Y + 1));
                    unitComponent.unit.Cfg.GetOrderDelegate(unitComponent.unit, produceAtCommandArgs);

                    this.Log(BotLogLevel.Debug, "рабочему отдан приказ построить " + config.Name + " в ячейке " + (cell.value.X + 1) + ", " + (cell.value.Y + 1));

                    break;
                }
            }
            
            break;
        }

        // мониторим события постройки, чтобы выбрать нужное здание
        // и перейти к следующему этапу

        for (var i = this.world.settlements_entities[this.settlementId].length - 1; i >= 0; i--) {
            var entity = this.world.settlements_entities[this.settlementId][i] as Entity;
            if (!entity.components.has(COMPONENT_TYPE.UNIT_PRODUCED_EVENT)) {
                continue;
            }

            var unitProducedEvent = entity.components.get(COMPONENT_TYPE.UNIT_PRODUCED_EVENT) as UnitProducedEvent;

            if (unitProducedEvent.producedUnit.Cfg.Uid != OpCfgUidToCfg[IBot.Buildings[this._building_curr_id].cfgUid].Uid) {
                continue;
            }

            this._building_curr_unit = unitProducedEvent.producedUnit;
            this._building_cell      = new Cell(unitProducedEvent.producedUnit.Cell.X, unitProducedEvent.producedUnit.Cell.Y);
            this._buildingState      = BotBuildState.Build;
            this.Log(BotLogLevel.Debug, "здание успешно размещено");

            break;
        }
    }

    private _buildBuilding(): void {
        // проверяем не уничтожили ли здание, тогда прерываем постройку

        if (this._building_curr_unit.IsDead) {
            this.Log(BotLogLevel.Debug, "строящееся здание уничтожили, переходим к новой стратегии");
            this._buildClear();
            
            return;
        }

        // здание еще строится

        if (this._building_curr_unit.EffectsMind.BuildingInProgress) {
            this.Log(BotLogLevel.Debug, "здание еще строится");

            // проверяем, что есть рабочий, что строит наше здание

            var currentWorker = -1;
            for (var i = 0; i < this.workers_entity.length; i++) {
                var unitComponent = this.workers_entity[i].components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

                if (unitComponent.unit.IsDead) {
                    continue;
                }

                this.Log(BotLogLevel.Debug, "рабочий не мертв");
                if (!unitComponent.unit.OrdersMind.ActiveOrder.ProductUnit) {
                    continue;
                }

                this.Log(BotLogLevel.Debug, "рабочий строит Id " + unitComponent.unit.OrdersMind.ActiveOrder.ProductUnit.Id + " (а нужно " + this._building_curr_unit.Id + ") Name " + unitComponent.unit.OrdersMind.ActiveOrder.ProductUnit.Cfg.Name);
                if (unitComponent.unit.OrdersMind.ActiveOrder.ProductUnit.Id != this._building_curr_unit.Id) {
                    continue;
                }

                currentWorker = i;
                this.Log(BotLogLevel.Debug, "есть рабочий который строит здание");
                break;
            }

            // никто не строит наше здание, ищем свободного рабочего и посылаем его строить

            if (currentWorker == -1) {
                this.Log(BotLogLevel.Debug, "нету рабочего который строит здание");
                for (var i = 0; i < this.workers_entity.length; i++) {
                    var unitComponent = this.workers_entity[i].components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

                    if (unitComponent.unit.IsDead) {
                        continue;
                    }

                    if (!unitComponent.unit.OrdersMind.IsIdle()) {
                        continue;
                    }

                    var pointCommandArgs = new PointCommandArgs(
                        createPoint(this._building_curr_unit.Cell.X, this._building_curr_unit.Cell.Y),
                        UnitCommand.Build, AssignOrderMode.Queue); // Repair???
                    unitComponent.unit.Cfg.GetOrderDelegate(unitComponent.unit, pointCommandArgs);

                    this.Log(BotLogLevel.Debug, "нашли рабочего, отправляем достраивать");

                    break;
                }
            }
        } else {
            if (this._building_goal_Id == this._building_curr_id) {
                // если это церковь, то запоминаем её ид

                if (this._building_goal_Id == IBot.Church_buildingId) {
                    this.churchs_unit.push(this._building_curr_unit);
                } else if (this._building_goal_Id == IBot.Mercenary_buildingId) {
                    this.mercenaries_unit.push(this._building_curr_unit);
                }

                this._buildClear();
                this.Log(BotLogLevel.Debug, "здание достроилось, стратегия выполнена");
            } else {
                this._buildingState      = BotBuildState.Upgrade;
                this.Log(BotLogLevel.Debug, "здание достроилось, переходим к улучшению");
            }
        }
    }

    private _upgradeBuilding(): void {
        if (this._building_cell == null) {
            this.Log(BotLogLevel.Error, "_building_cell = null");
            return;
        }
        if (this._building_curr_id == null) {
            this.Log(BotLogLevel.Error, "_building_curr_id = null");
            return;
        }

        // инициализируем ид следующей постройки

        if (this._building_next_id == null) {
            var nextId = this._building_goal_Id;
            var prevId = IBot.Buildings[nextId].upgradePrevBuildingId;
            while (prevId != this._building_curr_id) {
                nextId = prevId;
                prevId = IBot.Buildings[nextId].upgradePrevBuildingId;
            }
            this._building_next_id = nextId;
        }

        // инициализируем базовую сущность

        if (this._building_curr_baseEntity == null) {
            this._building_curr_baseEntity = OpCfgUidToEntity.get(OpCfgUidToCfg[IBot.Buildings[this._building_curr_id].cfgUid].Uid) as Entity;
        }

        // если ссылка на юнит здания нет, тогда оно в процессе улучшения

        if (!this._building_curr_unit) {
            // выделяем юнита в ячейке
            this._building_curr_unit = this.world.realScena.UnitsMap.GetUpperUnit(createPoint(this._building_cell.X, this._building_cell.Y));

            // если здания нет или это не здание, тогда прерываем постройку
            if (!this._building_curr_unit || !this._building_curr_unit.Cfg.IsBuilding) {
                this.Log(BotLogLevel.Debug, "улучшаемое здание уничтожили (" + this._building_cell.X + ", " + this._building_cell.Y + "), переходим к новой стратегии");
                this._buildClear();

                return;
            }

            // проверяем, что это наше улучшенное здание

            if (this._building_curr_unit.Cfg.Uid != OpCfgUidToCfg[IBot.Buildings[this._building_next_id].cfgUid].Uid) {
                this._building_curr_unit = null;

                return;
            }

            // здание улучшилось

            if (this._building_next_id == this._building_goal_Id) {
                this._buildClear();
                this.Log(BotLogLevel.Debug, "стратегия успешно выполнена, переходим к следующей");
                return;
            }

            // обновляем информацию о этапах улучшения

            this._building_curr_baseEntity = null;
            this._building_curr_id     = this._building_next_id;
            this._building_next_id     = null;
            
            return;
        }

        // проверяем хватает ли денег на улучшение

        if (IBot.Buildings[this._building_next_id].upgradeCost.Gold <= this.world.settlements[this.settlementId].Resources.Gold &&
            IBot.Buildings[this._building_next_id].upgradeCost.Metal <= this.world.settlements[this.settlementId].Resources.Metal &&
            IBot.Buildings[this._building_next_id].upgradeCost.Lumber <= this.world.settlements[this.settlementId].Resources.Lumber &&
            IBot.Buildings[this._building_next_id].upgradeCost.People <= this.world.settlements[this.settlementId].Resources.FreePeople
        ) {
            // улучшаем

            var upgradableBuildingComponent = this._building_curr_baseEntity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as UpgradableBuildingComponent;

            var i = 0;
            for (i = 0; i < upgradableBuildingComponent.upgradesCfgUid.length; i++) {
                if (upgradableBuildingComponent.upgradesCfgUid[i] == IBot.Buildings[this._building_next_id].cfgUid) {
                    break;
                }
            }

            this.Log(BotLogLevel.Debug, "улучшение i = " + i + " < " + upgradableBuildingComponent.upgradesCfgUid.length);

            var produceCommandArgs = new ProduceCommandArgs(AssignOrderMode.Queue, OpCfgUidToCfg[UpgradableBuildingComponent.GetUpgradeCfgUid(upgradableBuildingComponent.upgradesCfgUid[i])], 1);
            this._building_curr_unit.Cfg.GetOrderDelegate(this._building_curr_unit, produceCommandArgs);

            this._building_curr_unit = null;
        }
    }

    private _repairBuilding(): void {
        // ищем постройки, которые нужно чинить

        var brokenBuildings_unit : Array<any> = [];

        for (var i = 0; i < this.world.settlements_entities[this.settlementId].length; i++) {
            var entity : Entity = this.world.settlements_entities[this.settlementId][i];

            if (!entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                continue;
            }

            var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

            if (!unitComponent.unit.Cfg.IsBuilding) {
                continue;
            }

            if (!OpCfgUidToCfg[unitComponent.cfgUid].ProfessionParams.ContainsKey(UnitProfession.Reparable)) {
                continue;
            }

            // проверяем, что нужна починка

            if (unitComponent.unit.Health > 0.9*unitComponent.unit.Cfg.MaxHealth) {
                continue;
            }

            brokenBuildings_unit.push(unitComponent.unit);
        }

        // проверяем, что есть что чинить

        if (brokenBuildings_unit.length == 0) {
            return;
        }

        // свободным рабочим приказываем чинить ближайшие постройки

        for (var i = 0; i < this.workers_entity.length; i++) {
            var unitComponent = this.workers_entity[i].components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

            if (unitComponent.unit.IsDead) {
                continue;
            }

            if (!unitComponent.unit.OrdersMind.IsIdle()) {
                continue;
            }

            // ищем ближайшее поломанное здание
            
            var nearBuilding_num = -1;
            var nearBuilding_distance = 10000.0;
            for (var j = 0; j < brokenBuildings_unit.length; j++) {
                var distance = distance_Chebyshev(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y,
                    brokenBuildings_unit[j].Cell.X, brokenBuildings_unit[j].Cell.Y
                );

                if (nearBuilding_distance > distance) {
                    nearBuilding_num = j;
                }
            }

            if (nearBuilding_num == -1) {
                continue;
            }

            // отправляем чинить

            var pointCommandArgs = new PointCommandArgs(
                createPoint(brokenBuildings_unit[nearBuilding_num].Cell.X, brokenBuildings_unit[nearBuilding_num].Cell.Y),
                UnitCommand.Repair, AssignOrderMode.Queue);
            unitComponent.unit.Cfg.GetOrderDelegate(unitComponent.unit, pointCommandArgs);
        }
    }

    private _church_logic(): void {
        // удаляем уничтоженные церкви

        for (var i = 0; i < this.churchs_unit.length; i++) {
            if (this.churchs_unit[i].IsDead) {
                this.churchs_unit.splice(i--, 1);
            }
        }

        // заказываем духов

        for (var i = 0; i < this.churchs_unit.length; i++) {
            // проверяем, что церковь ничего не делает
            if (!this.churchs_unit[i].OrdersMind.IsIdle()) {
                continue;
            }

            // выбираем следующего духа
            var nextSpiritNum = this._selectNextSpiritNum();

            this.Log(BotLogLevel.Debug, "бот выбрал следующего духа [" + nextSpiritNum + "] = " +
                IBot.Church_spirits_unit[nextSpiritNum].config.CfgUid + ", name = " + OpCfgUidToCfg[IBot.Church_spirits_unit[nextSpiritNum].config.CfgUid].Name
            );

            // строим следующего духа
            var produceCommandArgs = new ProduceCommandArgs(AssignOrderMode.Queue, OpCfgUidToCfg[IBot.Church_spirits_unit[nextSpiritNum].config.CfgUid], 1);
            this.churchs_unit[i].Cfg.GetOrderDelegate(this.churchs_unit[i], produceCommandArgs);
        }
    }

    private _spirits_logic(): void {
        // ищем духов

        var spirits_entity                                     = new Array<Entity>();
        var spirits_targetUnitComponent : Array<UnitComponent> = new Array<UnitComponent>();

        for (var i = 0; i < this.world.settlements_entities[this.settlementId].length; i++) {
            var entity = this.world.settlements_entities[this.settlementId][i] as Entity;

            // только у духов есть данный компонент
            if (!entity.components.has(COMPONENT_TYPE.BUFF_COMPONENT)) {
                continue;
            }

            spirits_entity.push(entity);            
        }

        if (spirits_entity.length == 0) {
            return;
        }

        this._selectSpiritsTargets(spirits_entity, spirits_targetUnitComponent);

        // если цели не выбраны, то пропускаем

        if (spirits_targetUnitComponent.length == 0) {
            return;
        }

        for (var i = 0; i < spirits_targetUnitComponent.length; i++) {
            var unitComponent = spirits_entity[i].components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

            // даем команды
            var pointCommandArgs = new PointCommandArgs(createPoint(spirits_targetUnitComponent[i].unit.Cell.X, spirits_targetUnitComponent[i].unit.Cell.Y), UnitCommand.Attack, AssignOrderMode.Replace);
            unitComponent.unit.Cfg.GetOrderDelegate(unitComponent.unit, pointCommandArgs);
        }
    }

    private _mercenary_logic(): void {
        // удаляем уничтоженные лагеря

        for (var i = 0; i < this.mercenaries_unit.length; i++) {
            if (this.mercenaries_unit[i].IsDead) {
                this.mercenaries_unit.splice(i--, 1);
            }
        }

        // заказываем духов

        for (var i = 0; i < this.mercenaries_unit.length; i++) {
            // проверяем, что лагерь ничего не делает
            if (!this.mercenaries_unit[i].OrdersMind.IsIdle()) {
                continue;
            }

            // выбираем следующего наемника
            var nextMercenaryUnitNum = this._selectNextMercenaryUnitNum();

            this.Log(BotLogLevel.Debug,
                "бот выбрал следующего наемника [" + nextMercenaryUnitNum + "] = " + IBot.Mercenary_units[nextMercenaryUnitNum].config.CfgUid +
                ", name = " + OpCfgUidToCfg[IBot.Mercenary_units[nextMercenaryUnitNum].config.CfgUid].Name
            );

            // строим следующего духа
            var produceCommandArgs = new ProduceCommandArgs(AssignOrderMode.Queue, OpCfgUidToCfg[IBot.Mercenary_units[nextMercenaryUnitNum].config.CfgUid], 1);
            this.mercenaries_unit[i].Cfg.GetOrderDelegate(this.mercenaries_unit[i], produceCommandArgs);
        }
    }

    Log(level: BotLogLevel, message: string) {
        if (IBot.LogLevel > level) {
            return;
        }

        let logMessage = "(" + this.settlementId + "): " + message;

        switch (level) {
            case BotLogLevel.Debug:
                log.info(logMessage);
                break;
            case BotLogLevel.Info:
                log.info(logMessage);
                break;
            case BotLogLevel.Warning:
                log.warning(logMessage);
                break;
            case BotLogLevel.Error:
                log.error(logMessage);
                break;
        }
    }
    static Debug(message: string): void {
        log.info(BotLogLevel.Debug, message);
    }
    static Info(message: string): void {
        log.info(BotLogLevel.Info, message);
    }
    static Warning(message: string): void {
        log.info(BotLogLevel.Warning, message);
    }
    static Error(message: string): void {
        log.info(BotLogLevel.Error, message);
    }
};

class RandomBot extends IBot {
    // Рандомизатор
    rnd : any;
    // номер текущей постройки
    buildingCurrNum: number;
    // номера зданий, который строит бот
    allowBuildingsId: Array<number>;
    
    constructor(settlementId: number) {
        super(settlementId, "Рандомный");

        this.rnd                = ActiveScena.GetRealScena().Context.Randomizer;
        this.buildingCurrNum    = 0;
        this.allowBuildingsId       = new Array<number>(IBot.Buildings.length);
        for (var i = 0; i < IBot.Buildings.length; i++) {
            this.allowBuildingsId[i] = i;
        }
    }

    protected _selectNextBuilding(): void {
        // вычисляем сколько есть дерева на покупку
        var totalLumber = this.world.settlements[this.settlementId].Resources.Lumber;
        if (this.settlement_entity.components.has(COMPONENT_TYPE.INCOME_LIMITED_PERIODICAL_COMPONENT)) {
            var incomeComponent = this.settlement_entity.components.get(COMPONENT_TYPE.INCOME_LIMITED_PERIODICAL_COMPONENT) as IncomeLimitedPeriodicalComponent;
            totalLumber += incomeComponent.totalLumber;
        }
        
        // делаем фильтр кого может купить
        var buildingsIdx = this.allowBuildingsId.filter((buildingId) => {
            if (buildingId == IBot.Church_buildingId) {
                // церковь одна и не раньше 6-ого здания
                if (this.churchs_unit.length > 0 || this.buildingCurrNum <= 6) {
                    return false;
                }
            } else if (buildingId == IBot.Mercenary_buildingId) {
                // лагерь наемников один
                if (this.mercenaries_unit.length > 0) {
                    return false;
                }
            }

            return IBot.Buildings[buildingId].totalCost.Lumber <= totalLumber;
        });

        // здания, которые требуют дерево
        var lumberBuildingsIdx = buildingsIdx.filter((buildingId) => {
            return IBot.Buildings[buildingId].totalCost.Lumber > 0;
        });

        // если остались здания, которые можно купить за дерево, то удаляем лагерь наемников
        if (lumberBuildingsIdx.length > 0) {
            for (var i = 0; i < buildingsIdx.length; i++) {
                if (buildingsIdx[i] == IBot.Mercenary_buildingId) {
                    buildingsIdx.splice(i--, 1);
                    break;
                }
            }
        }

        // никого не можем купить
        if (buildingsIdx.length == 0) {
            return;
        }

        this.buildingCurrNum++;
        var goal_buildingId : number;

        // строим церковь на 11 здание, если ранее не строили и в списке разрешенных
        if (this.buildingCurrNum == 11
            && this.churchs_unit.length == 0
            && buildingsIdx.find((buildingId) => buildingId == IBot.Church_buildingId) != undefined) {
            goal_buildingId = IBot.Church_buildingId;
        } else {
            goal_buildingId = buildingsIdx[this.rnd.RandomNumber(0, buildingsIdx.length - 1)];
        }
                
        this._setNextBuilding(goal_buildingId);
        this.Log(BotLogLevel.Debug, "Random bot выбрал следующую (" + this.buildingCurrNum + ") постройку " + OpCfgUidToCfg[IBot.Buildings[goal_buildingId].cfgUid].Name);
    }

    protected _selectNextSpiritNum(): number {
        return this.rnd.RandomNumber(0, IBot.Church_spirits_unit.length - 1);
    }

    protected _selectNextMercenaryUnitNum(): any {
        return this.rnd.RandomNumber(0, IBot.Mercenary_units.length - 1);
    }

    protected _selectSpiritsTargets(spirits_entity: Array<Entity>, spirits_targetUnitComponent: Array<UnitComponent>): void {
        // ищем возможные цели

        class TargetInfo {
            entityId: number;
            power: number;

            constructor (entityId: number, power: number) {
                this.entityId       = entityId;
                this.power          = power;
            }
        };

        var possibleTargetsEntityId = new Array<TargetInfo>();

        for (var i = 0; i < this.world.settlements_entities[this.settlementId].length; i++) {
            var entity = this.world.settlements_entities[this.settlementId][i];

            if (!entity.components.has(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT)) {
                continue;
            }
            if (!entity.components.has(COMPONENT_TYPE.BUFFABLE_COMPONENT)) {
                continue;
            }
            if ((entity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent).buffType != BUFF_TYPE.EMPTY) {
                continue;
            }

            var buildingId = IBot.op_unitCfgId_buildingId.get((entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent).cfgUid) as number;

            possibleTargetsEntityId.push(new TargetInfo(i,
                IBot.Buildings[buildingId].totalCost.Gold + 
                IBot.Buildings[buildingId].totalCost.Metal + 
                IBot.Buildings[buildingId].totalCost.Lumber));
        }

        // сортируем по силе

        possibleTargetsEntityId.sort((a: TargetInfo, b: TargetInfo) => {
            return b.power - a.power;
        });

        // баффаем рандомно первые топ 40% сильнейших

        for (var i = 0; i < spirits_entity.length; i++) {
            if (possibleTargetsEntityId.length == 0) {
                return;
            }

            var buffComponent     = spirits_entity[i].components.get(COMPONENT_TYPE.BUFF_COMPONENT) as BuffComponent;
            var buffOptTargetType = BuffableComponent.BuffsOptTarget[buffComponent.buffType];

            for (var j = 0; j < 4; j++) {
                var targetId      = this.rnd.RandomNumber(0, Math.floor(0.4*possibleTargetsEntityId.length));
                var targetInfo    = possibleTargetsEntityId[targetId];
                
                var unitComponent = this.world.settlements_entities[this.settlementId][targetInfo.entityId].components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                var unitType      = OpCfgUidToCfg[unitComponent.cfgUid].MainArmament.Range > 1 ? BuffOptTargetType.Range : BuffOptTargetType.Melle;

                if (buffOptTargetType == BuffOptTargetType.All || j == 3 || buffOptTargetType == unitType) {
                    spirits_targetUnitComponent.push(unitComponent);
                    possibleTargetsEntityId.splice(targetId, 1);
                    break;
                }
            }
        }
    }
};

class RandomBotWithoutChurch extends RandomBot {
    constructor(settlementId: number) {
        super(settlementId);

        this.name = "Рандомный без церкви";
        this.allowBuildingsId.splice(this.allowBuildingsId.findIndex((buildingId) => buildingId == IBot.Church_buildingId), 1);
    }
};

class RandomBotMelle extends RandomBot {
    constructor(settlementId: number) {
        super(settlementId);

        this.name              = "Рандомный только ближники";
        this.allowBuildingsId = this.allowBuildingsId.filter(buildingId => {
            return IBot.Buildings[buildingId].spawnedUnitAttackType != BuffOptTargetType.Range;
        });
    }
};

class RandomBotRange extends RandomBot {
    constructor(settlementId: number) {
        super(settlementId);

        this.name              = "Рандомный только дальники";
        this.allowBuildingsId = this.allowBuildingsId.filter(buildingId => {
            return IBot.Buildings[buildingId].spawnedUnitAttackType != BuffOptTargetType.Melle;
        });
    }
};

/** для каждого поселения хранит бота */
var settlements_bot : Array<IBot>;

export function AI_Init(world: World) {
    // инициализируем все возможные планы строительства

    IBot.Init(world);

    // инициализируем ботов

    settlements_bot = new Array<IBot>(world.scena.settlementsCount);

    // for (let player of Players) {
    //     let realPlayer = player.GetRealPlayer();
    //     if (!realPlayer.IsBot) {
    //         continue;
    //     }
    //     var characterUid  = realPlayer.MasterMind.Character.Uid;
    //     var settlement    = realPlayer.GetRealSettlement();
    //     var settlementId  = settlement.Uid;
    //     if (settlementId < world.scena.settlementsCount) {
    //         if (!settlements_bot[settlementId]) {
    //             if (characterUid == "#CastleFight_MindCharacter_Random_WithChurch") {
    //                 settlements_bot[settlementId] = new RandomBot(settlementId);
    //             } else if (characterUid == "#CastleFight_MindCharacter_Random_Melle") {
    //                 settlements_bot[settlementId] = new RandomBotMelle(settlementId);
    //             } else if (characterUid == "#CastleFight_MindCharacter_Random_Range") {
    //                 settlements_bot[settlementId] = new RandomBotRange(settlementId);
    //             } else  {
    //                 settlements_bot[settlementId] = new RandomBotWithoutChurch(settlementId);
    //             }

    //             log.info("settlement = ", settlementId, " attach bot = ", settlements_bot[settlementId].name, " characterUid = ", characterUid);
    //         }
    //     }
    // }

    settlements_bot[0] = new RandomBot(0);
    settlements_bot[1] = new RandomBotMelle(1);
    settlements_bot[2] = new RandomBotRange(2);
    settlements_bot[3] = new RandomBotWithoutChurch(3);
    settlements_bot[4] = new RandomBot(4);
    settlements_bot[5] = new RandomBot(5);
}

export function AI_System(world: World, gameTickNum: number) {
    if (!settlements_bot) {
       AI_Init(world);
    }

    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId) || !settlements_bot[settlementId]) {
            continue;
        }

        settlements_bot[settlementId].run(world, gameTickNum);
    }
}