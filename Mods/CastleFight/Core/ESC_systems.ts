import { createGameMessageWithNoSound } from "library/common/messages";
import { generateCellInSpiral } from "library/common/position-tools";
import { createHordeColor, createResourcesAmount, createPoint } from "library/common/primitives";
import { mergeFlags } from "library/dotnet/dotnet-utils";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { UnitDeathType, UnitCommand, UnitDirection, UnitFlags } from "library/game-logic/horde-types";
import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { spawnUnits } from "library/game-logic/unit-spawn";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { COMPONENT_TYPE, UnitComponent, BuffableComponent, BUFF_TYPE, SettlementComponent, IncomeIncreaseEvent, IncomeIncreaseComponent, IncomeEvent, IncomeLimitedPeriodicalComponent, Entity, AttackingAlongPathComponent, SpawnBuildingComponent, ReviveComponent, UpgradableBuildingComponent, UpgradableBuildingEvent, BuffEvent, BuffComponent, UnitProducedEvent } from "./ESC_components";
import { Point, distanceBetweenPoints, UnitGiveOrder, UnitDisallowCommands } from "./Utils";
import { World } from "./World";
import { log } from "library/common/logging";

const ReplaceUnitParameters = HCL.HordeClassLibrary.World.Objects.Units.ReplaceUnitParameters;

export function CheckGameEndSystem(world: World, gameTickNum: number) {
    // присуждаем поражение альянсам
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        // проверка, что замок есть и поселение в игре
        if (!world.settlements[settlementId] ||
            !world.settlements_castleUnit[settlementId]) {
            continue;
        }

        // проверяем, что у всего альянса замки уничтожены
        var isDefeat = true;
        for (var other_settlementId = 0; other_settlementId < world.settlementsCount; other_settlementId++) {
            // проверка, что есть мир
            if (world.settlements_settlements_warFlag[settlementId][other_settlementId]) {
                continue;
            }
            
            // проверка, что замок стоит
            if (!world.settlements[other_settlementId] ||
                !world.settlements_castleUnit[other_settlementId] ||
                world.settlements_castleUnit[other_settlementId].IsDead) {
                continue;
            }

            // нашелся союзник с целым замком
            isDefeat = false;
            break;
        }

        if (!isDefeat) {
            continue;
        }

        // присуждаем поражение всему альянсу
        for (var other_settlementId = 0; other_settlementId < world.settlementsCount; other_settlementId++) {
            // проверка, что есть мир
            if (world.settlements_settlements_warFlag[settlementId][other_settlementId]) {
                continue;
            }
            // проверка, что поселение в игре
            if (!world.settlements[other_settlementId]) {
                continue;
            }

            // объявляем альянс всем врагам для видимости
            for (var _settlementId = 0; _settlementId < world.settlementsCount; _settlementId++) {
                if (!world.settlements[_settlementId] || 
                    !world.settlements_settlements_warFlag[other_settlementId][_settlementId]) {
                    continue;
                }
                world.settlements[other_settlementId].Diplomacy.DeclareAlliance(world.settlements[_settlementId]);
                world.settlements[_settlementId].Diplomacy.DeclareAlliance(world.settlements[other_settlementId]);
                //var settlementFogOfWar = world.settlements[other_settlementId].Vision.FogOfWar;
                //settlementFogOfWar.InitializeFogArrays(settlementFogOfWar.DefaultFog, settlementFogOfWar.DerivativeFog);
            }

            // присуждаем поражение
            world.settlements[other_settlementId].Existence.ForceTotalDefeat();

            // если был уничтожен замок, то убиваем всех юнитов
            for (var i = 0; i < world.settlements_entities[other_settlementId].length; i++) {
                var entity = world.settlements_entities[other_settlementId][i];
                if (!entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                    continue;
                }
                var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

                if (!unitComponent.unit || unitComponent.unit.IsDead) {
                    continue;
                }

                var battleMind = unitComponent.unit.BattleMind;
                battleMind.InstantDeath(null, UnitDeathType.Mele);
            }
            world.settlements_castleUnit[other_settlementId] = null;
        }
    }

    // присуждаем победу последнему альянсу
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        // проверка, что замок есть и поселение в игре
        if (!world.settlements[settlementId] ||
            !world.settlements_castleUnit[settlementId]) {
            continue;
        }

        var isVictory = true;
        for (var other_settlementId = 0; other_settlementId < world.settlementsCount; other_settlementId++) {
            // проверка, что есть война
            if (!world.settlements_settlements_warFlag[settlementId][other_settlementId]) {
                continue;
            }
            // проверка, что замок стоит
            if (!world.settlements[other_settlementId] ||
                !world.settlements_castleUnit[other_settlementId] ||
                world.settlements_castleUnit[other_settlementId].IsDead) {
                continue;
            }

            // нашелся враг с целым замком
            isVictory = false;
            break;
        }

        if (!isVictory) {
            continue;
        }

        // присуждаем победу всему альянсу
        for (var other_settlementId = 0; other_settlementId < world.settlementsCount; other_settlementId++) {
            // проверка, что есть мир
            if (world.settlements_settlements_warFlag[settlementId][other_settlementId]) {
                continue;
            }
            // проверка, что поселение в игре
            if (!world.settlements[other_settlementId]) {
                continue;
            }
            
            // удаляем замок
            world.settlements_castleUnit[other_settlementId] = null;
            // присуждаем победу
            world.settlements[other_settlementId].Existence.ForceVictory();
        }

        world.gameEnd = true;
        break;
    }

    // если игра закончилась, то удаляем все конфиги
    if (world.gameEnd) {
        for (var cfgId in world.configs) {
            HordeContentApi.RemoveConfig(world.configs[cfgId]);
        }
    }

    return world.gameEnd;
}

