import { inspect, inspectEnum, inspectFlagEnum } from "library/common/introspection";
import { isNetworkGame, isReplayMode } from "library/game-logic/game-tools";
import { UnitAnimState, UnitLifeState } from "library/game-logic/horde-types";
import HordeExampleBase from "./base-example";
import { BooleanT, StringT } from "library/dotnet/dotnet-types";

/**
 * Пример работы с данными игры
 */
export class Example_GameWorks extends HordeExampleBase {

    public constructor() {
        super("Game works");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        // Инфо по тактам
        const BattleController = HordeResurrection.Engine.Logic.Battle.BattleController;
        this.log.info('Текущий такт:', BattleController.GameTimer.GameFramesCounter);
        this.log.info('Текущий FPS:', BattleController.GameTimer.CurrentFpsLimit);

        // Режим игры
        if (isNetworkGame()) {
            this.log.info('В данный момент идет сетевое сражение');
        } else {
            this.log.info('В данный момент идет одиночное сражение');
        }

        // Сейчас воспроизводится реплей?
        if (isReplayMode()) {
            this.log.info('В данный момент идет воспроизведение реплея (проверка 1)');
        }

        // Инфо по реплею
        const ReplayWorkMode = HordeResurrection.Engine.Logic.Battle.ReplaySystem.ReplayWorkMode;
        let replayWorkMode = BattleController.ReplayModuleWorkMode;
        if (replayWorkMode == ReplayWorkMode.Play) {
            this.log.info('В данный момент идет воспроизведение реплея (проверка 2)');
        } else if (replayWorkMode == ReplayWorkMode.Record) {
            this.log.info('В данный момент запущена запись реплея');
        } else {
            this.log.info('В данный момент невозможно определить статус реплея:', '"' + replayWorkMode + '"');
        }
        
        // Отключение ввода ботов в режиме реплея (может быть использовано для отладки бота и MasterMind)
        if (BattleController.IsReplayMode) {
            this.log.info("Отключение ввода бота в реплее.");
            BattleController.InputModule.AllowBotInput = false;
        }
    }
}

/**
 * Пример интроспекции объектов.
 * Если убрать if-false, то в логи будет записана структура API Орды
 */
export class Example_Introspection extends HordeExampleBase {

    public constructor() {
        super("Introspection");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        // Проверка типа (актуально не только для примитивных типов, но и для других типов из ядра)
        let someObject = "any string";
        this.log.info("Является ли переменная 'someObject' объектом типа 'Boolean'? Ответ:", host.isType(BooleanT, someObject));
        this.log.info("Является ли переменная 'someObject' объектом типа 'String'? Ответ:", host.isType(StringT, someObject));

        // Пример: имеется объект класса SettlementUnits, нужно узнать все его члены
        let settlementUnits = Players[0].GetRealPlayer().GetRealSettlement().Units;
        if (true) inspect(settlementUnits, 1, ".Net-объект с юнитами поселения");

        // Пример: вывод элементов enum-типа
        if (true) inspectEnum(UnitAnimState);

        // Пример: вывод элементов enum-типа (для флагов)
        if (true) inspectFlagEnum(UnitLifeState);
    }
}
