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
        const BattleController = HordeEngine.HordeResurrection.Engine.Logic.Battle.BattleController;
        this.log.info('Текущий такт:', BattleController.GameTimer.GameFramesCounter);
        this.log.info('Текущий FPS:', BattleController.GameTimer.CurrentFpsLimit);

        // Режим игры
        if (isNetworkGame()) {
            this.log.info('В данный момент идет сетевое сражение');
        } else {
            this.log.info('В данный момент идет одиночное сражение');
        }

        // Реплей? (недоступно при инициализации сцены, т.е. в onFirstRun)
        if (isReplayMode()) {
            this.log.info('В данный момент идет воспроизведение реплея (проверка 1)');
        }

        // Инфо по реплею (недоступно при инициализации сцены, т.е. в onFirstRun)
        const ReplayWorkMode = HordeEngine.HordeResurrection.Engine.Logic.Battle.ReplaySystem.ReplayWorkMode;
        let replayWorkMode = BattleController.ReplayModuleWorkMode;
        if (replayWorkMode == ReplayWorkMode.Play) {
            this.log.info('В данный момент идет воспроизведение реплея (проверка 2)');
        } else if (replayWorkMode == ReplayWorkMode.Record) {
            this.log.info('В данный момент запущена запись реплея');
        } else {
            this.log.info('В данный момент невозможно определить статус реплея:', '"' + replayWorkMode + '"', '(Недоступно в момент инициализации сражения)');
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

        // Remove false-condition to reveal the Horde API structure
        if (false) inspect(HordeAPI, 1, "Horde API structure (в разработке)");
        if (false) inspect(HCL, 5, "HordeClassLibrary (полный доступ)");
        if (true) inspect(Players["0"].GetRealPlayer().GetRealSettlement().Units, 1, ".Net объект с юнитами поселения");

        // Пример получения содержимого в enum-типах
        if (true) inspectEnum(UnitAnimState);

        // Пример получения содержимого в enum-типах, которые флаги
        if (true) inspectFlagEnum(UnitLifeState);
    }
}