export function WordClearSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.settlements[settlementId]) {
            continue;
        }

        // если юнит убит, то удаляем сущность
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i];

            var needDelete : boolean = false;

            if (entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT) &&
                !entity.components.has(COMPONENT_TYPE.REVIVE_COMPONENT)) {
                var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            
                // проверка, что юнит мертвый, тогда нужно удалить
                needDelete = !unitComponent.unit || unitComponent.unit.IsDead;
            } else if (entity.components.size == 0) {
                needDelete = true;
            }

            if (needDelete) {
                // если юнит был баффнут, то нужно удалить клонированный конфиг
                if (entity.components.has(COMPONENT_TYPE.BUFFABLE_COMPONENT)) {
                    var buffableComponent = entity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;
                    if (buffableComponent.buffType != BUFF_TYPE.EMPTY && buffableComponent.buffCfg) {
                        HordeContentApi.RemoveConfig(buffableComponent.buffCfg);
                    }
                }

                world.settlements_entities[settlementId].splice(i--, 1);
            }
        }
    }
}

export function IncomeSystem(world: World, gameTickNum: number) {
    // учитываем события увеличения инкома
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        // ищем сущность с settlement
        var settlement_entity;
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i];
            if (entity.components.has(COMPONENT_TYPE.SETTLEMENT_COMPONENT)) {
                settlement_entity = entity;
                break;
            }
        }
        var settlementComponent = settlement_entity.components.get(COMPONENT_TYPE.SETTLEMENT_COMPONENT) as SettlementComponent;

        // вычисляем итоговый инком
        var incomeGold     : number   = 0;
        var incomeLumber   : number   = 0;
        var incomeMetal    : number   = 0;
        var incomePeople   : number   = 0;
        // добыто из ограниченного источника
        var minedGold      : number   = 0;
        var minedLumber    : number   = 0;
        var minedMetal     : number   = 0;
        // осталось в ограниченном источнике
        var goldReserves   : number   = 0;
        var lumberReserves : number   = 0;
        var metalReserves  : number   = 0;

        // проверяем тик инкома
        if (settlementComponent.incomeTact < gameTickNum) {
            // ищем события увеличивающие инком
            for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
                var entity = world.settlements_entities[settlementId][i];
                if (entity.components.has(COMPONENT_TYPE.INCOME_INCREASE_EVENT)) {
                    var income_increase_event = entity.components.get(COMPONENT_TYPE.INCOME_INCREASE_EVENT) as IncomeIncreaseEvent;

                    settlementComponent.incomeGold   += income_increase_event.gold;
                    settlementComponent.incomeLumber += income_increase_event.lumber;
                    settlementComponent.incomeMetal  += income_increase_event.metal;

                    entity.components.delete(COMPONENT_TYPE.INCOME_INCREASE_EVENT);
                }
            }

            // ищем компоненты увеличивающие инком, которые приходит пассивно
            var increaseCoeff = 1.0;
            var increaseCount = 0;
            for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
                var entity = world.settlements_entities[settlementId][i];
                if (entity.components.has(COMPONENT_TYPE.INCOME_INCREASE_COMPONENT)) {
                    var incomeIncreaseComponent = entity.components.get(COMPONENT_TYPE.INCOME_INCREASE_COMPONENT) as IncomeIncreaseComponent;
                    increaseCount++;
                    if (increaseCount == 1) {
                        increaseCoeff += 0.25;
                    } else if (increaseCount == 2) {
                        increaseCoeff += 0.2125;
                    } else if (increaseCount == 3) {
                        increaseCoeff += 0.1806;
                    }
                }
            }

            settlementComponent.incomeTact = gameTickNum + settlementComponent.incomeWaitTacts;
            incomeGold   += Math.round(settlementComponent.incomeGold * increaseCoeff);
            incomeLumber += Math.round(settlementComponent.incomeLumber * increaseCoeff);
            incomeMetal  += Math.round(settlementComponent.incomeMetal * increaseCoeff);
        }

        // ищем события дающие инком
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i];
            if (entity.components.has(COMPONENT_TYPE.INCOME_EVENT)) {
                var income_event = entity.components.get(COMPONENT_TYPE.INCOME_EVENT) as IncomeEvent;
                incomeGold   += income_event.gold;
                incomeLumber += income_event.lumber;
                incomeMetal  += income_event.metal;
                incomePeople += income_event.people;

                entity.components.delete(COMPONENT_TYPE.INCOME_EVENT);
            }
        }

        // ищем переодический инком
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity        = world.settlements_entities[settlementId][i];
            if (entity.components.has(COMPONENT_TYPE.INCOME_LIMITED_PERIODICAL_COMPONENT)) {
                var incomeComponent = entity.components.get(COMPONENT_TYPE.INCOME_LIMITED_PERIODICAL_COMPONENT) as IncomeLimitedPeriodicalComponent;
                
                // проверяем время
                if (incomeComponent.tact < 0) {
                    incomeComponent.tact = gameTickNum + incomeComponent.periodTacts;
                    continue;
                } else if (incomeComponent.tact > gameTickNum) {
                    continue;
                }
                incomeComponent.tact += incomeComponent.periodTacts;

                var isEmpty : boolean = true;
                if (incomeComponent.totalGold > 0) {
                    isEmpty                    = false;
                    minedGold                 += Math.min(incomeComponent.gold, incomeComponent.totalGold);
                    incomeComponent.totalGold -= incomeComponent.gold;
                    goldReserves              += incomeComponent.totalGold;
                }
                if (incomeComponent.totalMetal > 0) {
                    isEmpty                     = false;
                    minedMetal                 += Math.min(incomeComponent.metal, incomeComponent.totalMetal);
                    incomeComponent.totalMetal -= incomeComponent.metal;
                    metalReserves              += incomeComponent.totalMetal;
                }
                if (incomeComponent.totalLumber > 0) {
                    isEmpty                      = false;
                    minedLumber                 += Math.min(incomeComponent.lumber, incomeComponent.totalLumber);
                    incomeComponent.totalLumber -= incomeComponent.lumber;
                    lumberReserves              += incomeComponent.totalLumber;
                }
                
                if (isEmpty) {
                    entity.components.delete(COMPONENT_TYPE.INCOME_LIMITED_PERIODICAL_COMPONENT);
                }
            }
        }

        // начисляем инком
        var emptyIncome : boolean = true;
        // оповещаем
        if (incomeMetal + minedMetal > 0) {
            emptyIncome = false;
            var msg = createGameMessageWithNoSound("Доход железа:" +
                (incomeMetal > 0 ? " пассивно " + incomeMetal + " " : "") +
                (minedMetal > 0 ? " добыто " + minedMetal + " осталось " + metalReserves : ""),
                createHordeColor(255, 170, 169, 173));
            world.settlements[settlementId].Messages.AddMessage(msg);
        }
        if (incomeGold + minedGold > 0) {
            emptyIncome = false;
            var msg = createGameMessageWithNoSound("Доход золота:" +
                (incomeGold > 0 ? " пассивно " + incomeGold + " " : "") +
                (minedGold > 0 ? " добыто " + minedGold + " осталось " + goldReserves : ""),
                createHordeColor(255, 255, 215, 0));
            world.settlements[settlementId].Messages.AddMessage(msg);
        }
        if (incomeLumber + minedLumber > 0) {
            emptyIncome = false;
            var msg = createGameMessageWithNoSound("Доход дерева:" +
                (incomeLumber > 0 ? " пассивно " + incomeLumber + " " : "") +
                (minedLumber > 0 ? " добыто " + minedLumber + " осталось " + lumberReserves : ""),
                createHordeColor(255, 170, 107, 0));
            world.settlements[settlementId].Messages.AddMessage(msg);
        }
        if (incomePeople > 0) {
            emptyIncome = false;
            var msg = createGameMessageWithNoSound("Выращено людей: " + incomePeople,
                createHordeColor(255, 204, 204, 0));
            world.settlements[settlementId].Messages.AddMessage(msg);
        }

        if (!emptyIncome) {
            world.settlements[settlementId].Resources.AddResources(createResourcesAmount(incomeGold + minedGold, incomeMetal + minedMetal, incomeLumber + minedLumber, incomePeople));
        }

        // если у поселения есть люди отбираем их
        //if (world.settlements[settlementId].Resources.FreePeople > 0) {
        //    world.settlements[settlementId].Resources.TakeResources(createResourcesAmount(0, 0, 0, world.settlements[settlementId].Resources.FreePeople));
        //}
    }
}

