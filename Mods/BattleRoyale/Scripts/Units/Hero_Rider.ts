import { TileType } from "library/game-logic/horde-types";
import { IUnit } from "./IUnit";

export class Hero_Rider extends IUnit {
    protected static CfgUid      : string = this.CfgPrefix + "Rider";
    protected static BaseCfgUid  : string = "#UnitConfig_Slavyane_Raider";

    constructor(hordeUnit: HordeClassLibrary.World.Objects.Units.Unit) {
        super(hordeUnit);
    }

    protected static _InitHordeConfig() {
        IUnit._InitHordeConfig.call(this);

        ScriptUtils.SetValue(this.Cfg, "Name", "Герой {всадник}");
        ScriptUtils.SetValue(this.Cfg, "MaxHealth", 30);
        ScriptUtils.SetValue(this.Cfg, "Shield", 0);
        ScriptUtils.SetValue(this.Cfg.MainArmament.ShotParams, "Damage", 5);
        ScriptUtils.SetValue(this.Cfg, "Sight", 3);
        this.Cfg.Speeds.Item.set(TileType.Forest, 2);
        //ScriptUtils.SetValue(config, "Flags", mergeFlags(UnitFlags, config.Flags, UnitFlags.FireResistant, UnitFlags.MagicResistant));
    }
}