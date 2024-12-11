import { inspect, inspectEnum, inspectFlagEnum } from "library/common/introspection";
import { isNetworkGame, isReplayMode } from "library/game-logic/game-tools";
import { UnitAnimState, UnitLifeState } from "library/game-logic/horde-types";
import HordeExampleBase from "./base-example";

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


/**
 * Пример использования .Net-типов в скриптах
 * 
 * См. также документацию и пример использования ExtendedHostFunctions
 * https://microsoft.github.io/ClearScript/Reference/html/T_Microsoft_ClearScript_ExtendedHostFunctions.htm
 * https://microsoft.github.io/ClearScript/Tutorial/FAQtorial.html (см. пункт 24)
 */
export class Example_ImportDotNetTypes extends HordeExampleBase {

    public constructor() {
        super("Import .Net types");
    }

    public onFirstRun() {
        this.logMessageOnRun();
        
        let List = xHost.type('System.Collections.Generic.List');
        let DayOfWeek = xHost.type('System.DayOfWeek');
        let week = new List(DayOfWeek, 7);
        week.Add(DayOfWeek.Sunday);
        
        this.log.info("DayOfWeek:", week[0]);
    }
}
