import { log } from "library/common/logging";
import { World } from "../World";
import { PointCommandArgs, ProduceAtCommandArgs, ProduceCommandArgs, UnitCommand } from "library/game-logic/horde-types";
import { BuffComponent, BuffOptTargetType, BuffsOptTarget, COMPONENT_TYPE, Entity, ReviveComponent, SpawnBuildingComponent, UnitComponent, UnitProducedEvent, UpgradableBuildingComponent } from "../Components/ESC_components";
import { createPoint, createResourcesAmount } from "library/common/primitives";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { generateCellInSpiral } from "library/common/position-tools";
import { Cell, distance_Chebyshev } from "../Utils";
import { OpCfgUidToCfg, OpCfgUidToEntity } from "../Configs/IConfig";
import { Config_Church } from "../Configs/Church/Config_Church";
import { Config_Worker } from "../Configs/Config_Worker";

export const ResourcesAmount = HCL.HordeClassLibrary.World.Simple.ResourcesAmount;

var Church_buildingId : number = 0;

class Building {
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
    static LogLevel: BotLogLevel = BotLogLevel.Error;
    static TestBuildingCfg: any  = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Test_Building");

    /** поселение */
    settlementId: number;
    /** имя бота */
    name: string;
    /** возможные строения */
    buildings: Array<Building>;
    /** возможные духи */
    spiritsCfgId: Array<string>;
    /** оператор перевода unitCfgId в id строения в котором спавнится юнит */
    op_unitCfgId_buildingId: Map<string, number>;

    /** сущности рабочих */
    workers_entity: Array<Entity>;

    /** юниты церквей */
    churchs_unit: Array<any>;

    constructor(settlementId: number, name: string, buildings: Array<Building>, spiritsCfgId: Array<string>, op_unitCfgId_buildingId: Map<string, number>) {
        this.settlementId = settlementId;
        this.name         = name;
        this.buildings    = buildings;
        this.spiritsCfgId = spiritsCfgId;
        this.op_unitCfgId_buildingId = op_unitCfgId_buildingId;

        this._building_goal_Id  = -1;

        this.churchs_unit = new Array<any>();
    }

    world: World;
    gameTickNum: number;

    public run(world: World, gameTickNum: number) : void {
        this.world       = world;
        this.gameTickNum = gameTickNum;

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

        // если ничего не строится или пока идет улучшение здания, можно чинить окружающие здания
        
        if (this._building_goal_Id == -1 ||
            this._buildingState == BotBuildState.AccMoney ||
            this._buildingState == BotBuildState.Upgrade) {
            this._repairBuilding();
        }

        // выбираем, строим следующее здание

        if (this._building_goal_Id == -1) {
            if (this.world.settlements[this.settlementId].Resources.Lumber > 0) {
                this._selectNextBuilding();
            }
        } else {
            this._buildNextBuilding();
        }
    }

    // заглужки - виртуальные функции

    protected _selectNextBuilding(): void { };
    protected _selectNextSpiritNum(): number { return 0; };
    protected _selectSpiritsTargets(spirits_entity: Array<Entity>, spirits_targetUnitComponent: Array<UnitComponent>): void { return; }

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
            while (OpCfgUidToCfg[this.buildings[this._building_curr_id].cfgUid].Uid != this._building_curr_unit.Cfg.Uid) {
                this._building_next_id = this._building_curr_id;
                this._building_curr_id = this.buildings[this._building_curr_id].upgradePrevBuildingId;
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
            var prevId = this.buildings[nextId].upgradePrevBuildingId;
            while (prevId != -1) {
                nextId = prevId;
                prevId = this.buildings[nextId].upgradePrevBuildingId;
            }
            this._building_curr_id = nextId;

            this.Log(BotLogLevel.Debug, "до целевого здания нужно построить [" + this._building_curr_id + "] = " + OpCfgUidToCfg[this.buildings[this._building_curr_id].cfgUid].Name);
        }

        // проверка, что хватает денег на размещение здания
        