export function AttackingAlongPathSystem(world: World, gameTickNum: number) {
    /** радиус реагирования на текущую точку пути атаки, если <= то отправляем в следующую точку */
    const pathNodeReactionRadius = 5;

    var unitsMap = world.realScena.UnitsMap;

    /** позиции вражеских юнитов на нашей базе */
    var settlements_enemyPositionOnBase = new Array<Array<Point>>(world.settlementsCount);
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        settlements_enemyPositionOnBase[settlementId] = new Array<Point>();
    }
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }
        
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (!entity.components.has(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT) ||
                !entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                continue;
            }

            var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

            if (!unitComponent.unit || unitComponent.unit.IsDead) {
                continue;
            }

            for (var other_settlementId = 0; other_settlementId < world.settlementsCount; other_settlementId++) {
                if (!world.IsSettlementInGame(other_settlementId)) {
                    continue;
                }
                // проверка войны
                if (!world.settlements_settlements_warFlag[settlementId][other_settlementId]) {
                    continue;
                }
                // проверка, что данный юнит на базе врага
                if (!world.settlements_field[other_settlementId].IsPointInside(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y)) {
                    continue;
                }
                // заносим данного юнита в список
                settlements_enemyPositionOnBase[other_settlementId].push(new Point(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y));
            }
        }
    }
    
    // отдаем приказы
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (!entity.components.has(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT) ||
                !entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                continue;
            }

            var unitComponent               = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            var attackingAlongPathComponent = entity.components.get(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT) as AttackingAlongPathComponent;

            if (!unitComponent.unit || unitComponent.unit.IsDead) {
                continue;
            }

            var isAttackPathNull = !attackingAlongPathComponent.attackPath;

            // если юнит вообще не знает куда идти, то выбираем путь атаки
            if (isAttackPathNull) {
                var selected_path_num = -1;
                var selected_path_distance = 10000;
                // выбираем нужный путь, первая точка которого ближе к позиции юнита
                for (var pathNum = 0; pathNum < world.settlements_attack_paths[settlementId].length; pathNum++) {
                    var distance_to_fisrt_point = distanceBetweenPoints(
                        unitComponent.unit.Cell.X,
                        unitComponent.unit.Cell.Y,
                        world.settlements_attack_paths[settlementId][pathNum][0].X,
                        world.settlements_attack_paths[settlementId][pathNum][0].Y);

                    if (selected_path_distance > distance_to_fisrt_point) {
                        selected_path_distance = distance_to_fisrt_point;
                        selected_path_num      = pathNum;
                    }
                }

                attackingAlongPathComponent.attackPath          = world.settlements_attack_paths[settlementId][selected_path_num];
                attackingAlongPathComponent.currentPathPointNum = 0;
            }

            // юнит дошел то точки
            if (distanceBetweenPoints(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y,
                attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].X,
                attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].Y) <= pathNodeReactionRadius) {
                
                // проверка, что в ячейке нету вражеского замка
                var unitInPoint = unitsMap.GetUpperUnit(attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].X, attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].Y);
                if (unitInPoint &&
                    unitInPoint.Cfg.Uid == world.configs["castle"].Uid &&
                    unitInPoint.Owner.Uid < world.settlementsCount &&
                    world.settlements_settlements_warFlag[settlementId][unitInPoint.Owner.Uid]) {
                    continue;
                }

                attackingAlongPathComponent.currentPathPointNum++;

                // проверяем, что точка последняя
                if (attackingAlongPathComponent.currentPathPointNum == attackingAlongPathComponent.attackPath.length) {
                    // то зацикливаем, ставим 0-ую
                    attackingAlongPathComponent.currentPathPointNum = 0;
                }

                UnitGiveOrder(unitComponent.unit,
                    attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                    UnitCommand.Attack,
                    AssignOrderMode.Replace);
                
                continue;
            }

            // защита базы
            if (settlements_enemyPositionOnBase[settlementId].length > 0 &&
                world.settlements_field[settlementId].IsPointInside(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y)) {
                // ищем ближайшего врага
                // который в направлении атаки
                var attackVector     = new Point(
                    attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].X - unitComponent.unit.Cell.X,
                    attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].Y - unitComponent.unit.Cell.Y);
                var nearPos_num      = -1;
                var nearPos_distance = 10000;
                for (var posNum = 0; posNum < settlements_enemyPositionOnBase[settlementId].length; posNum++) {
                    // проверяем, что враг на пути атаки
                    if (attackVector.X*(settlements_enemyPositionOnBase[settlementId][posNum].X - unitComponent.unit.Cell.X)
                        + attackVector.Y*(settlements_enemyPositionOnBase[settlementId][posNum].Y - unitComponent.unit.Cell.Y) < 0) {
                        continue;
                    }
                    var posDistance = distanceBetweenPoints(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y, settlements_enemyPositionOnBase[settlementId][posNum].X, settlements_enemyPositionOnBase[settlementId][posNum].Y);
                    if (posDistance < nearPos_distance) {
                        nearPos_num      = posNum;
                        nearPos_distance = posDistance;
                    }
                }

                // нашелся юнит по пути атаки идем его атаковать
                if (nearPos_num != -1) {
                    UnitGiveOrder(unitComponent.unit,
                        settlements_enemyPositionOnBase[settlementId][nearPos_num],
                        UnitCommand.Attack,
                        AssignOrderMode.Replace);
                }
                // если юнит только появился
                else if (isAttackPathNull) {
                    // сначала идем на базу
                    UnitGiveOrder(unitComponent.unit,
                        world.settlements_castle_position[settlementId],
                        UnitCommand.Attack,
                        AssignOrderMode.Replace);
                    // потом на следующую точку
                    UnitGiveOrder(unitComponent.unit,
                        attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                        UnitCommand.Attack,
                        AssignOrderMode.Queue);
                } else {
                    // идем на следующую точку
                    UnitGiveOrder(unitComponent.unit,
                        attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                        UnitCommand.Attack,
                        AssignOrderMode.Queue);
                }
            }
            else {
                // если юнит бездействует
                if (unitComponent.unit.OrdersMind.IsIdle()) {
                    // идем на следующую точку
                    UnitGiveOrder(unitComponent.unit,
                        attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                        UnitCommand.Attack,
                        AssignOrderMode.Queue);
                }
            }
        }
    }
}

