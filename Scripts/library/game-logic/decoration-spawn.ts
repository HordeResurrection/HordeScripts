import { createHordeColor, Point2D } from "library/common/primitives";
import { StringVisualEffect, DrawLayer, FontUtils, GeometryVisualEffect, Scena } from "./horde-types";


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
export function spawnString(scena: Scena, text: string, position: Point2D, ticksToLive: number) {
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
 * Создание геометрии-декорации в заданных координатах
 */
export function spawnGeometry(scena, geometry, position, ticksToLive) {
    let args = new GeometryVisualEffect.CreationArgs();
    args.GeometryBuffer = geometry;
    args.TicksToLive = ticksToLive;
    args.Center = position;

    let decorationGeometry = new GeometryVisualEffect(args);
    scena.ObjectController.RegisterVisualEffect(decorationGeometry);
    return decorationGeometry;
}

/**
 * Создание звукового эффекта в заданных координатах
 */
export function spawnSound(scena, soundsCatalog, sectionName, position, isLooping) {
	scena.ObjectController.UtterSound(soundsCatalog, sectionName, position, isLooping);
}
