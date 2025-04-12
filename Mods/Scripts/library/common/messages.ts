import { Settlement } from "library/game-logic/horde-types";
import { HordeColor } from "./primitives";

export const GameMessage = HordeClassLibrary.World.Simple.GameMessage;
export type GameMessage = HordeClassLibrary.World.Simple.GameMessage;

/**
 * Создать игровое сообщение без звука.
 */
export function createGameMessageWithNoSound(text: string, color?: HordeColor) {
    if (color)
        return GameMessage.CreateWithNoSound(text, color);
    return GameMessage.CreateWithNoSound(text);
}

/**
 * Создать игровое сообщение со звуком.
 */
export function createGameMessageWithSound(text: string, color?: HordeColor) {
    if (color)
        return GameMessage.CreateWithDefaultSound(text, color);
    return GameMessage.CreateWithNoSound(text);
}

/**
 * Отобразить сообщение для всех поселений на карте.
 */
export function broadcastMessage(text: string, color: HordeColor) {
    ForEach(ActiveScena.GetRealScena().Settlements, (settlement: Settlement) => {
        let msg = createGameMessageWithSound(text, color);
        settlement.Messages.AddMessage(msg);
    });
}
