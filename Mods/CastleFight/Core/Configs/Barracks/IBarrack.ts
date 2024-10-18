import { COMPONENT_TYPE, UnitComponent, SpawnBuildingComponent, UpgradableBuildingComponent } from "../../Components/ESC_components";
import { IConfig, OpCfgUidToCfg } from "../IConfig";
import { IAttackingUnit } from "../IAttacingUnit";

export class IBarrack extends IConfig {
    public static spawnedUnit        : typeof IAttackingUnit;
    public static spawnPeriod        : number = 1500;
    public static improvesToBarracks : Array<typeof IBarrack>;
    public static spawnCount         : number = 1;

    constructor() { super(); }

    public static InitEntity() {
        IConfig.InitEntity.call(this);

        this.Entity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, this.CfgUid));
        this.Entity.components.set(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT, new SpawnBuildingComponent(this.spawnedUnit.CfgUid, -1, this.spawnPeriod, this.spawnCount));
        if (this.improvesToBarracks && this.improvesToBarracks.length > 0) {
            var improvesToBarracksCfgUid     = new Array<string>();
            for (var i = 0; i < this.improvesToBarracks.length; i++) {
                improvesToBarracksCfgUid.push(this.improvesToBarracks[i].CfgUid);
            }
            this.Entity.components.set(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT,
                new UpgradableBuildingComponent(improvesToBarracksCfgUid));
        }
    }

    public static InitConfig() {
        IConfig.InitConfig.call(this);

        // стоимость обычного улучшаемого здания
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Gold",   100);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Metal",  0);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "Lumber", 100);
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid].CostResources, "People", 0);
        // здоровье
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "MaxHealth", 60000);
        // броня
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "Shield", 0);
        // время постройки улучшения
        ScriptUtils.SetValue(OpCfgUidToCfg[this.CfgUid], "ProductionTime", 500);
    }
}