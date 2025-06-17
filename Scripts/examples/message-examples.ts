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


/**
 * В этом примере выполняется отправка чат-сообщения от имени бота (как от обычного игрока, только от бота).
 */
export class Example_SendBotMessage extends HordeExampleBase {

    public constructor() {
        super("Send bot chat message");
    }

    public onFirstRun(): void {
        this.logMessageOnRun();
    }

    public onEveryTick(gameTickNum: number) {
        if (DataStorage.gameTickNum > this.startTick + 3000) {
            return;
        }

        for (let player of Players) {
            if (!player.IsBot) {
                continue;
            }

            if (((gameTickNum + player.Slot * 100) % 1000) == 0) {
                BattleController.SendBotChatMessage(player, `Hello to all (P-${player.Slot})`, HordeResurrection.Engine.Logic.Battle.Stuff.ChatTargets.All);
                BattleController.SendBotChatMessage(player, `Hello allies (P-${player.Slot})`, HordeResurrection.Engine.Logic.Battle.Stuff.ChatTargets.Allies);
            }
        }
    }
}


// ===================================================
// --- Перехват чат-сообщений

/**
 * Обработка отправляемых сообщений в чате.
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
 * 
 * Работает только в сетевом режиме. Для одиночного режима см. обработку отправляемых сообщений.
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
