declare function ForEach(enumerable: any, action: (item: any, i: number, sourceEnumerable: any) => void): void;

declare class ScriptUtils
{
    public static GameVersionEquals(
            version: string
        ): boolean;

    public static GameVersionEqualsOrGreater(
            version: string
        ): boolean;

    public static GameVersionLesserThan(
            version: string
        ): boolean;

}

declare class HordeContentApi
{
    public static readonly ContentStamp: string;

    public static GetForce(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.Army.Force;

    public static GetUnitConfig(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.Units.UnitConfig;

    public static GetUnitCommand(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.UnitCommandConfig;

    public static GetBulletConfig(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.Bullets.BulletConfig;

    public static GetVisualEffectConfig(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.VisualEffects.VisualEffectConfig;

    public static GetSoundEffectConfig(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.SoundEffects.SoundEffectConfig;

    public static GetFont(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.Fonts.FontConfig;

    public static GetString(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.StringConfig;

    public static GetAnimationCatalog(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.ViewResourceCatalogs.Graphics.BaseAnimationsCatalog;

    public static GetAnimationAtlas(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.ViewResourceInfos.Graphics.AnimationAtlasItem;

    public static GetSoundsCatalog(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.ViewResourceCatalogs.Audio.SoundsCatalog;

    public static GetGuiParams(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.Interface.GuiParams;

    public static GetRuleConfig(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.Rules.RuleConfig;

    public static GetMindCharacter(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.MasterMind.MindCharacterConfig;

    public static GetConfig(
            cfgUid: string,
            configTypeName: string
        ): HordeClassLibrary.HordeContent.Configs.AConfig;

    public static HasUnitConfig(
            uid: string
        ): boolean;

    public static HasUnitCommand(
            uid: string
        ): boolean;

    public static HasBulletConfig(
            uid: string
        ): boolean;

    public static HasVisualEffectConfig(
            uid: string
        ): boolean;

    public static HasSoundEffectConfig(
            uid: string
        ): boolean;

    public static HasAnimation(
            uid: string
        ): boolean;

    public static HasSoundsCatalog(
            uid: string
        ): boolean;

    public static HasRuleConfig(
            uid: string
        ): boolean;

    public static HasMindCharacter(
            uid: string
        ): boolean;

    public static HasConfig(
            cfgUid: string,
            configTypeName: string
        ): boolean;

    public static CloneConfig(
            cfg: HordeClassLibrary.HordeContent.Configs.AConfig,
            cloneUid?: string
        ): HordeClassLibrary.HordeContent.Configs.AConfig;

}
