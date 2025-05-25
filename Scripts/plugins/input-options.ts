import HordePluginBase from "./base-plugin";
import { BattleController } from "library/game-logic/horde-types";


/**
 * Плагин для изменения опций ввода.
 */
export class InputOptionsPlugin extends HordePluginBase {

    public constructor() {
        super("Input options");
    }

    public onFirstRun() {
        this.disableReplayBotInputs();
    }

    private disableReplayBotInputs() {
        if (!BattleController.IsReplayMode)
            return;

        this.log.info("Disable replay bot's input.");
        BattleController.InputModule.AllowBotInput = false;
    }
}