export function SpawnBuildingSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT) && entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT)) {
                var unitComponent          = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                // проверка, что юнит жив
                if (!unitComponent.unit || unitComponent.unit.IsDead) {
                    continue;
                }

                var spawnBuildingComponent = entity.components.get(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT) as SpawnBuildingComponent;

                // проверяем, что здание что-то строит
                if (unitComponent.unit.OrdersMind.ActiveAct.GetType().Name == "ActProduce") {
                    var buildingCfg = unitComponent.unit.OrdersMind.ActiveOrder.ProductUnitConfig;
                    // проверяем, если здание хочет сбросить таймер спавна
                    if (buildingCfg.Uid == world.configs["reset_spawn"].Uid) {
                        // отменяем постройку
                        unitComponent.unit.OrdersMind.CancelOrders(true);
                        // сбрасываем спавн
                        spawnBuildingComponent.spawnTact = gameTickNum + spawnBuildingComponent.spawnPeriodTact;
                    }
                }
                // проверяем, что зданию нужно задать таймер спавна
                if (spawnBuildingComponent.spawnTact < 0) {
                    spawnBuildingComponent.spawnTact = gameTickNum + spawnBuildingComponent.spawnPeriodTact;
                }
                // проверяем, что пора спавнить юнитов
                else if (spawnBuildingComponent.spawnTact < gameTickNum) {
                    spawnBuildingComponent.spawnTact += spawnBuildingComponent.spawnPeriodTact;
                    
                    var emergePoint = world.configs[unitComponent.cfgId].BuildingConfig.EmergePoint;

                    // спавним юнитов
                    var generator     = generateCellInSpiral(unitComponent.unit.Cell.X + emergePoint.X, unitComponent.unit.Cell.Y + emergePoint.Y);
                    var spawnedUnits  = spawnUnits(world.settlements[settlementId], world.configs[spawnBuildingComponent.spawnUnitConfigId], 1, UnitDirection.Down, generator);
                    for (var spawnedUnit of spawnedUnits) {
                        world.RegisterUnitEntity(spawnedUnit);
                    }
                }
            }
        }
    }
}

