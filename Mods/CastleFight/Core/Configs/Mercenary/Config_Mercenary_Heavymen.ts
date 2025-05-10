import { COMPONENT_TYPE } from "../../Components/IComponent";
import { SpawnEvent } from "../../Components/SpawnEvent";
import { IAttackingUnit } from "../IAttackingUnit";
import { OpCfgUidToCfg } from "../IConfig";

export class Config_Mercenary_Heavymen extends IAttackingUnit {
    public static CfgUid      : string = "#CastleFight_Mercenary_Heavymen";
    public static BaseCfgUid  : string = "#UnitConfig_Barbarian_Heavymen";
    public static spawnCount  : number = 30;

    constructor() { super(); }

    public static InitEntity() {
        IAttackingUnit.InitEntity.call(this);

        this.Entity.components.set(COMPONENT_TYPE.SPAWN_EVENT, new SpawnEvent(this.CfgUid, -1, this.spawnCount - 1));
        this.Entity.components.delete(COMPONENT_TYPE.BUFFABLE_COMPONENT);
    }

    public static InitConfig() {
        IAttackingUnit.InitConfig.call(this);

        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Name", "Батыр");
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 1500);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 200);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].MainArmament.ShotParams, "Damage", 500);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Gold", 400);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "ProductionTime", 250);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Description", 
            OpCfgUidToCfg[this.CfgUid].Description
            + (OpCfgUidToCfg[this.CfgUid].Description == "" ? "" : "\n")
            + "Теймуровцы не верят в нашу веру, поэтому святые духи на них не действуют.\n"
            + "Нанять " + this.spawnCount + " батыров:\n"
        );
    }
}