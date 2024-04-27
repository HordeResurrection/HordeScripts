import { LogLevel, log } from "library/common/logging";
import { World } from "./World";
import { PointCommandArgs, ProduceAtCommandArgs, ProduceCommandArgs, UnitCommand, UnitFlags, UnitMapLayer } from "library/game-logic/horde-types";
import { COMPONENT_TYPE, Entity, ReviveComponent, SpawnBuildingComponent, UnitComponent, UnitProducedEvent, UpgradableBuildingComponent } from "./ESC_components";
import { createPoint, createResourcesAmount } from "library/common/primitives";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { generateCellInSpiral } from "library/common/position-tools";
import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { Cell, distance_L1 } from "./Utils";

export const ResourcesAmount = HCL.HordeClassLibrary.World.Simple.ResourcesAmount;

class Unit {
    /** ид конфиг здания, где строится данный юнит */
    buildingCfgId: string;
    /** полная стоимость создания данного здания с нуля */
    buildingTotalCost: any;
    /** стоимость улучшения до текущего от предыдущего */
    buildingUpgradeCost: any;
    /** ид конфиг юнита */
    unitCfgId: string;
    /** номер предыдущего юнита */
    prevUnitId: number;

    constructor(buildingCfgId: string, buildingTotalCost: any, buildingUpgradeCost: any, unitCfgId: string, prevUnitId: number) {
        this.buildingCfgId       = buildingCfgId;
        this.buildingTotalCost   = buildingTotalCost;
        this.buildingUpgradeCost = buildingUpgradeCost;
        this.unitCfgId           = unitCfgId;
        this.prevUnitId          = prevUnitId;
    }
};

enum BotLogLevel {
    Debug = 0,
    Info = 1,
    Warning = 2,
    Error = 3
}

enum BotBuildState {
    Place = 0,
    Build,
    Upgrade
}

class IBot {
    static LogLevel: BotLogLevel = BotLogLevel.Info;
    static TestBuildingCfg: any  = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Test_Building");

    /** поселение */
    settlementId: number;
    /** имя бота */
    name: string;
    /** возможные юниты */
    units: Array<Unit>;

    /** сущности рабочих */
    workers_entity: Array<Entity>;

    constructor(settlementId: number, name: string, units: Array<Unit>) {
        this.settlementId = settlementId;
        this.name  = name;
        this.units = units;

        this._goalUnitId = -1;
    }

    world: World;
    gameTickNum: number;

    public run(world: World, gameTickNum: number) : void {
        this.world       = world;
        this.gameTickNum = gameTickNum;

        // создаем ссылки на рабочих

        if (!this.workers_entity) {
            this.workers_entity = new Array<Entity>(this.world.settlements_workers_reviveCells[this.settlementId].length);
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
                
                if (unitComponent.cfgId == "worker") {
                    this.workers_entity[workerNum++] = entity;
                }
            }
        }

        // если ничего не строится или пока идет улучшение здания, можно чинить окружающие здания
        
        if (this._goalUnitId == -1 || this._buildingState == BotBuildState.Upgrade) {
            this._repairBuilding();
        }

        // выбираем, строим следующее здание

