import { createGameMessageWithNoSound } from "library/common/messages";
import { generateCellInSpiral } from "library/common/position-tools";
import { createHordeColor, createResourcesAmount } from "library/common/primitives";
import { mergeFlags } from "library/dotnet/dotnet-utils";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { UnitCommand, UnitDirection, UnitFlags, DiplomacyStatus } from "library/game-logic/horde-types";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { COMPONENT_TYPE, UnitComponent, BuffableComponent, BUFF_TYPE, SettlementComponent, IncomeIncreaseEvent, IncomeIncreaseComponent, IncomeEvent, IncomeLimitedPeriodicalComponent, Entity, AttackingAlongPathComponent, SpawnBuildingComponent, ReviveComponent, UpgradableBuildingComponent, UpgradableBuildingEvent, BuffEvent, BuffComponent, UnitProducedEvent } from "../Components/ESC_components";
import { Cell, distance_Chebyshev, UnitGiveOrderToNearEmptyCell, UnitDisallowCommands, spawnUnits } from "../Utils";
import { GameState, World } from "../World";
import { createPF } from "library/common/primitives";
import { log } from "library/common/logging";

const ReplaceUnitParameters = HCL.HordeClassLibrary.World.Objects.Units.ReplaceUnitParameters;

export function DiplomacySystem(world: World, gameTickNum: number) {
    // проверяем, что игра закончилась

    var isGameEnd = true;
    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.settlements[settlementId]) {
            continue;
        }
        if (!world.settlements[settlementId].Existence.IsTotalDefeat && !world.settlements[settlementId].Existence.IsVictory) {
            isGameEnd = false;
            break;
        }
    }
    if (isGameEnd) {
        world.state = GameState.CLEAR;
        return;
    }

    // при уничтожении замка объявляем альянс всем врагам для видимости

    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.settlements[settlementId] ||
            world.settlements[settlementId].Existence.IsTotalDefeat ||
            world.settlements[settlementId].Existence.IsVictory ||
            !world.settlements_castleUnit[settlementId].IsDead) {
            continue;
        }

        // объявляем альянс всем врагам для видимости
        for (var enemySettlementId = 0; enemySettlementId < world.settlementsCount; enemySettlementId++) {
            if (!world.settlements[enemySettlementId] || 
                !world.settlements_settlements_warFlag[settlementId][enemySettlementId]) {
                continue;
            }
            if (world.settlements[settlementId].Diplomacy.DeclareAlliance(world.settlements[enemySettlementId])
                 != DiplomacyStatus.Alliance) {
                world.settlements[settlementId].Diplomacy.DeclareAlliance(world.settlements[enemySettlementId]);
                world.settlements[enemySettlementId].Diplomacy.DeclareAlliance(world.settlements[settlementId]);
            }
        }
    }

    // присуждаем поражение альянсам

    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.settlements[settlementId] ||
            world.settlements[settlementId].Existence.IsTotalDefeat ||
            world.settlements[settlementId].Existence.IsVictory) {
            continue;
        }

        // проверяем, что у всего альянса замки уничтожены

        var isDefeat = true;
        for (var allySettlementId = 0; allySettlementId < world.settlementsCount; allySettlementId++) {
            // проверка, что есть мир и замок стоит
            if (!world.settlements[allySettlementId] ||
                world.settlements_settlements_warFlag[settlementId][allySettlementId] ||
                world.settlements_castleUnit[allySettlementId].IsDead) {
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
        for (var allySettlementId = 0; allySettlementId < world.settlementsCount; allySettlementId++) {
            // проверка, что поселение в игре и есть мир
            if (!world.settlements[allySettlementId] ||
                world.settlements_settlements_warFlag[settlementId][allySettlementId]) {
                continue;
            }

            // присуждаем поражение
            world.settlements[allySettlementId].Existence.ForceTotalDefeat();
        }
    }

    // присуждаем победу последнему альянсу

    for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
        if (!world.settlements[settlementId] ||
            world.settlements[settlementId].Existence.IsTotalDefeat ||
            world.settlements[settlementId].Existence.IsVictory) {
            continue;
        }

        // проверяем, что у всех врагов поражение

        var isVictory = true;
        for (var enemySettlementId = 0; enemySettlementId < world.settlementsCount; enemySettlementId++) {
            // проверка, что поселение в игре, есть война, поселение проиграло
            if (!world.settlements[enemySettlementId] ||
                !world.settlements_settlements_warFlag[settlementId][enemySettlementId] ||
                world.settlements[enemySettlementId].Existence.IsTotalDefeat
            ) {
                continue;
            }

            isVictory = false;
        }
        if (!isVictory) {
            continue;
        }

        // присуждаем победу всему альянсу

        for (var allySettlementId = 0; allySettlementId < world.settlementsCount; allySettlementId++) {
            // проверка, что поселение в игре и есть мир
            if (!world.settlements[allySettlementId] ||
                world.settlements_settlements_warFlag[settlementId][allySettlementId]) {
                continue;
            }

            // присуждаем победу
            if (!world.settlements[allySettlementId].Existence.IsVictory) {
                world.settlements[allySettlementId].Existence.ForceVictory();
            }
        }

        break;
    }
}

