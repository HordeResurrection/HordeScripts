import { broadcastMessage } from "library/common/messages";
import { createHordeColor } from "library/common/primitives";
import HordeExampleBase from "./base-example";


// ===================================================
// --- Отправка сообщений


/**
 * Отправка игровых сообщений всем поселениям на сцене.
 */
export class Example_SendMessageToAll extends HordeExampleBase {

    public constructor() {
        super("Send message to all settlements");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        let unitsMap = ActiveScena.GetRealScena().UnitsMap;
        let unit = unitsMap.GetUpperUnit(5, 5);
        if (unit) {
            let msgColor = createHordeColor(255, 255, 255, 255);
            broadcastMessage("Обнаружен юнит: " + unit, msgColor);
        } else {
            let msgColor = createHordeColor(255, 200, 200, 200);
            broadcastMessage("Юнит не обнаружен в клетке (5, 5)", msgColor);
        }
    }
}


// ===================================================
// --- Перехват чат-сообщений


/**
 * Обработка отправляемых сообщений в чате.
 * 
 * Так же это пример корректной обработки .net-событий.
 */
export class Example_HookSentChatMessages extends HordeExampleBase {

    public constructor() {
        super("Hook sent chat messages");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        // Получаем UI-объект строки чата
        const AllUIModules = HordeResurrection.Game.UI.AllUIModules;
        const BattleUI = AllUIModules.BattleUI;
        let chatPanel = ScriptUtils.GetValue(BattleUI, "ChatPanel");
        let chatInputLine = ScriptUtils.GetValue(chatPanel, "ChatInputLine");

        // Удаляем предыдущий обработчик сообщений, если был закреплен
        if (this.globalStorage.currentHandler) {
            this.globalStorage.currentHandler.disconnect();
        }

        // Устанавливаем обработчик сообщений
        let that = this;
        this.globalStorage.currentHandler = chatInputLine.MessageSent.connect(function (sender, args) {
            try {
                let senderPlayer = ScriptUtils.GetValue(args, "InitiatorPlayer");
                let targets = ScriptUtils.GetValue(args, "Targets");
                let message = ScriptUtils.GetValue(args, "Message");
                that.log.info(`[${senderPlayer.Nickname} -> ${targets}] ${message}`);
            } catch (ex) {
                that.log.exception(ex);
            }
        });

        this.log.info('Установлен хук на отправку сообщения');
    }
}


/**
 * Обработка принимаемых сообщений в чате.
 * Работает только в сетевом режиме.
 */
export class Example_HookReceivedChatMessages extends HordeExampleBase {

    public constructor() {
        super("Hook received chat messages");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        this.log.info('В данный момент этот пример не работает.');
        return;

        // NetworkController - центральный класс сетевого взаимодействия
        let NetworkController = HordeResurrection.Engine.Logic.Main.NetworkController;
        if (NetworkController.NetWorker == null) {
            this.log.info('Сетевой режим не активирован. Для этого примера необходимо начать сетевую игру.');
            return;
        }

        // Удаляем предыдущий обработчик сообщений, если был закреплен
        if (this.globalStorage.currentHandler) {
            this.globalStorage.currentHandler.disconnect();
        }

        // Устанавливаем обработчик сообщений
        let that = this;
        this.globalStorage.currentHandler = NetworkController.NetWorker.Events.ChatEvents.ChatItemPacketReceived.connect(function (sender, args) {
            try {
                let senderPlayer = HordeResurrection.Engine.Logic.Main.PlayersController.GetNetElementMainPlayer(ScriptUtils.GetValue(args, "NetworkElement"));
                let targets = host.cast(HordeResurrection.Engine.Logic.Battle.Stuff.ChatTargets, ScriptUtils.GetValue(args, "Targets"));
                let message = ScriptUtils.GetValue(args, "Message");
                that.log.info(`[${senderPlayer.Nickname} -> ${targets}] ${message}`);
            } catch (ex) {
                that.log.exception(ex);
            }
        });

        this.log.info('Установлен хук на приём сообщения');
    }
}