export function ReviveSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        // обрабатываем сущности с ReviveComponent и UnitComponent
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (entity.components.has(COMPONENT_TYPE.REVIVE_COMPONENT) && entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                var reviveComponent = entity.components.get(COMPONENT_TYPE.REVIVE_COMPONENT) as ReviveComponent;

                // проверяем, что юнит умер
                if (unitComponent.unit && !unitComponent.unit.IsDead) {
                    continue;
                }

                // юнит ждет воскрешения
                if (reviveComponent.waitingToRevive) {
                    // проверяем, что пришло время воксрешать
                    if (reviveComponent.tick < gameTickNum) {
                        reviveComponent.waitingToRevive = false;
                        var generator      = generateCellInSpiral(reviveComponent.point.X, reviveComponent.point.Y);
                        unitComponent.unit = spawnUnits(world.settlements[settlementId], world.configs[unitComponent.cfgId], 1, UnitDirection.Down, generator)[0];
                    }
                }
                // регистрируем смерть и запускаем обратный отсчет до воскрешения
                else {
                    reviveComponent.waitingToRevive = true;
                    reviveComponent.tick = gameTickNum + reviveComponent.reviveTicks;
                }
            }
        }
    }
}

export function UpgradableBuildingSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        // проверяем активацию улучшений
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT) && entity.components.has(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT)) {
                var unitComponent          = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                if (!unitComponent.unit || unitComponent.unit.IsDead) {
                    continue;
                }
                var upgradableBuildingComponent = entity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as UpgradableBuildingComponent;

                // проверяем, что здание что-то строит
                if (unitComponent.unit.OrdersMind.ActiveAct.GetType().Name == "ActProduce" &&
                    unitComponent.unit.OrdersMind.ActiveAct.ActiveMotion.LeftTime < 100) {
                    var buildingCfg = unitComponent.unit.OrdersMind.ActiveOrder.ProductUnitConfig;
                    
                    // проверяем, что здание строит улучшение
                    for (var upgradeId = 0; upgradeId < upgradableBuildingComponent.upgradeUnitCfgIds.length; upgradeId++) {
                        var upgradeUnitCfgId = upgradableBuildingComponent.upgradeUnitCfgIds[upgradeId];
                        
                        if (buildingCfg.Uid != world.configs[upgradeUnitCfgId].Uid) {
                            continue;
                        }

                        // заменяем постройку на улучшенную
                        let replaceParams = new ReplaceUnitParameters();
                        replaceParams.OldUnit = unitComponent.unit;
                        replaceParams.NewUnitConfig = world.configs[upgradableBuildingComponent.upgradeCfgIds[upgradeId]];
                        replaceParams.Cell = null;                   // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
                        replaceParams.PreserveHealthLevel = false;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
                        replaceParams.PreserveOrders = false;        // Нужно ли передать приказы?
                        replaceParams.Silent = true;                 // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
                        
                        let upgradedUnit = unitComponent.unit.Owner.Units.ReplaceUnit(replaceParams);

                        // регистрируем новую постройку
                        world.RegisterUnitEntity(upgradedUnit);

                        // создаем эффект улучшения
                        spawnDecoration(world.realScena, HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_BigDust"), upgradedUnit.Position);
                        break;
                    }
                }
            }
        }
    }
}

