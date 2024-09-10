import { createHordeColor } from "library/common/primitives";
import { StringVisualEffect, DrawLayer, FontUtils } from "./horde-types";


/**
 * Создание эффекта-декорации в заданных координатах
 */
export function spawnDecoration(scena, decorationCfg, position) {
    let decoration = decorationCfg.CreateInstance(scena.Context, position);
    scena.ObjectController.RegisterVisualEffect(decoration);
    return decoration;
}

/**
 * Создание строки-декорации в заданных координатах
 */
export function spawnString(scena, text, position, ticksToLive) {
    let args = new StringVisualEffect.CreationArgs();
    args.Text = text;
    args.TicksToLive = ticksToLive;
    args.Center = position;
    args.DrawLayer = DrawLayer.Units;
    args.Color = createHordeColor(255, 255, 255, 255);
    args.Height = 12;
    args.Font = FontUtils.DefaultVectorFont;

    let decorationString = new StringVisualEffect(args);
    scena.ObjectController.RegisterVisualEffect(decorationString);
    return decorationString;
}

/**
 * Создание звукового эффекта в заданных координатах
 */
export function spawnSound(scena, soundsCatalog, sectionName, position, isLooping) {
	scena.ObjectController.UtterSound(soundsCatalog, sectionName, position, isLooping);
}
