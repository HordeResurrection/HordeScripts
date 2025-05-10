import { log } from "library/common/logging";
import { generateCellInSpiral } from "library/common/position-tools";
import {  createPoint } from "library/common/primitives";
import { UnitDirection, PointCommandArgs, UnitCommand } from "library/game-logic/horde-types";
import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { spawnUnit } from "library/game-logic/unit-spawn";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { GameState, World } from "../World";
import { GetUnitsInArea, Rectangle, getCurrentTime } from "../Utils";
import { OpCfgUidToCfg, OpCfgUidToEntity } from "../Configs/IConfig";
import { Config_Worker } from "../Configs/Config_Worker";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { SpawnBuildingComponent } from "../Components/SpawnBuildingComponent";
import { UnitComponent } from "../Components/UnitComponent";
import { UpgradableBuildingComponent } from "../Components/UpgradableBuildingComponent";
import { Entity } from "../Entity";

enum Stage {
    Init = 0, Testing, Result, End
};
var stage = Stage.Init;

class UnitInfo {
    Name: string;

    /** стоимость юнита */
    Gold: number;
    Metal: number;
    Lumber: number;
    People: number;

    /** ид юнита */
    cfgId: string;
};

/** поле боя */
class BattleField {
    /** прямоугольник всего поля боя */
    fieldRect: Rectangle;
    /** левый прямоугольник спавна */
    leftSpawnRect: Rectangle;
    /** правый прямоугольник спавна */
    rightSpawnRect: Rectangle;
    /** процент от числа юнитов */
    procent: number;

    constructor (fieldRect: Rectangle, leftSpawnRect: Rectangle, rightSpawnRect: Rectangle, procent: number) {
        this.fieldRect = fieldRect;
        this.leftSpawnRect = leftSpawnRect;
        this.rightSpawnRect = rightSpawnRect;
        this.procent = procent;
    }
};

/** арена - набор полей боя */
class Arena {
    battleFields: Array<BattleField>;
    battleFieldsUnits: Array<Array<any>>;

    constructor (battleFields: Array<BattleField>) {
        this.battleFields = battleFields;
        this.battleFieldsUnits = new Array<Array<any>>(this.battleFields.length);
    }

    init_left: Array<any>;
    init_right: Array<any>;

    CalcBattleFieldLeftUnitsSwapCount(fieldNum: number, unitNum: number) : number {
        return Math.round(Math.max(1, this.init_left[unitNum].count * this.battleFields[fieldNum].procent / 100));
    }

    CalcBattleFieldRightUnitsSwapCount(fieldNum: number, unitNum: number) : number {
        return Math.round(Math.max(1, this.init_right[unitNum].count * this.battleFields[fieldNum].procent / 100));
    }