export function WordClearSystem(world: World, gameTickNum: number) {
    // если сейчас идет очистка мира, то удаляем кастомные конфиги
    if (world.state == GameState.CLEAR) {
        for (var cfgId in world.configs) {
            HordeContentApi.RemoveConfig(world.configs[cfgId]);
            delete world.configs[cfgId];
        }
    }

    var killUnitsCount = 0;

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

        // если замок уничтожен или очистка игры, то удаляем всех юнитов
        if (world.state == GameState.CLEAR ||
            (world.settlements_castleUnit[settlementId] &&
             world.settlements_castleUnit[settlementId].IsDead)) {
            // уничтожаем замок если жив

            if (!world.settlements_castleUnit[settlementId].IsDead) {
                world.settlements_castleUnit[settlementId].Delete()
                killUnitsCount++;
            }

            // убиваем всех юнитов, чтобы их почистила система очистки

            var unitsEnumerator = world.settlements[settlementId].Units.GetEnumerator();
            while (unitsEnumerator.MoveNext()) {
                var unit = unitsEnumerator.Current;

                if (unit.IsDead) {
                    continue;
                }

                unit.Delete();
                killUnitsCount++;
            }
            unitsEnumerator.Dispose();
        }
    }

    // если сейчас идет очистка и ни один юнит не убит, то объявляем конец игры
    if (killUnitsCount == 0 && world.state == GameState.CLEAR) {
        world.state = GameState.END;
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
                    var spawnedUnits  = spawnUnits(world.settlements[settlementId], world.configs[spawnBuildingComponent.spawnUnitConfigId], world.spawn_count_coeff, UnitDirection.Down, generator);
                    for (var spawnedUnit of spawnedUnits) {
                        UnitDisallowCommands(spawnedUnit);
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
                        var generator      = generateCellInSpiral(reviveComponent.cell.X, reviveComponent.cell.Y);
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
            var targetBuffableComponent = targetBaseEntity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;
            if (targetBuffableComponent.buffType != BUFF_TYPE.EMPTY) {
                continue;
            }
            if (!targetBuffableComponent.buffMask[buffComponent.buffType]) {
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
                unitComponent.unit.Delete();
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
                    ScriptUtils.SetValue(cloneCFG, "Name", cloneCFG.Name + "\n{атака}");
                    ScriptUtils.SetValue(cloneCFG, "TintColor", createHordeColor(150, 150, 0, 0));
                    ScriptUtils.SetValue(cloneCFG.MainArmament.ShotParams, "Damage", Math.min(1000, 5*cloneCFG.MainArmament.ShotParams.Damage));
                    ScriptUtils.SetValue(cloneCFG, "Sight", Math.min(13, cloneCFG.Sight + 2));
                    if (cloneCFG.MainArmament.Range > 1) {
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "EmitBulletsCountMin", Math.min(5, cloneCFG.MainArmament.EmitBulletsCountMin + 2));
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "EmitBulletsCountMax", Math.min(5, cloneCFG.MainArmament.EmitBulletsCountMax + 2));
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "Range", Math.min(13, cloneCFG.MainArmament.Range + 2));
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "ForestRange", Math.min(13, cloneCFG.MainArmament.ForestRange + 2));
                        ScriptUtils.SetValue(cloneCFG, "OrderDistance", Math.min(13, cloneCFG.OrderDistance + 2));
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "BaseAccuracy", 0);
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "MaxDistanceDispersion", 300);
                    }
                    break;
                case BUFF_TYPE.ACCURACY:
                    ScriptUtils.SetValue(cloneCFG, "Name", cloneCFG.Name + "\n{меткость}");
                    ScriptUtils.SetValue(cloneCFG, "TintColor", createHordeColor(150, 148, 0, 211));
                    //ScriptUtils.SetValue(cloneCFG, "Sight", 3*cloneCFG.Sight);
                    ScriptUtils.SetValue(cloneCFG, "Sight", Math.min(14, cloneCFG.Sight + 4));
                    if (cloneCFG.MainArmament.Range > 1) {
                        ScriptUtils.SetValue(cloneCFG, "ReloadTime", 2*cloneCFG.ReloadTime);
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "ReloadTime", 2*cloneCFG.MainArmament.ReloadTime);
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "Range", 2*cloneCFG.MainArmament.Range);
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "ForestRange", 2*cloneCFG.MainArmament.ForestRange);
                        ScriptUtils.SetValue(cloneCFG, "OrderDistance", 2*cloneCFG.OrderDistance);
                        ScriptUtils.SetValue(cloneCFG.MainArmament, "DisableDispersion", true);
                        ScriptUtils.SetValue(cloneCFG.MainArmament.ShotParams, "AdditiveBulletSpeed", createPF(30, 0));
                    }
                    break;
                case BUFF_TYPE.HEALTH:
                    ScriptUtils.SetValue(cloneCFG, "Name", cloneCFG.Name + "\n{здоровье}");
                    ScriptUtils.SetValue(cloneCFG, "TintColor", createHordeColor(150, 0, 150, 0));
                    ScriptUtils.SetValue(cloneCFG, "MaxHealth", Math.min(200000, 10*cloneCFG.MaxHealth));
                    break;
                case BUFF_TYPE.DEFFENSE:
                    ScriptUtils.SetValue(cloneCFG, "Name", cloneCFG.Name + "\n{защита}");
                    ScriptUtils.SetValue(cloneCFG, "TintColor", createHordeColor(150, 255, 215, 0));
                    ScriptUtils.SetValue(cloneCFG, "MaxHealth", 2*cloneCFG.MaxHealth);
                    ScriptUtils.SetValue(cloneCFG, "Shield", Math.max(390, cloneCFG.Shield));
                    ScriptUtils.SetValue(cloneCFG, "Flags", mergeFlags(UnitFlags, cloneCFG.Flags, UnitFlags.FireResistant, UnitFlags.MagicResistant));
                    break;
                case BUFF_TYPE.CLONING:
                    ScriptUtils.SetValue(cloneCFG, "Name", cloneCFG.Name + "\n{клонирования}");
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
            if (target_unitComponent.unit.IsAlive) {
                let replaceParams = new ReplaceUnitParameters();
                replaceParams.OldUnit = target_unitComponent.unit;
                replaceParams.NewUnitConfig = cloneCFG;
                replaceParams.Cell = null;                   // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
                replaceParams.PreserveHealthLevel = false;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
                replaceParams.PreserveOrders = false;        // Нужно ли передать приказы?
                replaceParams.Silent = true;                 // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
                target_unitComponent.unit = target_unitComponent.unit.Owner.Units.ReplaceUnit(replaceParams);
                // записываем инфу о баффе (конфиг записывает только для 1-ого, чтобы корректно удалился он)
                target_buffableComponent.buffType = buffComponent.buffType;
                target_buffableComponent.buffCfg  = cloneCFG;
                // запрещаем команды
                UnitDisallowCommands(target_unitComponent.unit);
                // создаем эффект появления
                spawnDecoration(world.realScena, HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), target_unitComponent.unit.Position);
            } else {
                var generator    = generateCellInSpiral(target_unitComponent.unit.Cell.X, target_unitComponent.unit.Cell.Y);
                var spawnedUnits = spawnUnits(world.settlements[target_settlementId], cloneCFG, 1, UnitDirection.Down, generator);
                for (var spawnedUnit of spawnedUnits) {
                    var newEntity              = world.RegisterUnitEntity(spawnedUnit, target_entity);
                    // устанавливаем информацию о баффе и о бафнутом конфиге
                    var buffableComponent      = newEntity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;
                    buffableComponent.buffType = buffComponent.buffType;
                    buffableComponent.buffCfg  = cloneCFG;
                    // запрещаем команды
                    UnitDisallowCommands(spawnedUnit);
                    // создаем эффект появления
                    spawnDecoration(world.realScena, HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), spawnedUnit.Position);
                }
            }
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
