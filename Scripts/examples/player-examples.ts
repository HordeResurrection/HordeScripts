import { createGameMessageWithNoSound, createGameMessageWithSound } from "library/common/messages";
import { createHordeColor } from "library/common/primitives";
import HordeExampleBase from "./base-example";

/**
 * Пример работы с игроками
 */
export class Example_PlayerWorks extends HordeExampleBase {

    public constructor() {
        super("Player works");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        // Глобальная переменная "Players" - это массив с API для доступа к каждому игроку
        this.log.info('Количество игроков:', '"' + Players.length + '"');

        for (let i in Players) {
            let player = Players[i];

            // Т.к. API ещё не разработано, ВРЕМЕННО прокинул реальный объект игрока
            // Здесь и далее в функии выполняется работа с реальными объектами (не API)
            let realPlayer = player.GetRealPlayer();
            this.log.info(`Игрок ${i}:`, `${realPlayer.Nickname}`);

            // Поселение игрока
            let realSettlement = realPlayer.GetRealSettlement();
            this.log.info(`  Предводитель: ${realSettlement.LeaderName}`);
            // Подробнее см. в примерах работы с поселением

            // Объект для бота
            let realMasterMind = ScriptUtils.GetValue(realPlayer, "MasterMind");
            if (realMasterMind) {
                this.log.info(`  Характер:`, realMasterMind.Character.Description);
            } else {
                this.log.info(`  Управляется игроком`);
            }
            // Подробнее см. в примерах к MasterMind

            // Отправить текстовое сообщение игроку (вернее поселению игрока)
            let messages = realSettlement.Messages;
            var msg = createGameMessageWithNoSound(`Привет, ${realPlayer.Nickname}!`);
            messages.AddMessage(msg);
            var msg = createGameMessageWithSound(`А вот цветной текст со звуком`, createHordeColor(255, 150, 150, 255));
            messages.AddMessage(msg);
            // Можно ещё разукрашивать отдельные слова, но это покажу потом

            this.log.info('Происхождение игрока:');
            this.log.info('- Источник ввода:');
            if (realPlayer.IsReplay) {
                this.log.info('  Реплей-игрок:', realPlayer);
            } else if (realPlayer.IsLocal) {
                this.log.info('  Локальный игрок:', realPlayer);
            } else if (realPlayer.IsRemote) {
                this.log.info('  Удаленный игрок:', realPlayer);
            } else {
                this.log.info('  Невозможно определить источник ввода игрока:', realPlayer);
            }
            // Дополнительно ещё есть "realPlayer.IsNotLocal" - означает либо replay-игрока, либо remote-игрока

            this.log.info('- Источник управления:');
            if (realPlayer.IsBot) {
                this.log.info('  Игрок-бот:', realPlayer);
            } else if (realPlayer.IsHuman) {
                this.log.info('  Игрок-человек:', realPlayer);
            } else {
                this.log.info('  Невозможно определить источник управления игрока:', realPlayer);
            }
        }
    }
}
