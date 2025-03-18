import { broadcastMessage } from "library/common/messages";
import { createHordeColor } from "library/common/primitives";
import HordeExampleBase from "./base-example";
import { BattleController } from "library/game-logic/horde-types";


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

        // Удаляем предыдущий обработчик сообщений, если был закреплен
        if (this.globalStorage.currentHandler) {
            this.globalStorage.currentHandler.disconnect();
        }

        // Устанавливаем обработчик сообщений
        let that = this;
        this.globalStorage.currentHandler = BattleController.ChatMessageSent.connect(function (sender, args) {
            try {
                if (!args) {
                    return;
                }
                let senderPlayer = args.InitiatorPlayer;
                let targets = args.Targets;
                let message = args.Message;
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

        // Удаляем предыдущий обработчик сообщений, если был закреплен
        if (this.globalStorage.currentHandler) {
            this.globalStorage.currentHandler.disconnect();
        }

        // Устанавливаем обработчик сообщений
        let that = this;
        this.globalStorage.currentHandler = BattleController.ChatMessageReceived.connect(function (sender, args) {
            try {
                if (!args) {
                    return;
                }
                let senderPlayer = args.InitiatorPlayer;
                let targets = args.Targets;
                let message = args.Message;
                that.log.info(`[${senderPlayer.Nickname} -> ${targets}] ${message}`);
            } catch (ex) {
                that.log.exception(ex);
            }
        });

        this.log.info('Установлен хук на приём сообщения');
    }
}
