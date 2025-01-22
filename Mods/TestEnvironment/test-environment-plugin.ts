import { Unit } from "library/game-logic/horde-types";
import HordePluginBase from "plugins/base-plugin";


/**
 * Плагин для тестов и отладочных действий.
 */
export class TestEnvironmentPlugin extends HordePluginBase {
    startTick: number;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Test environment");
        this.startTick = DataStorage.gameTickNum;
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        // Empty
    }

    /**
     * Метод выполняется каждый игровой такт.
     */
    public onEveryTick(gameTickNum: number) {
        // Empty
    }

    // -------------------

    /**
     * Метод для работы с выделенным юнитом.
     */
    public handleSelectedUnit(callback: (u: Unit) => void) {
        //let player = HordeResurrection.Engine.Logic.Main.PlayersController.ActivePlayer;  // ActivePlayer не будет работать по сети
        let player = Players["0"];
        
        let selectedUnit = player.SelectedSquadVirtual.GetFirstUnit();
        if (!selectedUnit)
        if (!selectedUnit) {
            this.log.info('Юнит не выбран!');
            return;
        }

        callback(selectedUnit);
    }
}

