declare function ForEach(enumerable: any, action: (item: any, i: number, sourceEnumerable: any) => void): void;

declare class ScriptUtils
{
    public static SetValueAs(
            targetTypeInfo: any,
            memberOwner: any,
            memberName: string,
            value: any
        ): any;

    public static GetValueAs(
            targetTypeInfo: any,
            memberOwner: any,
            memberName: string
        ): any;

    public static SetValue(
            memberOwner: any,
            memberName: string,
            value: any
        ): any;

    public static GetValue(
            memberOwner: any,
            memberName: string
        ): any;

    public static Invoke(
            memberOwner: any,
            methodName: string,
            parameters: any[]
        ): any;

    public static InvokeStatic(
            type: any,
            methodName: string,
            parameters: any[]
        ): any;

    public static GetTypeByName(
            typeName: string
        ): any;

    public static GetTypeByName(
            typeName: string,
            assemblyName: string
        ): any;

    public static CreateInstance(
            type: any,
            parameters: any[]
        ): any;

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
    public static readonly ContentStamp: HordeClassLibrary.Scripting.ScriptApi.HordeContentApi

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
        ): any;

    public static GetAnimationCatalog(
            uid: string
        ): any;

    public static GetSoundsCatalog(
            uid: string
        ): HordeClassLibrary.HordeContent.Configs.ViewResourceCatalogs.Audio.SoundsCatalog;

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

    public static AddConfig(
            cfg: HordeClassLibrary.HordeContent.Configs.AConfig
        ): any;

    public static RemoveConfig(
            cfg: HordeClassLibrary.HordeContent.Configs.AConfig
        ): any;

    public static RemoveConfig(
            uid: string,
            configTypeName: string
        ): any;

}
