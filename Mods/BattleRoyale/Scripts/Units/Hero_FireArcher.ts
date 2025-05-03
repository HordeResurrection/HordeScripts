import { IHero } from "./IHero";

export class Hero_FireArcher extends IHero {
    protected static CfgUid      : string = this.CfgPrefix + "FireArcher";
    protected static BaseCfgUid  : string = "#UnitConfig_Slavyane_Archer_2";

    constructor(hordeUnit: HordeClassLibrary.World.Objects.Units.Unit) {
        super(hordeUnit);
    }

    protected static _InitHordeConfig() {
        IHero._InitHordeConfig.call(this);

        ScriptUtils.SetValue(this.Cfg, "Name", "Герой {поджигатель}");
        ScriptUtils.SetValue(this.Cfg, "MaxHealth", 20);
        ScriptUtils.SetValue(this.Cfg, "Shield", 0);
        ScriptUtils.SetValue(this.Cfg.MainArmament.ShotParams, "Damage", 4);
        ScriptUtils.SetValue(this.Cfg, "Sight", 8);
        ScriptUtils.SetValue(this.Cfg, "PressureResist", 20);
        //ScriptUtils.SetValue(config, "Flags", mergeFlags(UnitFlags, config.Flags, UnitFlags.FireResistant, UnitFlags.MagicResistant));
    }
}
