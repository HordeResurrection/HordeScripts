import { createPoint } from "library/common/primitives";
import { inspectEnum } from "library/common/introspection";
import { Player, Unit, UnitCommand } from "library/game-logic/horde-types";
import { AssignOrderMode, PlayerVirtualInput, VirtualSelectUnitsMode } from "library/mastermind/virtual-input";
import HordeExampleBase from "./base-example";

/**
 * Пример имитации ввода игрока
 */
export class Example_InputLowLevel extends HordeExampleBase {
    player: Player;
    playerVirtualInput: PlayerVirtualInput;

    public constructor() {
        super("Input low-level");

        this.player = Players[0].GetRealPlayer();
        this.playerVirtualInput = new PlayerVirtualInput(this.player);
    }

    public onFirstRun() {
        this.logMessageOnRun();

        this.log.info('Список всех команд юнитов');
        inspectEnum(UnitCommand);

        // Запуск различных примеров ввода
        this.basicInputExample();
        this.basicInputExample2();
        this.trainWorker();
        this.buildBuilding();

        // Прочее
        this.showSelectedUnits();
    }

    private basicInputExample() {
        this.log.info('Пример имитации ввода');
        this.log.info('- Выделение юнитов в области');
        this.playerVirtualInput.selectUnits(createPoint(0, 0), createPoint(15, 15));

        this.log.info('- Добавление к выделению юнитов в области (shift)');
        this.playerVirtualInput.selectUnits(createPoint(18, 18), createPoint(20, 20), VirtualSelectUnitsMode.Include);

        this.log.info('- Убрать из текущего выделения юнитов из области (ctrl)');
        this.playerVirtualInput.selectUnits(createPoint(18, 18), createPoint(18, 18), VirtualSelectUnitsMode.Exclude);

        this.log.info('- Клик правой кнопкой');
        this.playerVirtualInput.smartClick(createPoint(9, 9));

        this.log.info('- Команда атаки (в очередь)');
        this.playerVirtualInput.pointBasedCommand(createPoint(19, 19), UnitCommand.Attack, AssignOrderMode.Queue);

        this.log.info('- Команда "идти и атаковать" (в очередь)');
        this.playerVirtualInput.pointBasedCommand(createPoint(20, 5), UnitCommand.Attack, AssignOrderMode.Queue, true);

        this.log.info('- Имитация нажатия созданных элементов ввода');
        this.playerVirtualInput.commit();
    }

    private basicInputExample2() {
        this.log.info('Второй пример имитации ввода');
        this.log.info('- Выбор по id');
        this.playerVirtualInput.selectUnitsById([42]);

        this.log.info('- Команда атаки');
        this.playerVirtualInput.pointBasedCommand(createPoint(19, 19), UnitCommand.Attack);

        this.log.info('- Команда держать позицию');
        this.playerVirtualInput.oneClickCommand(UnitCommand.HoldPosition);

        this.log.info('- Имитация нажатия созданных элементов ввода');
        this.playerVirtualInput.commit();
    }

    /**
     * Заказать тренировку рабочего в замке
     */
    private trainWorker() {
        this.log.info('Выделить замок и заказать производство рабочего');
        let castle = this.player.GetRealSettlement().Units.GetCastleOrAnyUnit();

        this.log.info('- Выбор замка по id');
        this.playerVirtualInput.selectUnitsById([castle.Id]);

        this.log.info('- Команда тренировки');
        this.playerVirtualInput.produceUnitCommand("#UnitConfig_Slavyane_Worker1", 1);

        this.log.info('- Имитация нажатия созданных элементов ввода');
        this.playerVirtualInput.commit();
    }

    /**
     * Отправить свободного рабочего строить здание
     */
    private buildBuilding() {
        this.log.info('Отправка рабочего для строительства здания');
        let someFreeWorker = this.player.GetRealSettlement().Units.Professions.FreeWorkers.First();
        if (!someFreeWorker) {
            this.log.info('- Свободный рабочий не найден');
            return;
        }

        this.log.info('- Выделение свободного рабочего');
        this.playerVirtualInput.selectUnitsById([someFreeWorker.Id]);

        this.log.info('- Построить забор');
        this.playerVirtualInput.produceBuildingCommand("#UnitConfig_Slavyane_Fence", createPoint(1, 5), createPoint(7, 7));

        this.log.info('- Построить ферму (в очередь)');
        this.playerVirtualInput.produceBuildingCommand("#UnitConfig_Slavyane_Farm", createPoint(1, 8), null, AssignOrderMode.Queue);

        this.log.info('- Имитация нажатия созданных элементов ввода');
        this.playerVirtualInput.commit();
    }

    /**
     * Показать выделенных в предыдущем такте юнитов
     * Внимание! Здесь не учитываются команды выданные в этом такте! Т.е. это выделение с прошлого такта.
     */
    private showSelectedUnits() {
        let selectedSquad = this.player.SelectedSquadVirtual;
        if (selectedSquad.Count > 0) {
            this.log.info('У', this.player.Nickname, 'выделены следующие юниты:');
            ForEach(selectedSquad, (u: Unit) => {
                this.log.info('- ', u);
            });
        } else {
            this.log.info('У', this.player.Nickname, 'нет выделенных юнитов в данный момент');
        }
    }
}
