import { createGameMessageWithNoSound } from "library/common/messages";
import { createHordeColor, createResourcesAmount } from "library/common/primitives";
import { World } from "../World";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { IncomeEvent } from "../Components/IncomeEvent";
import { IncomeIncreaseEvent } from "../Components/IncomeIncreaseEvent";
import { IncomeLimitedPeriodicalComponent } from "../Components/IncomeLimitedPeriodicalComponent";
import { SettlementComponent } from "../Components/SettlementComponent";

export function IncomeSystem(world: World, gameTickNum: number) {
    // учитываем события увеличения инкома
    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
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
                    //var incomeIncreaseComponent = entity.components.get(COMPONENT_TYPE.INCOME_INCREASE_COMPONENT) as IncomeIncreaseComponent;
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
