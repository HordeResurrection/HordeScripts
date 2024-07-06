import { activePlugins } from "active-plugins";


/**
 * Регистрация примеров для запуска.
 */
export function registerExamples() {
    // Здесь можно указать любой пример для запуска. См. все примеры в "allExamples()"

    // Например:
    //addExample(new Example_SpawnBulletsRain());
    //addExample(new Example_CustomUnit());

    // Так же можно запустить сразу все примеры:
    //allExamples();
}


/**
 * Здесь перечислены все примеры.
 */
export function allExamples() {
    // - Примеры из файла 'other-examples.ts'
    addExample(new Example_GameWorks());
    addExample(new Example_Introspection());
    addExample(new Example_ImportDotNetTypes());

    // - Примеры работы c данными игрока
    addExample(new Example_PlayerWorks());
    addExample(new Example_PlayerSelectedSquad());

    // - Примеры работы с игровой логикой
    addExample(new Example_IterateBullets());  // В этом примере выполняется перечисление новых снарядов на сцене
    addExample(new Example_SpawnOneBullet());
    addExample(new Example_SpawnBulletsRain());
    addExample(new Example_SpawnUnit());
    addExample(new Example_ReplaceUnit());
    addExample(new Example_UnitWorks());
    addExample(new Example_UnitOrders());
    addExample(new Example_UnitCheckPath());
    addExample(new Example_UnitEnumerateEvents());  // В этом примере выполняется перечисление событий произошедших с тестовым юнитом
    addExample(new Example_ScenaWorks());
    addExample(new Example_SettlementWorks());
    addExample(new Example_SettlementResources());
    addExample(new Example_SettlementUnitsInfo());
    addExample(new Example_SettlementTaxAndSalary());
    addExample(new Example_SettlementPeopleIncome());
    addExample(new Example_SettlementProductionFactor());
    addExample(new Example_SettlementDiplomacy());
    addExample(new Example_SettlementResourcesBonus());
    addExample(new Example_PathFind());

    // - Примеры перечисления юнитов в области
    addExample(new Example_GetUnitsInArea_Bruteforce());
    addExample(new Example_GetUnitsInArea_Squad());
    addExample(new Example_GetUnitsInArea_KdTree());

    // - Примеры по MasterMind
    addExample(new Example_InputLowLevel());
    addExample(new Example_InputHiLevel());
    addExample(new Example_MasterMindRequest());

    // - Примеры работы с конфигами
    addExample(new Example_ConfigWorks());
    addExample(new Example_ConfigCreation());
    addExample(new Example_ConfigRemoving());

    // - Примеры работы с сообщениями
    addExample(new Example_SendMessageToAll());
    addExample(new Example_HookSentChatMessages());
    addExample(new Example_HookReceivedChatMessages());

    // - Примеры кастомных объектов
    addExample(new Example_CustomBullet());
    addExample(new Example_CustomUnit());
    addExample(new Example_CustomUnitCommand());
    addExample(new Example_CustomUnitCanBePlaced());
}


/**
 * Регистрирует пример для запуска.
 */
function addExample(example: HordeExampleBase){
    activePlugins.register(example);
}


import HordeExampleBase from "examples/base-example";
import { Example_IterateBullets } from "./examples/bullet-iterate";
import { Example_SpawnOneBullet } from "./examples/bullet-spawn-one";
import { Example_SpawnBulletsRain } from "./examples/bullet-spawn-rain";
import { Example_ConfigCreation, Example_ConfigRemoving, Example_ConfigWorks } from "./examples/config-examples";
import { Example_InputHiLevel } from "./examples/mastermind-input-hi-level";
import { Example_InputLowLevel } from "./examples/mastermind-input-low-level";
import { Example_MasterMindRequest } from "./examples/mastermind-request";
import { Example_HookReceivedChatMessages, Example_HookSentChatMessages, Example_SendMessageToAll } from "./examples/message-examples";
import { Example_GameWorks, Example_ImportDotNetTypes, Example_Introspection } from "./examples/other-examples";
import { Example_PlayerWorks } from "./examples/player-examples";
import { Example_ScenaWorks } from "./examples/scena-examples";
import { Example_SettlementWorks, Example_SettlementResources, Example_SettlementUnitsInfo } from "./examples/settlement-examples";
import { Example_UnitEnumerateEvents, Example_UnitOrders, Example_UnitWorks } from "./examples/unit-examples";
import { Example_GetUnitsInArea_Bruteforce, Example_GetUnitsInArea_KdTree, Example_GetUnitsInArea_Squad } from "./examples/unit-get-in-area";
import { Example_SpawnUnit } from "./examples/unit-spawn-example";
import { Example_CustomBullet } from "./examples/custom-bullet-example";
import { Example_CustomUnit } from "./examples/custom-unit-example";
import { Example_SettlementTaxAndSalary } from "examples/settlement-tax-and-salary";
import { Example_CustomUnitCommand } from "examples/custom-unit-command";
import { Example_SettlementPeopleIncome } from "examples/settlement-people-income";
import { Example_SettlementDiplomacy } from "examples/settlement-diplomacy";
import { Example_SettlementProductionFactor } from "examples/settlement-production-factor";
import { Example_ReplaceUnit } from "examples/unit-replace";
import { Example_UnitCheckPath } from "examples/unit-path-example";
import { Example_PlayerSelectedSquad } from "examples/player-selected-squad";
import { Example_CustomUnitCanBePlaced } from "examples/custom-unit-can-be-placed";
import { Example_PathFind } from "examples/path-find-example";
import { Example_SettlementResourcesBonus } from "examples/settlement-resources-bonus";