export function BuffSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (!entity.components.has(COMPONENT_TYPE.BUFF_COMPONENT) ||
                !entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                continue;
            }

            var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            var buffComponent = entity.components.get(COMPONENT_TYPE.BUFF_COMPONENT) as BuffComponent;
            
            // проверяем, что юнит кого-то бьет
            if (!unitComponent.unit.OrdersMind.ActiveOrder.Target) {
                continue;
            }

            var target_CfgUid = unitComponent.unit.OrdersMind.ActiveOrder.Target.Cfg.Uid;

            // проверяем, что цель можно баффать
            if (!world.cfgUid_entity.has(target_CfgUid)) {
                continue;
            }
            var targetBaseEntity = world.cfgUid_entity.get(target_CfgUid) as Entity;
            if (!targetBaseEntity.components.has(COMPONENT_TYPE.BUFFABLE_COMPONENT)) {
                continue;
            }
            var targetBuffComponent = targetBaseEntity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffComponent;
            if (targetBuffComponent.buffType != BUFF_TYPE.EMPTY) {
                continue;
            }

            var target_settlementId = unitComponent.unit.OrdersMind.ActiveOrder.Target.Owner.Uid;

            // ищем сущность цели
            var target_entityId : number = -1;
            for (var k = 0; k < world.settlements_entities[target_settlementId].length; k++) {
                var tentity = world.settlements_entities[target_settlementId][k] as Entity;
                if (tentity.components.has(COMPONENT_TYPE.UNIT_COMPONENT) &&
                    tentity.components.has(COMPONENT_TYPE.BUFFABLE_COMPONENT)) {
                    var tunitComponent = tentity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                    if (tunitComponent.unit.Id == unitComponent.unit.OrdersMind.ActiveOrder.Target.Id) {
                        target_entityId = k;
                        break;
                    }
                }
            }
            if (target_entityId == -1) {
                continue;
            }

            // все юнита можно бафать

            // убиваем духа
            {
                var battleMind = unitComponent.unit.BattleMind;
                battleMind.InstantDeath(null, UnitDeathType.Mele);
            }

            var target_entity = world.settlements_entities[target_settlementId][target_entityId] as Entity;
            var target_unitComponent = target_entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            var target_buffableComponent = target_entity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;

            // бафаем цель

            // обновляем конфиг баффнутого юнита
            var cloneCFG  = HordeContentApi.CloneConfig(world.configs[target_unitComponent.cfgId]);
            var spawnCount = 1;
            switch (buffComponent.buffType) {
                case BUFF_TYPE.ATTACK:
                    ScriptUtils.SetValue(cloneCFG, "TintColor", createHordeColor(150, 150, 0, 0));
                    ScriptUtils.SetValue(cloneCFG.MainArmament.BulletCombatParams, "Damage", 5*cloneCFG.MainArmament.BulletCombatParams.Damage);
                    ScriptUtils.SetValue(cloneCFG, "Sight", 14);
                    if (cloneCFG.MainArmament.Range > 1) {
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "EmitBulletsCountMin", 10);
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "EmitBulletsCountMax", 10);
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "Range", Math.max(11, cloneCFG.MainArmament.Range + 2));
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "BaseAccuracy", 0);
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "MaxDistanceDispersion", 300);
                    }
                    break;
                case BUFF_TYPE.HEALTH:
                    ScriptUtils.SetValue(cloneCFG, "TintColor", createHordeColor(150, 0, 150, 0));
                    ScriptUtils.SetValue(cloneCFG, "MaxHealth", 10*cloneCFG.MaxHealth);
                    break;
                case BUFF_TYPE.DEFFENSE:
                    ScriptUtils.SetValue(cloneCFG, "TintColor", createHordeColor(150, 255, 215, 0));
                    ScriptUtils.SetValue(cloneCFG, "MaxHealth", 2*cloneCFG.MaxHealth);
                    ScriptUtils.SetValue(cloneCFG, "Shield", Math.max(cloneCFG.Shield, 390));
                    ScriptUtils.SetValue(cloneCFG, "Flags", mergeFlags(UnitFlags, cloneCFG.Flags, UnitFlags.FireResistant, UnitFlags.MagicResistant));
                    break;
                case BUFF_TYPE.CLONING:
                    ScriptUtils.SetValue(cloneCFG, "TintColor", createHordeColor(150, 255, 255, 255));
                    spawnCount = 12;
                    break;
            }
            
            // создаем дополнительных баффнутых юнитов
            if (spawnCount > 1) {
                var generator    = generateCellInSpiral(target_unitComponent.unit.Cell.X, target_unitComponent.unit.Cell.Y);
                var spawnedUnits = spawnUnits(world.settlements[target_settlementId], cloneCFG, spawnCount - 1, UnitDirection.Down, generator);
                for (var spawnedUnit of spawnedUnits) {
                    var newEntity              = world.RegisterUnitEntity(spawnedUnit, target_entity);
                    // устанавливаем информацию о баффе и о бафнутом конфиге
                    var buffableComponent      = newEntity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;
                    buffableComponent.buffType = buffComponent.buffType;
                    buffableComponent.buffCfg  = null;
                    // запрещаем команды
                    UnitDisallowCommands(spawnedUnit);
                    // создаем эффект появления
                    spawnDecoration(world.realScena, HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), spawnedUnit.Position);
                }
            }

            // заменяем текущего юнита на баффнутого
            let replaceParams = new ReplaceUnitParameters();
            replaceParams.OldUnit = target_unitComponent.unit;
            replaceParams.NewUnitConfig = cloneCFG;
            replaceParams.Cell = null;                   // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
            replaceParams.PreserveHealthLevel = false;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
            replaceParams.PreserveOrders = true;        // Нужно ли передать приказы?
            replaceParams.Silent = true;                 // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
            target_unitComponent.unit = target_unitComponent.unit.Owner.Units.ReplaceUnit(replaceParams);
            // записываем инфу о баффе (конфиг записывает только для 1-ого, чтобы корректно удалился он)
            target_buffableComponent.buffCfg = cloneCFG;
            target_buffableComponent.buffType = buffComponent.buffType;
            // создаем эффект появления
            spawnDecoration(world.realScena, HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), target_unitComponent.unit.Position);
        }
    }
}