        if (this.buildings[this._building_curr_id].totalCost.Gold <= this.world.settlements[this.settlementId].Resources.Gold &&
            this.buildings[this._building_curr_id].totalCost.Metal <= this.world.settlements[this.settlementId].Resources.Metal &&
            this.buildings[this._building_curr_id].totalCost.Lumber <= this.world.settlements[this.settlementId].Resources.Lumber &&
            this.buildings[this._building_curr_id].totalCost.People <= this.world.settlements[this.settlementId].Resources.FreePeople) {
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
            var config    = OpCfgUidToCfg[this.buildings[this._building_curr_id].cfgUid];
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

            if (unitProducedEvent.producedUnit.Cfg.Uid != OpCfgUidToCfg[this.buildings[this._building_curr_id].cfgUid].Uid) {
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

                if (this._building_goal_Id == Church_buildingId) {
                    this.churchs_unit.push(this._building_curr_unit);
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
            var prevId = this.buildings[nextId].upgradePrevBuildingId;
            while (prevId != this._building_curr_id) {
                nextId = prevId;
                prevId = this.buildings[nextId].upgradePrevBuildingId;
            }
            this._building_next_id = nextId;
        }

        // инициализируем базовую сущность

        if (this._building_curr_baseEntity == null) {
            this._building_curr_baseEntity = OpCfgUidToEntity.get(OpCfgUidToCfg[this.buildings[this._building_curr_id].cfgUid].Uid) as Entity;
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

            if (this._building_curr_unit.Cfg.Uid != OpCfgUidToCfg[this.buildings[this._building_next_id].cfgUid].Uid) {
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

        if (this.buildings[this._building_next_id].upgradeCost.Gold <= this.world.settlements[this.settlementId].Resources.Gold &&
            this.buildings[this._building_next_id].upgradeCost.Metal <= this.world.settlements[this.settlementId].Resources.Metal &&
            this.buildings[this._building_next_id].upgradeCost.Lumber <= this.world.settlements[this.settlementId].Resources.Lumber &&
            this.buildings[this._building_next_id].upgradeCost.People <= this.world.settlements[this.settlementId].Resources.FreePeople
        ) {
            // улучшаем

            var upgradableBuildingComponent = this._building_curr_baseEntity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as UpgradableBuildingComponent;

            var i = 0;
            for (i = 0; i < upgradableBuildingComponent.upgradesCfgUid.length; i++) {
                if (upgradableBuildingComponent.upgradesCfgUid[i] == this.buildings[this._building_next_id].cfgUid) {
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
                this.spiritsCfgId[nextSpiritNum] + ", name = " + OpCfgUidToCfg[this.spiritsCfgId[nextSpiritNum]].Name
            );

            // строим следующего духа
            var produceCommandArgs = new ProduceCommandArgs(AssignOrderMode.Queue, OpCfgUidToCfg[this.spiritsCfgId[nextSpiritNum]], 1);
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
    // флаг, что церковь построена
    church_isBuilding: boolean;
    // номер текущей постройки
    buildingCurrNum: number;
    // номер постройки когда нужно построить церковь
    church_planBuildingNum: number;
    // номера зданий, который строит бот
    allowBuildingsId: Array<number>;
    
    constructor(settlementId: number, buildings: Array<Building>, spiritsCfgId: Array<string>, op_unitCfgId_buildingId: Map<string, number>) {
        super(settlementId, "Рандомный", buildings, spiritsCfgId, op_unitCfgId_buildingId);

        this.rnd                = ActiveScena.GetRealScena().Context.Randomizer;
        this.church_isBuilding  = false;
        this.buildingCurrNum    = 0;
        this.church_planBuildingNum = this.rnd.RandomNumber(7, 11);
        this.allowBuildingsId       = new Array<number>(buildings.length);
        for (var i = 0; i < buildings.length; i++) {
            this.allowBuildingsId[i] = i;
        }
    }

    protected _selectNextBuilding(): void {
        this.buildingCurrNum++;

        var goal_buildingId : number;
        
        while (true) {
            if (!this.church_isBuilding && this.buildingCurrNum == this.church_planBuildingNum) {
                goal_buildingId = Church_buildingId;
            } else {
                goal_buildingId = this.allowBuildingsId[this.rnd.RandomNumber(0, this.allowBuildingsId.length - 1)];
            }

            if (goal_buildingId == Church_buildingId) {
                // церковь строим одну и не раньше 6 здания
                if (this.buildingCurrNum <= 6 || this.church_isBuilding == true) {
                    continue;
                } else {
                    this.church_isBuilding = true;
                }
            }

            break;
        }
        
        this._setNextBuilding(goal_buildingId);
        this.Log(BotLogLevel.Debug, "Random bot выбрал следующую постройку " + OpCfgUidToCfg[this.buildings[goal_buildingId].cfgUid].Name);
    }

    protected _selectNextSpiritNum(): number {
        return this.rnd.RandomNumber(0, this.spiritsCfgId.length - 1);
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

            var buildingId = this.op_unitCfgId_buildingId.get((entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent).cfgUid) as number;

            possibleTargetsEntityId.push(new TargetInfo(i,
                this.buildings[buildingId].totalCost.Gold + 
                this.buildings[buildingId].totalCost.Metal + 
                this.buildings[buildingId].totalCost.Lumber));
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
            var buffOptTargetType = BuffsOptTarget[buffComponent.buffType];

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
    constructor(settlementId: number, buildings: Array<Building>, spiritsCfgId: Array<string>, op_unitCfgId_buildingId: Map<string, number>) {
        super(settlementId, buildings, spiritsCfgId, op_unitCfgId_buildingId);

        this.name = "Рандомный без церкви";

        this.church_isBuilding = true;
        for (var i = 0; i < this.allowBuildingsId.length; i++) {
            var buildingId = this.allowBuildingsId[i];
            if (this.buildings[buildingId].cfgUid == "church") {
                this.allowBuildingsId.splice(i--, 1);
                break;
            }
        }
    }
};

class RandomBotMelle extends RandomBot {
    constructor(settlementId: number, buildings: Array<Building>, spiritsCfgId: Array<string>, op_unitCfgId_buildingId: Map<string, number>) {
        super(settlementId, buildings, spiritsCfgId, op_unitCfgId_buildingId);

        this.name              = "Рандомный только ближники";
        this.church_isBuilding = true;
        for (var i = 0; i < this.allowBuildingsId.length; i++) {
            var buildingId = this.allowBuildingsId[i];
            if (this.buildings[buildingId].spawnedUnitAttackType != BuffOptTargetType.Melle) {
                this.allowBuildingsId.splice(i--, 1);
            }
        }
    }
};

class RandomBotRange extends RandomBot {
    constructor(settlementId: number, buildings: Array<Building>, spiritsCfgId: Array<string>, op_unitCfgId_buildingId: Map<string, number>) {
        super(settlementId, buildings, spiritsCfgId, op_unitCfgId_buildingId);

        this.name              = "Рандомный только дальники";
        this.church_isBuilding = true;
        for (var i = 0; i < this.allowBuildingsId.length; i++) {
            var buildingId = this.allowBuildingsId[i];
            if (this.buildings[buildingId].spawnedUnitAttackType != BuffOptTargetType.Range) {
                this.allowBuildingsId.splice(i--, 1);
            }
        }
    }
};

/** для каждого поселения хранит бота */
var settlements_bot : Array<IBot>;

export function AI_Init(world: World) {
    // инициализируем все возможные планы строительства

    var buildings = new Array<Building>();
    var op_unitCfgId_buildingId = new Map<string, number>();

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

        op_unitCfgId_buildingId.set(spawnBuildingComponent.spawnUnitConfigUid, buildings.length);

        // обновляем накопленную стоимость здания
        
        var CostResources = OpCfgUidToCfg[cfgId].CostResources;
        accGold   += CostResources.Gold;
        accMetal  += CostResources.Metal;
        accLumber += CostResources.Lumber;
        accPeople += CostResources.People;

        // сохраняем

        var currentUnitId = buildings.length;

        buildings.push(new Building(
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

            for (var i = currentUnitId + 1; i < buildings.length; i++) {
                if (buildings[i].cfgUid == nextCfgId) {
                    buildings[i].upgradePrevBuildingId = currentUnitId;
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

    Church_buildingId = buildings.length;

    buildings.push(new Building(
        Config_Church.CfgUid,
        OpCfgUidToCfg[Config_Church.CfgUid].CostResources,
        createResourcesAmount(0, 0, 0, 0),
        -1,
        BuffOptTargetType.All
    ));

    var spiritsCfgId = new Array<string>();
    var producerParams = OpCfgUidToCfg[Config_Church.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
    var produceList    = producerParams.CanProduceList;
    for (var i = 0; i < produceList.Count; i++) {
        var produceUnit = produceList.Item.get(i);
        if (!OpCfgUidToEntity.has(produceUnit.Uid)) {
            continue;
        }
        var entity = OpCfgUidToEntity.get(produceUnit.Uid) as Entity;

        if (!entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
            continue;
        }
        if (!entity.components.has(COMPONENT_TYPE.BUFF_COMPONENT)) {
            continue;
        }

        var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

        spiritsCfgId.push(unitComponent.cfgUid);
    }

    // инициализируем ботов

    settlements_bot = new Array<IBot>(world.scena.settlementsCount);

    for (let player of Players) {
        let realPlayer = player.GetRealPlayer();
        if (!realPlayer.IsBot) {
            continue;
        }
        var characterUid  = realPlayer.MasterMind.Character.Uid;
        var settlement    = realPlayer.GetRealSettlement();
        var settlementId  = settlement.Uid;
        if (settlementId < world.scena.settlementsCount) {
            if (!settlements_bot[settlementId]) {
                if (characterUid == "#CastleFight_MindCharacter_Random_WithChurch") {
                    settlements_bot[settlementId] = new RandomBot(settlementId, buildings, spiritsCfgId, op_unitCfgId_buildingId);
                } else if (characterUid == "#CastleFight_MindCharacter_Random_Melle") {
                    settlements_bot[settlementId] = new RandomBotMelle(settlementId, buildings, spiritsCfgId, op_unitCfgId_buildingId);
                } else if (characterUid == "#CastleFight_MindCharacter_Random_Range") {
                    settlements_bot[settlementId] = new RandomBotRange(settlementId, buildings, spiritsCfgId, op_unitCfgId_buildingId);
                } else  {
                    settlements_bot[settlementId] = new RandomBotWithoutChurch(settlementId, buildings, spiritsCfgId, op_unitCfgId_buildingId);
                }

                log.info("settlement = ", settlementId, " attach bot = ", settlements_bot[settlementId].name, " characterUid = ", characterUid);
            }
        }
    }

    //settlements_bot[0] = new RandomBot(0, buildings, spiritsCfgId, op_unitCfgId_buildingId);
    //settlements_bot[1] = new RandomBotMelle(1, buildings, spiritsCfgId, op_unitCfgId_buildingId);
    //settlements_bot[2] = new RandomBotRange(2, buildings, spiritsCfgId, op_unitCfgId_buildingId);
    //settlements_bot[3] = new RandomBotWithoutChurch(3, buildings, spiritsCfgId, op_unitCfgId_buildingId);
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