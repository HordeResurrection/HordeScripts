import { createPF } from "library/common/primitives";
import { IUnit } from "./IUnit";
import { UnitDirection, UnitFlags } from "library/game-logic/horde-types";
import { generateCellInSpiral } from "library/common/position-tools";
import { spawnUnits } from "library/game-logic/unit-spawn";
import { mergeFlags } from "library/dotnet/dotnet-utils";
import { IHero } from "./IHero";

export class Hero_Hunter extends IHero {
    protected static CfgUid      : string = this.CfgPrefix + "Hunter";
    protected static BaseCfgUid  : string = "#UnitConfig_Slavyane_Archer";

    private _bear : IUnit | null;
    private _bearRevivePeriod : number;
    private _bearDeadTick : number;

    constructor(hordeUnit: HordeClassLibrary.World.Objects.Units.Unit) {
        super(hordeUnit);

        this._bearDeadTick     = 0;
        this._bearRevivePeriod = 500;
        this._bear = null;
    }

    protected static _InitHordeConfig() {
        IHero._InitHordeConfig.call(this);

        ScriptUtils.SetValue(this.Cfg, "Name", "Герой {охотник}");
        ScriptUtils.SetValue(this.Cfg, "MaxHealth", 15);
        ScriptUtils.SetValue(this.Cfg, "Shield", 0);
        ScriptUtils.SetValue(this.Cfg.MainArmament.ShotParams, "Damage", 10);
        ScriptUtils.SetValue(this.Cfg, "Sight", 16);
        ScriptUtils.SetValue(this.Cfg, "ForestVision", 8);
        ScriptUtils.SetValue(this.Cfg, "ReloadTime", 150);
        ScriptUtils.SetValue(this.Cfg.MainArmament, "ReloadTime", 150);
        ScriptUtils.SetValue(this.Cfg.MainArmament, "Range", 16);
        ScriptUtils.SetValue(this.Cfg.MainArmament, "ForestRange", 8);
        ScriptUtils.SetValue(this.Cfg, "OrderDistance", 16);
        ScriptUtils.SetValue(this.Cfg.MainArmament, "DisableDispersion", true);
        ScriptUtils.SetValue(this.Cfg.MainArmament.ShotParams, "AdditiveBulletSpeed", createPF(30, 0));
        ScriptUtils.SetValue(this.Cfg, "PressureResist", 20);

        //ScriptUtils.SetValue(config, "Flags", mergeFlags(UnitFlags, config.Flags, UnitFlags.FireResistant, UnitFlags.MagicResistant));
        // сделать медведя подручного
    }

    public OnEveryTick(gameTickNum: number): boolean {
        if (!IHero.prototype.OnEveryTick.call(this, gameTickNum)) {
            return false;
        }

        if (this._bear) {
            if (this._bear.hordeUnit.IsDead) {
                this._bear         = null;
                this._bearDeadTick = gameTickNum;
            }
        } else {
            if (this._bearDeadTick + this._bearRevivePeriod < gameTickNum) {
                var generator = generateCellInSpiral(this.hordeUnit.Cell.X, this.hordeUnit.Cell.Y);
                var units     = spawnUnits(this.hordeUnit.Owner, Bear.GetHordeConfig(), 1, UnitDirection.RightDown, generator);
                if (units.length > 0) {
                    this._bear    = new Bear(units[0]);
                }
            }
        }

        return true;
    }
}

class Bear extends IUnit {
    protected static CfgUid      : string = this.CfgPrefix + "Bear";
    protected static BaseCfgUid  : string = "#UnitConfig_Nature_Bear";

    constructor(hordeUnit: any) {
        super(hordeUnit);
    }

    protected static _InitHordeConfig() {
        IUnit._InitHordeConfig.call(this);

        ScriptUtils.SetValue(this.Cfg, "Name", "Подручный медведь");
        ScriptUtils.SetValue(this.Cfg, "Flags", mergeFlags(UnitFlags, this.Cfg.Flags, UnitFlags.NotChoosable));
    }
}