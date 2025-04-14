import { createHordeColor, Point2D } from "library/common/primitives";
import { StringVisualEffect, DrawLayer, FontUtils, GeometryVisualEffect, Scena, VisualEffectConfig, SoundsCatalog } from "./horde-types";


/**
 * Создание эффекта-декорации в заданных координатах
 */
export function spawnDecoration(scena: Scena, decorationCfg: VisualEffectConfig, position: Point2D) {
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
export function spawnGeometry(scena: Scena, geometry: any, position: Point2D, ticksToLive: number) {
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
export function spawnSound(scena: Scena, soundsCatalog: SoundsCatalog, sectionName: string, position: Point2D, isLooping: boolean) {
    scena.ObjectController.UtterSound(soundsCatalog, sectionName, position, isLooping);
}