        if (this._goalUnitId == -1) {
            if (this.world.settlements[this.settlementId].Resources.Lumber > 0) {
                this._selectNextBuilding();
            }
        } else {
            this._buildNextBuilding();
        }
    }

    protected _selectNextBuilding(): void { };

    /** целевой юнит */
    private _goalUnitId: number;
    /** состояние постройки */
    private _buildingState: BotBuildState;
    /** текущая рассматриваемая постройка (через это можно улучшить существующее здание) */
    private _building_curr_unit: any;
    private _building_cell : Cell | null;
    private _building_curr_baseEntity: Entity | null;
    private _building_curr_unitId: number | null;
    private _building_next_unitId: number | null;

    protected _setNextBuilding(goal_unitId: number, building_unit: any = null): void {
        this._goalUnitId = goal_unitId;

        if (building_unit) {
            this._building_curr_unit = building_unit;
            this._buildingState      = BotBuildState.Upgrade;

            // инициализируем ид постройки

            this._building_next_unitId = this._goalUnitId
            this._building_curr_unitId = this._goalUnitId;
            while (this.world.configs[this.units[this._building_curr_unitId].buildingCfgId].Uid != this._building_curr_unit.Cfg.Uid) {
                this._building_next_unitId = this._building_curr_unitId;
                this._building_curr_unitId = this.units[this._building_curr_unitId].prevUnitId;
            }

            // инициализируем точку постройку

            this._building_cell = new Cell(this._building_curr_unit.Cell.X, this._building_curr_unit.producedUnit.Cell.Y);
        } else {
            this._buildingState      = BotBuildState.Place;
        }
    };

    private _buildClear() {
        this._goalUnitId = -1;
        this._building_curr_unit = null;

        this._building_cell = null;
        this._building_curr_baseEntity = null;
        this._building_curr_unitId = null;
        this._building_next_unitId = null;
    }

    private _buildNextBuilding(): void {
        switch (this._buildingState) {
            case BotBuildState.Place:
                this._placeBuilding();
            break;
            case BotBuildState.Build:
                this._buildBuilding();
            break;
            case BotBuildState.Upgrade:
                this._upgradeBuilding();
            break;
        }
    }

    private _placeBuilding(): void {
        // инициализируем ид постройки

        if (this._building_curr_unitId == null) {
            var nextId = this._goalUnitId;
            var prevId = this.units[nextId].prevUnitId;
            while (prevId != -1) {
                nextId = prevId;
                prevId = this.units[nextId].prevUnitId;
            }
            this._building_curr_unitId = nextId;

            this.Log(BotLogLevel.Debug, "до целевого здания нужно построить " + this.world.configs[this.units[this._building_curr_unitId].buildingCfgId].Name);
        }

        // проверяем, что любой рабочий строит нужное здание, иначе отдаем приказ

        for (var i = 0; i < this.workers_entity.length; i++) {
            var unitComponent = this.workers_entity[i].components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

            if (unitComponent.unit.IsDead) {
                continue;
            }

            if (!unitComponent.unit.OrdersMind.IsIdle()) {
                continue;
            }

            if (unitComponent.unit.OrdersMind.ActiveAct.GetType().Name == "ActProduce") {
                break;
            }

            var reviveComponent = this.workers_entity[i].components.get(COMPONENT_TYPE.REVIVE_COMPONENT) as ReviveComponent;

            var config    = this.world.configs[this.units[this._building_curr_unitId].buildingCfgId];
            var generator = generateCellInSpiral(reviveComponent.cell.X, reviveComponent.cell.Y);
            for (var cell = generator.next(); !cell.done; cell = generator.next()) {
                if (IBot.TestBuildingCfg.CanBePlacedByRealMap(this.world.realScena, cell.value.X, cell.value.Y)) {
                    // делаем так, чтобы инженер не отвлекался, когда строит башню (убираем реакцию на инстинкты)
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

            if (unitProducedEvent.producedUnit.Cfg.Uid != this.world.configs[this.units[this._building_curr_unitId].buildingCfgId].Uid) {
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
            if (this._goalUnitId == this._building_curr_unitId) {
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
        if (this._building_curr_unitId == null) {
            this.Log(BotLogLevel.Error, "_building_curr_unitId = null");
            return;
        }

        // инициализируем ид следующей постройки

        if (this._building_next_unitId == null) {
            var nextId = this._goalUnitId;
            var prevId = this.units[nextId].prevUnitId;
            while (prevId != this._building_curr_unitId) {
                nextId = prevId;
                prevId = this.units[nextId].prevUnitId;
            }
            this._building_next_unitId = nextId;
        }

        // инициализируем базовую сущность

        if (this._building_curr_baseEntity == null) {
            this._building_curr_baseEntity = this.world.cfgUid_entity.get(this.world.configs[this.units[this._building_curr_unitId].buildingCfgId].Uid) as Entity;
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

            if (this._building_curr_unit.Cfg.Uid != this.world.configs[this.units[this._building_next_unitId].buildingCfgId].Uid) {
                this._building_curr_unit = null;

                return;
            }

            // здание улучшилось

            if (this._building_next_unitId == this._goalUnitId) {
                this._buildClear();
                this.Log(BotLogLevel.Debug, "стратегия успешно выполнена, переходим к следующей");
                return;
            }

            // обновляем информацию о этапах улучшения

            this._building_curr_baseEntity = null;
            this._building_curr_unitId     = this._building_next_unitId;
            this._building_next_unitId     = null;
            
            return;
        }

        // проверяем хватает ли денег на улучшение

        if (this.units[this._building_next_unitId].buildingUpgradeCost.Gold <= this.world.settlements[this.settlementId].Resources.Gold &&
            this.units[this._building_next_unitId].buildingUpgradeCost.Metal <= this.world.settlements[this.settlementId].Resources.Metal &&
            this.units[this._building_next_unitId].buildingUpgradeCost.Lumber <= this.world.settlements[this.settlementId].Resources.Lumber &&
            this.units[this._building_next_unitId].buildingUpgradeCost.People <= this.world.settlements[this.settlementId].Resources.FreePeople
        ) {
            // улучшаем

            var upgradableBuildingComponent = this._building_curr_baseEntity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as UpgradableBuildingComponent;

            var i = 0;
            for (i = 0; i < upgradableBuildingComponent.upgradeCfgIds.length; i++) {
                if (upgradableBuildingComponent.upgradeCfgIds[i] == this.units[this._building_next_unitId].buildingCfgId) {
                    break;
                }
            }

            this.Log(BotLogLevel.Debug, "улучшение i = " + i + " < " + upgradableBuildingComponent.upgradeCfgIds.length);

            var produceCommandArgs = new ProduceCommandArgs(AssignOrderMode.Queue, this.world.configs[upgradableBuildingComponent.upgradeUnitCfgIds[i]], 1);
            this._building_curr_unit.Cfg.GetOrderDelegate(this._building_curr_unit, produceCommandArgs);

            this._building_curr_unit = null;
        }
    }

    _repairBuilding(): void {
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

            if (!this.world.configs[unitComponent.cfgId].ProfessionParams.ContainsKey(UnitProfession.Reparable)) {
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
                var distance = distance_L1(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y,
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

    constructor(settlementId: number, units: Array<Unit>) {
        super(settlementId, "Рандомный", units);

        this.rnd = ActiveScena.GetRealScena().Context.Randomizer;
    }

    protected _selectNextBuilding(): void {
        var goalUnitId = this.rnd.RandomNumber(0, this.units.length - 1);
        this._setNextBuilding(goalUnitId);
        this.Log(BotLogLevel.Debug, "Random bot выбрал следующую постройку " + this.world.configs[this.units[goalUnitId].buildingCfgId].Name);
    }
};

/** возможные юниты */
var units : Array<Unit>;

/** для каждого поселения хранит бота */
var settlements_bot : Array<IBot>;

export function AI_Init(world: World) {
    // инициализируем все возможные планы строительства

    units = new Array<Unit>();

    const recurciveGetUnitInfo = (cfgId: string, shiftStr: string, accGold: number, accMetal: number, accLumber: number, accPeople: number) => {
        var Uid : string = world.configs[cfgId].Uid;
        if (!world.cfgUid_entity.has(Uid)) {
            return;
        }
        var entity = world.cfgUid_entity.get(Uid) as Entity;

        // проверяем, что здание спавнит юнитов
        if (!entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT)) {
            return;
        }
        var spawnBuildingComponent = entity.components.get(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT) as SpawnBuildingComponent;

        // обновляем накопленную стоимость здания
        
        var CostResources = world.configs[cfgId].CostResources;
        accGold   += CostResources.Gold;
        accMetal  += CostResources.Metal;
        accLumber += CostResources.Lumber;
        accPeople += CostResources.People;

        // сохраняем

        var currentUnitId = units.length;

        units.push(new Unit(
            cfgId,
            createResourcesAmount(
                accGold,
                accMetal,
                accLumber,
                accPeople
            ),
            CostResources,
            spawnBuildingComponent.spawnUnitConfigId,
            -1
        ));

        // идем по улучшению вглубь

        if (!entity.components.has(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT)) {
            return;
        }
        var upgradableBuildingComponent = entity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as 
            UpgradableBuildingComponent;
        
        for (var nextCfgId of upgradableBuildingComponent.upgradeCfgIds) {
            recurciveGetUnitInfo(nextCfgId, shiftStr + "\t", accGold, accMetal, accLumber, accPeople);

            for (var i = currentUnitId + 1; i < units.length; i++) {
                if (units[i].buildingCfgId == nextCfgId) {
                    units[i].prevUnitId = currentUnitId;
                }
            }
        }
    };

    var producerParams = world.configs["worker"].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
    var produceList    = producerParams.CanProduceList;
    for (var i = 0; i < produceList.Count; i++) {
        var produceUnit = produceList.Item.get(i);
        if (!world.cfgUid_entity.has(produceUnit.Uid)) {
            continue;
        }

        var entity = world.cfgUid_entity.get(produceUnit.Uid) as Entity;

        if (!entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT)) {
            continue;
        }

        var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
        recurciveGetUnitInfo(unitComponent.cfgId, "", 0, 0, 0, 0);
    }

    // инициализируем ботов

    settlements_bot = new Array<IBot>(world.settlementsCount);

    for (let player of Players) {
        let realPlayer = player.GetRealPlayer();
        if (!realPlayer.IsBot) {
            continue;
        }
        var settlement    = realPlayer.GetRealSettlement();
        var settlementId  = settlement.Uid;
        if (settlementId < world.settlementsCount) {
            if (!settlements_bot[settlementId]) {
                settlements_bot[settlementId] = new RandomBot(settlementId, units);
            }
        }
    }

    //settlements_bot[3] = new RandomBot(3, units);
}

export function AI_System(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId) || !settlements_bot[settlementId]) {
            continue;
        }

        settlements_bot[settlementId].run(world, gameTickNum);
    }
}