export function UnitProducedSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (!entity.components.has(COMPONENT_TYPE.UNIT_PRODUCED_EVENT)) {
                continue;
            }

            var unitProducedEvent = entity.components.get(COMPONENT_TYPE.UNIT_PRODUCED_EVENT) as UnitProducedEvent;

            // дожидаемся полной постройки юнита
            if (unitProducedEvent.producedUnit.EffectsMind.BuildingInProgress) {
                continue;
            }

            // проверяем, что у нового юнита есть сущность
            if (world.cfgUid_entity.has(unitProducedEvent.producedUnit.Cfg.Uid)) {
                world.RegisterUnitEntity(unitProducedEvent.producedUnit);
            }

            // удаляем событие
            entity.components.delete(COMPONENT_TYPE.UNIT_PRODUCED_EVENT);
        }
    }
}

// function HeroAltarSystem(gameTickNum: number) {
//     for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
//         if (!world.IsSettlementInGame(settlementId)) {
//             continue;
//         }

//         for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
//             var entity = world.settlements_entities[settlementId][i] as Entity;
//             if (!entity.components.has(COMPONENT_TYPE.HERO_ALTAR_COMPONENT)) {
//                 continue;
//             }
//             var heroAltarComponent = entity.components.get(COMPONENT_TYPE.HERO_ALTAR_COMPONENT) as HeroAltarComponent;
//             var unitComponent      = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