    Start(init_left: Array<any>, init_right: Array<any>) {
        this.init_left = init_left;
        this.init_right = init_right;

        var settlement_left  = ActiveScena.GetRealScena().Settlements.GetByUid("0");
        var settlement_right = ActiveScena.GetRealScena().Settlements.GetByUid("1");
        for (var fieldNum = 0; fieldNum < this.battleFields.length; fieldNum++) {

            // генерируем левую группу

            var left_units = new Array<any>();
            for (var i = 0; i < this.init_left.length; i++) {
                var unitInfo = opCfgUidToUnitInfo.get(this.init_left[i].cfgUid) as UnitInfo;
                var currCount = 0;
                var swapCount = this.CalcBattleFieldLeftUnitsSwapCount(fieldNum, i);
                for (var x = this.battleFields[fieldNum].leftSpawnRect.xs; x <= this.battleFields[fieldNum].leftSpawnRect.xe; x++) {
                    for (var y = this.battleFields[fieldNum].leftSpawnRect.ys; y <= this.battleFields[fieldNum].leftSpawnRect.ye; y++) {
                        left_units.push(spawnUnit(settlement_left, OpCfgUidToCfg[unitInfo.cfgId], createPoint(x, y), UnitDirection.Down));
                        if (++currCount >= swapCount) {
                            break;
                        }
                    }
                    if (currCount >= swapCount) {
                        break;
                    }
                }
            }

            // генерируем правую группу

            var right_units = new Array<any>();
            for (var i = 0; i < this.init_right.length; i++) {
                var unitInfo = opCfgUidToUnitInfo.get(this.init_right[i].cfgUid) as UnitInfo;
                var currCount = 0;
                var swapCount = this.CalcBattleFieldRightUnitsSwapCount(fieldNum, i);
                for (var x = this.battleFields[fieldNum].rightSpawnRect.xe; x >= this.battleFields[fieldNum].rightSpawnRect.xs; x--) {
                    for (var y = this.battleFields[fieldNum].rightSpawnRect.ye; y >= this.battleFields[fieldNum].rightSpawnRect.ys; y--) {
                        right_units.push(spawnUnit(settlement_right, OpCfgUidToCfg[unitInfo.cfgId], createPoint(x, y), UnitDirection.Down));
                        if (++currCount >= swapCount) {
                            break;
                        }
                    }
                    if (currCount >= swapCount) {
                        break;
                    }
                }
            }

            // отправляем в атаку левую группу

            var left_attackPos = {
                X: Math.floor(0.5*(this.battleFields[fieldNum].rightSpawnRect.xs + this.battleFields[fieldNum].rightSpawnRect.xe)),
                Y: Math.floor(0.5*(this.battleFields[fieldNum].rightSpawnRect.ys + this.battleFields[fieldNum].rightSpawnRect.ye))
            };
            {
                var position;
                var generator = generateCellInSpiral(left_attackPos.X, left_attackPos.Y);
                for (position = generator.next(); !position.done; position = generator.next()) {
                    if (unitCanBePlacedByRealMap(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer"), position.value.X, position.value.Y)) {
                        left_attackPos.X = position.value.X;
                        left_attackPos.Y = position.value.Y;
                        break;
                    }
                }
            }
            var pointCommandArgs = new PointCommandArgs(createPoint(left_attackPos.X, left_attackPos.Y), UnitCommand.Attack, AssignOrderMode.Replace);
            for (var unit of left_units) {
                unit.Cfg.GetOrderDelegate(unit, pointCommandArgs);
            }

            // отправляем в атаку правую группу

            var right_attackPos = {
                X: Math.floor(0.5*(this.battleFields[fieldNum].leftSpawnRect.xs + this.battleFields[fieldNum].leftSpawnRect.xe)),
                Y: Math.floor(0.5*(this.battleFields[fieldNum].leftSpawnRect.ys + this.battleFields[fieldNum].leftSpawnRect.ye))
            };
            {
                var position;
                var generator = generateCellInSpiral(right_attackPos.X, right_attackPos.Y);
                for (position = generator.next(); !position.done; position = generator.next()) {
                    if (unitCanBePlacedByRealMap(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer"), position.value.X, position.value.Y)) {
                        right_attackPos.X = position.value.X;
                        right_attackPos.Y = position.value.Y;
                        break;
                    }
                }
            }
            var pointCommandArgs = new PointCommandArgs(createPoint(right_attackPos.X, right_attackPos.Y), UnitCommand.Attack, AssignOrderMode.Replace);
            for (var unit of right_units) {
                unit.Cfg.GetOrderDelegate(unit, pointCommandArgs);
            }
        }
    }

    IsEnd() : boolean {
        var globalEnd = true;

        for (var fieldNum = 0; fieldNum < this.battleFields.length; fieldNum++) {
            this.battleFieldsUnits[fieldNum] = GetUnitsInArea(this.battleFields[fieldNum].fieldRect);

            if (this.battleFieldsUnits[fieldNum].length == 0) {
                continue;
            }

            // проверяем, что у юнитов 1 владелец

            var localEnd = true;

            var fieldOwnerUid = this.battleFieldsUnits[fieldNum][0].Owner;
            for (var i = 1; i < this.battleFieldsUnits[fieldNum].length; i++) {
                if (this.battleFieldsUnits[fieldNum][i].Owner != fieldOwnerUid) {
                    localEnd = false;
                }
            }

            globalEnd = globalEnd && localEnd;

            // если битва не закончилась и у юнитов нету приказа, то отсылаем их в центр

            if (!localEnd) {
                var attackPos = {
                    X: Math.floor(0.5*(this.battleFields[fieldNum].fieldRect.xs + this.battleFields[fieldNum].fieldRect.xe)),
                    Y: Math.floor(0.5*(this.battleFields[fieldNum].fieldRect.ys + this.battleFields[fieldNum].fieldRect.ye))
                };
                {
                    var position;
                    var generator = generateCellInSpiral(attackPos.X, attackPos.Y);
                    for (position = generator.next(); !position.done; position = generator.next()) {
                        if (unitCanBePlacedByRealMap(HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer"), position.value.X, position.value.Y)) {
                            attackPos.X = position.value.X;
                            attackPos.Y = position.value.Y;
                            break;
                        }
                    }
                }
                var pointCommandArgs = new PointCommandArgs(createPoint(attackPos.X, attackPos.Y), UnitCommand.Attack, AssignOrderMode.Replace);

                for (var i = 0; i < this.battleFieldsUnits[fieldNum].length; i++) {
                    // проверяем, что юнит бездействует
                    if (!this.battleFieldsUnits[fieldNum][i].OrdersMind.IsIdle()) {
                        continue;
                    }

                    this.battleFieldsUnits[fieldNum][i].Cfg.GetOrderDelegate(this.battleFieldsUnits[fieldNum][i], pointCommandArgs);
                }
            }
        }

        return globalEnd;
    }

    Clear() {
        for (var fieldNum = 0; fieldNum < this.battleFields.length; fieldNum++) {
            this.battleFieldsUnits[fieldNum] = GetUnitsInArea(this.battleFields[fieldNum].fieldRect);

            if (this.battleFieldsUnits[fieldNum].length == 0) {
                continue;
            }

            for (var i = 0; i < this.battleFieldsUnits[fieldNum].length; i++) {
                this.battleFieldsUnits[fieldNum][i].Delete();
            }
        }
    }
};

var arenas : Array<Arena>;
var opCfgUidToUnitInfo : Map<string, UnitInfo>;
/** Uid участвующих юнитов */
var unitsUid : Array<string>;
/** таблица - номер арены, где проводится сейчас битва */
var tableArenaNum : Array<Array<number>>;
/** таблица - статистика собрана */
var tableStatCollected: Array<Array<boolean>>;
/** множество таблиц для каждого процента армии от максимума - осталось юнитов в процентах */
var set_TableUnitsLeft : Map<number, Array<Array<number>>>;

function Init(world: World) : boolean {
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

        // обновляем накопленную стоимость здания
        
        var CostResources = OpCfgUidToCfg[cfgId].CostResources;
        accGold   += CostResources.Gold;
        accMetal  += CostResources.Metal;
        accLumber += CostResources.Lumber;
        accPeople += CostResources.People;

        // извлекаем текущего юнита
        
        var unitInfo = new UnitInfo();
        unitInfo.cfgId   = spawnBuildingComponent.spawnUnitConfigUid;
        unitInfo.Name    = OpCfgUidToCfg[unitInfo.cfgId].Name;
        unitInfo.Gold    = accGold;
        unitInfo.Metal   = accMetal;
        unitInfo.Lumber  = accLumber;
        unitInfo.People  = accPeople;

        opCfgUidToUnitInfo.set(Uid, unitInfo);
        log.info("загружен юнит: ", unitInfo.Name, " ", unitInfo.Gold, "g ", unitInfo.Metal, "m ", unitInfo.Lumber, "l ", unitInfo.People, "p");

        // идем по улучшению вглубь

        if (!entity.components.has(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT)) {
            return;
        }
        var upgradableBuildingComponent = entity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as 
            UpgradableBuildingComponent;
        
        for (var nextCfgId of upgradableBuildingComponent.upgradesCfgUid) {
            recurciveGetUnitInfo(nextCfgId, shiftStr + "\t", accGold, accMetal, accLumber, accPeople);
        }
    };

    // анализируем список построек у рабочего
    
    opCfgUidToUnitInfo = new Map<string, UnitInfo>();

    var producerParams = OpCfgUidToCfg[Config_Worker.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
    var produceList    = producerParams.CanProduceList;
    for (var i = 0; i < produceList.Count; i++) {
        var produceUnit = produceList.Item.get(i);
        log.info(i, " = ", produceUnit.Name);
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

    unitsUid = Array.from(opCfgUidToUnitInfo.keys());

    // добавляем список арен

    arenas = new Array<Arena>();
    
    for (var y = 0; y < 3; y++) {
        var x = 0;
        var battleFields = new Array<BattleField>();

        // левые 
        for (var fieldNum = 0; fieldNum < 3; fieldNum++) {
            var xs = 0;
            var ys = 6 + 28*(fieldNum + 3*y);
            var xe = 95;
            var ye = 17 + 28*(fieldNum + 3*y);

            battleFields.push(new BattleField(
                new Rectangle(xs, ys, xe, ye),
                new Rectangle(xs + 2, ys + 2, xs + 12, ye - 2),
                new Rectangle(xe - 12, ys + 2, xe - 2, ye - 2),
                fieldNum == 0 ? 100 : fieldNum == 1 ? 50 : 10
            ));
        }

        // правые
        for (var fieldNum = 0; fieldNum < 3; fieldNum++) {
            var xs = 0 + 128;
            var ys = 6 + 28*(fieldNum + 3*y);
            var xe = 95 + 128;
            var ye = 17 + 28*(fieldNum + 3*y);

            battleFields.push(new BattleField(
                new Rectangle(xs, ys, xe, ye),
                new Rectangle(xe - 12, ys + 2, xe - 2, ye - 2),
                new Rectangle(xs + 2, ys + 2, xs + 12, ye - 2),
                fieldNum == 0 ? 100 : fieldNum == 1 ? 50 : 10
            ));
        }

        arenas.push(new Arena(battleFields));
    }

    // подготавливаем таблицы статистики

    var unitsCount = opCfgUidToUnitInfo.size;

    set_TableUnitsLeft = new Map<number, Array<Array<number>>>();
    tableArenaNum = new Array<Array<number>>(unitsCount);
    tableStatCollected = new Array<Array<boolean>>(unitsCount);
    for (var i = 0; i < unitsCount; i++) {
        tableArenaNum[i] = new Array<number>(unitsCount);
        tableStatCollected[i] = new Array<boolean>(unitsCount);
        for (var j = 0; j < unitsCount; j++) {
            tableArenaNum[i][j] = -1;
            tableStatCollected[i][j] = false;
        }
    }

    // тестирование конкретного юнита

    // {
    //     var testUnit = 13;
    //     for (var i = 0; i < unitsCount; i++) {
    //         for (var j = 0; j < unitsCount; j++) {
    //             if (i == testUnit || j == testUnit) continue;

    //             tableStatCollected[i][j] = true;
    //         }
    //     }
    // }

    return true;
}

var testTime = 0;

function Test(world: World) {
    var isEnd = true;
    var unitsCount = opCfgUidToUnitInfo.size;

    // собираем статистику и ищем пустые арены

    var arenasEmpty = new Array<boolean>(arenas.length);
    for (var i = 0; i < arenas.length; i++) {
        arenasEmpty[i] = true;
    }

    for (var i = 0; i < unitsCount; i++) {
        for (var j = i + 1; j < unitsCount; j++) {
            // проверка, что статистика не собрана
            if (tableStatCollected[i][j]) {
                continue;
            }

            isEnd = false;

            var arenaNum = tableArenaNum[i][j];

            // проверка, что сейчас идет столкновение
            if (arenaNum == -1) {
                continue;
            }

            // ставим флаг, что арена занята
            arenasEmpty[arenaNum] = false;

            // проверка, что столкновение закончилось
            if (!arenas[arenaNum].IsEnd()) {
                continue;
            }

            // собираем статистику

            //log.info("бой закончен между ", i, " ", j, " всего полей ", arenas[arenaNum].battleFields.length);

            for (var fieldNum = 0; fieldNum < arenas[arenaNum].battleFields.length; fieldNum++) {
                var i_unitsLeft = 0;
                var j_unitsLeft = 0;

                //log.info("\tполе ", fieldNum, " на нем юнитов ", arenas[arenaNum].battleFieldsUnits[fieldNum].length);

                for (var unitNum = 0; unitNum < arenas[arenaNum].battleFieldsUnits[fieldNum].length; unitNum++) {
                    var unit = arenas[arenaNum].battleFieldsUnits[fieldNum][unitNum];
                    if (unit.Owner.Uid == 0) {
                        i_unitsLeft++;
                    } else {
                        j_unitsLeft++;
                    }
                }
                var i_unitsSwapCount = arenas[arenaNum].CalcBattleFieldLeftUnitsSwapCount(fieldNum, 0);
                var j_unitsSwapCount = arenas[arenaNum].CalcBattleFieldRightUnitsSwapCount(fieldNum, 0);

                if (!set_TableUnitsLeft.has(arenas[arenaNum].battleFields[fieldNum].procent)) {
                    var table = new Array<Array<number>>(unitsCount);
                    for (var _i = 0; _i < unitsCount; _i++) {
                        table[_i] = new Array<number>(unitsCount);
                        for (var _j = 0; _j < unitsCount; _j++) {
                            table[_i][_j] = 0;
                        }
                    }
                    set_TableUnitsLeft.set(arenas[arenaNum].battleFields[fieldNum].procent, table);
                }
                var tableUnitsLeft = set_TableUnitsLeft.get(arenas[arenaNum].battleFields[fieldNum].procent) as Array<Array<number>>;
                tableUnitsLeft[i][j] += Math.round(i_unitsLeft * 100 / i_unitsSwapCount);
                tableUnitsLeft[j][i] += Math.round(j_unitsLeft * 100 / j_unitsSwapCount);

                //log.info("\t i_unitsLeft = ", i_unitsLeft, " (", i_unitsSwapCount , ") ",
                //    " j_unitsLeft = ", j_unitsLeft, " (", j_unitsSwapCount , ")");
            }

            // ставим флаг, что собрали статистику

            tableStatCollected[i][j] = true;

            // очищаем арену
            arenas[arenaNum].Clear();
        }
    }

    // запускаем битвы и проверяем конец тестирования

    for (var i = 0; i < unitsCount; i++) {
        for (var j = i + 1; j < unitsCount; j++) {
            // проверка, что статистика не собрана
            if (tableStatCollected[i][j]) {
                continue;
            }

            var arenaNum = tableArenaNum[i][j];

            // проверка, что сейчас не идет столкновение
            if (arenaNum != -1) {
                continue;
            }

            // ищем свободную арену и запускаем там битву

            for (var arenaNum = 0; arenaNum < arenas.length; arenaNum++) {
                if (!arenasEmpty[arenaNum]) {
                    continue;
                }

                var unit_i = opCfgUidToUnitInfo.get(unitsUid[i]) as UnitInfo;
                var unit_j = opCfgUidToUnitInfo.get(unitsUid[j]) as UnitInfo;

                var units_i_count = Math.round(5000 / unit_i.Lumber);
                var units_j_count = Math.round(5000 / unit_j.Lumber);

                arenas[arenaNum].Start(
                    [{cfgUid: unitsUid[i], count: units_i_count}],
                    [{cfgUid: unitsUid[j], count: units_j_count}]);
                
                arenasEmpty[arenaNum] = false;
                tableArenaNum[i][j] = arenaNum;

                break;
            }
        }
    }

    return isEnd;
}

function Result (world: World) {
    var tmp = "";
    var unitsCount = opCfgUidToUnitInfo.size;

    // выводим имена юнитов

    tmp = "\n";
    for (var i = 0; i < unitsCount; i++) {
        var unitInfo = opCfgUidToUnitInfo.get(unitsUid[i]) as UnitInfo;
        tmp += "" +  unitInfo.Name + "\t";
    }
    log.info(tmp);

    // выводим таблицу потерь

    var procents = Array.from(set_TableUnitsLeft.keys());
    for (var k = 0; k < procents.length; k++) {
        var table = set_TableUnitsLeft.get(procents[k]) as Array<Array<number>>;
        tmp = "procent = " + procents[k] + "\n";
        for (var i = 0; i < unitsCount; i++) {
            for (var j = 0; j < unitsCount; j++) {
                tmp += table[i][j] + "\t";
            }
            tmp += "\n";
        }
        log.info(tmp);
    }

    return true;
}

var systemRuns = 0;

export function BalanceFindingSystem(world: World, gameTickNum: number) {
    systemRuns++;

    switch(stage) {
        case Stage.Init:
            if (Init(world)) {
                stage = Stage.Testing;
            }
            break;
        case Stage.Testing:
            var time : number = getCurrentTime();
            if (Test(world)) {
                stage = Stage.Result;
            }
            testTime += getCurrentTime() - time;

            // оцениваем сколько осталось времени до окончания теста
            if (systemRuns % 30 == 0) {
                // считаем сколько осталось пар
                var totalBattles = 0;
                var needBattles = 0;
                var unitsCount = opCfgUidToUnitInfo.size;
                for (var i = 0; i < unitsCount; i++) {
                    for (var j = i + 1; j < unitsCount; j++) {
                        totalBattles++;

                        // проверка, что статистика не собрана
                        if (tableStatCollected[i][j]) {
                            continue;
                        }

                        needBattles++;
                    }
                }

                log.info("needBattles / totalBattles = ", needBattles, " / ", totalBattles, " осталось ", Math.round(testTime / (totalBattles - needBattles) * needBattles / 1000) , " секунд");
            }

            break;
        case Stage.Result:
            if (Result(world)) {
                stage = Stage.End;
            }
            break;
        case Stage.End:
            world.state = GameState.CLEAR;
            break;
    }
}
