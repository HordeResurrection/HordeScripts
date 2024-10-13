import { TileType, UnitFlags, UnitSpecification } from "library/game-logic/horde-types";
import { COMPONENT_TYPE, UnitComponent, AttackingAlongPathComponent, BuffableComponent } from "../../Components/ESC_components";
import { CfgSetSpeed } from "../../Utils";
import { IConfig, OpCfgUidToCfg } from "../IConfig";

export class IBarrackUnit extends IConfig {
    constructor() { super(); }

    public static InitEntity() {
        IConfig.InitEntity.call(this);

        this.Entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
        this.Entity.components.set(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT, new AttackingAlongPathComponent());
        this.Entity.components.set(COMPONENT_TYPE.BUFFABLE_COMPONENT, new BuffableComponent());
    }

    public static InitConfig() {
        IConfig.InitConfig.call(this);

        // устанавливаем скорость бега для техники и пеших

        var infantrySpeed = new Map<typeof TileType, number>();
        infantrySpeed.set(TileType.Grass, 10);
        infantrySpeed.set(TileType.Forest, 6);
        infantrySpeed.set(TileType.Water, 0);
        infantrySpeed.set(TileType.Marsh, 7);
        infantrySpeed.set(TileType.Sand, 8);
        infantrySpeed.set(TileType.Mounts, 0);
        infantrySpeed.set(TileType.Road, 13);
        infantrySpeed.set(TileType.Ice, 10);

        var machineSpeed = new Map<typeof TileType, number>();
        machineSpeed.set(TileType.Grass, 10);
        machineSpeed.set(TileType.Water, 0);
        machineSpeed.set(TileType.Marsh, 7);
        machineSpeed.set(TileType.Sand, 8);
        machineSpeed.set(TileType.Mounts, 0);
        machineSpeed.set(TileType.Road, 13);
        machineSpeed.set(TileType.Ice, 10);

        if (!OpCfgUidToCfg[this.CfgUid].Flags.HasFlag(UnitFlags.Building) &&
            !OpCfgUidToCfg[this.CfgUid].Specification.HasFlag(UnitSpecification.Rider)) {
            if (OpCfgUidToCfg[this.CfgUid].Specification.HasFlag(UnitSpecification.Machine)) {
                CfgSetSpeed(OpCfgUidToCfg[this.CfgUid], machineSpeed);
            } else {
                CfgSetSpeed(OpCfgUidToCfg[this.CfgUid], infantrySpeed);
            }
        }
    }

    public static InitSettings() {
        // Ближники
        // увеличиваем хп в 1.5 раза
        // обзор ставим 8
        if (OpCfgUidToCfg[this.CfgUid].MainArmament.Range == 1) {
            ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", Math.floor(1.5 * OpCfgUidToCfg[this.CfgUid].MaxHealth));
            ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Sight", 6);
        }
        // Дальники
        // обзор делаем 4
        else {
            ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Sight", 4);
        }
    }
}