//             // если герой не выбран
//             if (heroAltarComponent.selectedHeroNum < 0) {
//                 // проверяем, что алтарь что-то строит
//                 if (unitComponent.unit.OrdersMind.ActiveAct.GetType().Name == "ActProduce") {
//                     // выбираем героя
//                     var productUnitCfg = unitComponent.unit.OrdersMind.ActiveOrder.ProductUnitConfig;
                    
//                     for (var heroNum = 0; heroNum < heroAltarComponent.heroesCfgIdxs.length; heroNum++) {
//                         if (world.configs[heroAltarComponent.heroesCfgIdxs[heroNum]].Uid == productUnitCfg.Uid) {
//                             heroAltarComponent.selectedHeroNum = heroNum;
//                             break;
//                         }
//                     }
                    
//                     // отменяем постройку
//                     unitComponent.unit.OrdersMind.CancelOrders(true);

//                     // запрещаем постройку
//                     var commandsMind       = unitComponent.unit.CommandsMind;
//                     var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");
//                     if (disallowedCommands.ContainsKey(UnitCommand.Produce)) disallowedCommands.Remove(UnitCommand.Produce);
//                     disallowedCommands.Add(UnitCommand.Produce, 1);
//                     //log.info(disallowedCommands.Item.get(UnitCommand.Produce));
//                     ScriptUtils.GetValue(unitComponent.unit, "Model").ProfessionsData.Remove(UnitProfession.UnitProducer)

//                     // регистрируем героя
//                     world.configs["hero_" + settlementId] = HordeContentApi.CloneConfig(world.configs[heroAltarComponent.heroesCfgIdxs[heroAltarComponent.selectedHeroNum]]);
//                     // делаем подходящий цвет
//                     log.info("делаем подходящий цвет героя");
                    
//                     // точка спавна относительно юнита
//                     var emergePoint = world.configs[unitComponent.cfgId].BuildingConfig.EmergePoint;

//                     // регистрируем героя
//                     var heroEntity = new Entity();
//                     heroEntity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "hero_" + settlementId));
//                     heroEntity.components.set(COMPONENT_TYPE.HERO_COMPONENT, new HeroComponent(entity));
//                     heroEntity.components.set(COMPONENT_TYPE.REVIVE_COMPONENT,
//                         new ReviveComponent(new Point(unitComponent.unit.Cell.X + emergePoint.X, unitComponent.unit.Cell.Y + emergePoint.Y),
//                         50*60, gameTickNum));
//                     world.settlements_entities[settlementId].push(heroEntity);

//                     // делаем ссылку
//                     heroAltarComponent.heroEntity = heroEntity;
//                 }
//             } else {

//             }
//         }
//     }
// }
