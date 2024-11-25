import { TileType, UnitFlags, UnitSpecification } from "library/game-logic/horde-types";
import { COMPONENT_TYPE, UnitComponent, AttackingAlongPathComponent, BuffableComponent } from "../Components/ESC_components";
import { CfgSetSpeed } from "../Utils";
import { IConfig, OpCfgUidToCfg } from "./IConfig";

export class IAttackingUnit extends IConfig {
    public static speedCoeff : number = 1.0;

    constructor() { super(); }

    public static InitEntity() {
        IConfig.InitEntity.call(this);

        this.Entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
        this.Entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
        this.Entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());

        // в данный момент конфиги зафиксированы, можно сделать постинициализацию
        this._PostInitConfig();
    }

    public static InitConfig() {
        IConfig.InitConfig.call(this);

        // устанавливаем скорость бега
        var speedMap = new Map<typeof TileType, number>();
        if (!OpCfgUidToCfg[this.CfgUid].Flags.HasFlag(UnitFlags.Building)) {
            if (OpCfgUidToCfg[this.CfgUid].Specification.HasFlag(UnitSpecification.Rider)) {
                speedMap.set(TileType.Grass,  Math.round(this.speedCoeff * 20));
                speedMap.set(TileType.Forest, Math.round(this.speedCoeff * 0));
                speedMap.set(TileType.Water,  Math.round(this.speedCoeff * 0));
                speedMap.set(TileType.Marsh,  Math.round(this.speedCoeff * 17));
                speedMap.set(TileType.Sand,   Math.round(this.speedCoeff * 17));
                speedMap.set(TileType.Mounts, Math.round(this.speedCoeff * 0));
                speedMap.set(TileType.Road,   Math.round(this.speedCoeff * 21));
                speedMap.set(TileType.Ice,    Math.round(this.speedCoeff * 15));
            } else if (OpCfgUidToCfg[this.CfgUid].Specification.HasFlag(UnitSpecification.Machine)) {
                speedMap.set(TileType.Grass,  Math.round(this.speedCoeff * 10));
                speedMap.set(TileType.Water,  Math.round(this.speedCoeff * 0));
                speedMap.set(TileType.Marsh,  Math.round(this.speedCoeff * 7));
                speedMap.set(TileType.Sand,   Math.round(this.speedCoeff * 8));
                speedMap.set(TileType.Mounts, Math.round(this.speedCoeff * 0));
                speedMap.set(TileType.Road,   Math.round(this.speedCoeff * 13));
                speedMap.set(TileType.Ice,    Math.round(this.speedCoeff * 10));
            } else {
                speedMap.set(TileType.Grass,  Math.round(this.speedCoeff * 10));
                speedMap.set(TileType.Forest, Math.round(this.speedCoeff * 6));
                speedMap.set(TileType.Water,  Math.round(this.speedCoeff * 0));
                speedMap.set(TileType.Marsh,  Math.round(this.speedCoeff * 7));
                speedMap.set(TileType.Sand,   Math.round(this.speedCoeff * 8));
                speedMap.set(TileType.Mounts, Math.round(this.speedCoeff * 0));
                speedMap.set(TileType.Road,   Math.round(this.speedCoeff * 13));
                speedMap.set(TileType.Ice,    Math.round(this.speedCoeff * 10));
            }

            CfgSetSpeed(OpCfgUidToCfg[this.CfgUid], speedMap);
        }
    }

    private static _PostInitConfig() {
        // Ближники
        if (OpCfgUidToCfg[this.CfgUid].MainArmament.Range == 1) {
            ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", Math.floor(1.5 * OpCfgUidToCfg[this.CfgUid].MaxHealth));
            ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Sight", 6);
        }
        // Дальники
        else {
            ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Sight", 4);
        }

        // описание юнитов
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Description",  OpCfgUidToCfg[this.CfgUid].Description +
            (OpCfgUidToCfg[this.CfgUid].Description == "" ? "" : "\n") +
            "  здоровье " + OpCfgUidToCfg[this.CfgUid].MaxHealth + "\n" +
            "  броня " + OpCfgUidToCfg[this.CfgUid].Shield + "\n" +
            (
                OpCfgUidToCfg[this.CfgUid].MainArmament
                ? "  атака " + OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams.Damage + "\n" +
                "  радиус атаки " + OpCfgUidToCfg[this.CfgUid].MainArmament.Range + "\n"
                : ""
            ) +
            "  скорость бега " + OpCfgUidToCfg[this.CfgUid].Speeds.Item(TileType.Grass) + "\n"
            + (OpCfgUidToCfg[this.CfgUid].Flags.HasFlag(UnitFlags.FireResistant) || OpCfgUidToCfg[this.CfgUid].Flags.HasFlag(UnitFlags.MagicResistant)
                ? "  иммунитет к " + (OpCfgUidToCfg[this.CfgUid].Flags.HasFlag(UnitFlags.FireResistant) ? "огню " : "") + 
                    (OpCfgUidToCfg[this.CfgUid].Flags.HasFlag(UnitFlags.MagicResistant) ? "магии " : "") + "\n"
                : "")
            + "  радиус видимости " + OpCfgUidToCfg[this.CfgUid].Sight
            );
    }
}