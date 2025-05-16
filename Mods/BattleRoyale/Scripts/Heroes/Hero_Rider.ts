import { TileType } from "library/game-logic/horde-types";
import { IHero } from "./IHero";

export class Hero_Rider extends IHero {
    protected static CfgUid      : string = this.CfgPrefix + "Rider";
    protected static BaseCfgUid  : string = "#UnitConfig_Slavyane_Raider";

    constructor(hordeUnit: HordeClassLibrary.World.Objects.Units.Unit) {
        super(hordeUnit);
    }

    protected static _InitHordeConfig() {
        ScriptUtils.SetValue(this.Cfg, "Name", "Герой {всадник}");
        ScriptUtils.SetValue(this.Cfg, "MaxHealth", 30);
        ScriptUtils.SetValue(this.Cfg, "Shield", 0);
        ScriptUtils.SetValue(this.Cfg.MainArmament.ShotParams, "Damage", 5);
        ScriptUtils.SetValue(this.Cfg, "Sight", 3);
        ScriptUtils.SetValue(this.Cfg, "Weight", 20);
        ScriptUtils.SetValue(this.Cfg, "PressureResist", 30);
        this.Cfg.Speeds.Item.set(TileType.Forest, 2);

        super._InitHordeConfig();
        //ScriptUtils.SetValue(config, "Flags", mergeFlags(UnitFlags, config.Flags, UnitFlags.FireResistant, UnitFlags.MagicResistant));
    }
}