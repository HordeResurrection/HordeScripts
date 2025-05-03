import { IHero } from "./IHero";

export class Hero_Crusader extends IHero {
    protected static CfgUid      : string = this.CfgPrefix + "Crusader";
    protected static BaseCfgUid  : string = "#UnitConfig_Slavyane_Spearman";

    constructor(hordeUnit: HordeClassLibrary.World.Objects.Units.Unit) {
        super(hordeUnit);
    }

    protected static _InitHordeConfig() {
        IHero._InitHordeConfig.call(this);

        ScriptUtils.SetValue(this.Cfg, "Name", "Герой {рыцарь}");
        ScriptUtils.SetValue(this.Cfg, "MaxHealth", 60);
        ScriptUtils.SetValue(this.Cfg, "Shield", 2);
        ScriptUtils.SetValue(this.Cfg.MainArmament.ShotParams, "Damage", 5);
        ScriptUtils.SetValue(this.Cfg, "Sight", 5);
        //ScriptUtils.SetValue(config, "Flags", mergeFlags(UnitFlags, config.Flags, UnitFlags.FireResistant, UnitFlags.MagicResistant));
    }
}