import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { OpCfgUidToCfg, OpCfgUidToEntity } from "../Configs/IConfig";
import { Entity } from "../Entity";
import { CfgAddUnitProducer, CreateUnitConfig } from "../Utils";
import { IComponent, COMPONENT_TYPE } from "./IComponent";
import { SpawnBuildingComponent } from "./SpawnBuildingComponent";

export class UpgradableBuildingComponent extends IComponent {
    /** список ид конфигов, в которые здание можно улучшить */
    upgradesCfgUid: Array<string>;

    public constructor(upgradesCfgUid: Array<string>) {
        super(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT);

        this.upgradesCfgUid     = upgradesCfgUid;
        //this.upgradesUnitCfgUid = upgradesUnitCfgUid;
    }

    public Clone(): UpgradableBuildingComponent {
        return new UpgradableBuildingComponent(this.upgradesCfgUid);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        // даем профессию найма юнитов
        CfgAddUnitProducer(cfg);

        // добавляем в постройку дерево улучшений
        var producerParams = cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        ScriptUtils.SetValue(cfg, "Description", cfg.Description + (cfg.Description == "" ? "" : "\n\n") + "Можно улучшить до:");
        for (var i = 0; i < this.upgradesCfgUid.length; i++) {
            produceList.Add(this._GenerateImproveIconCfg(this.upgradesCfgUid[i]));
            this._GenerateRecursivereImprovementTree(cfg, this.upgradesCfgUid[i], "    ");
        }
    }

    /** суффикс к улучшаемому зданию, чтобы получить иконку */
    private static upgradeIconSuffix = "_upgradeIcon";
    /** вернет cfg который нужно построить, чтобы улучишить до cfgUid */
    public static GetUpgradeCfgUid (cfgUid : string) {
        return cfgUid + this.upgradeIconSuffix;
    }

    private _GenerateRecursivereImprovementTree(cfg: any, currentCfgUid: string, shiftStr: string) {
        var currentCfg = OpCfgUidToCfg[currentCfgUid];
        ScriptUtils.SetValue(cfg, "Description", cfg.Description + "\n" + shiftStr + currentCfg.Name);

        var current_Entity = OpCfgUidToEntity.get(currentCfgUid);
        if (!current_Entity) { 
            return;
        }
        if (!current_Entity.components.has(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT)) {
            return;
        }
        var current_upgradableBuildingComponent = current_Entity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as UpgradableBuildingComponent;
        for (var i = 0; i < current_upgradableBuildingComponent.upgradesCfgUid.length; i++) {
            this._GenerateRecursivereImprovementTree(cfg, current_upgradableBuildingComponent.upgradesCfgUid[i], shiftStr + "    ");
        }
    }

    private _GenerateImproveIconCfg(cfgUid : string) : any {
        var iconCfgUid = UpgradableBuildingComponent.GetUpgradeCfgUid(cfgUid);
        var iconCfg    = OpCfgUidToCfg[iconCfgUid];
        if (iconCfg == undefined) {
            // создаем конфиг
            if (OpCfgUidToEntity.has(cfgUid)) {
                var entity = OpCfgUidToEntity.get(cfgUid) as Entity;
                if (entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT)) {
                    // если данный конфиг спавнит юнитов, то иконку делаем на основе юнита
                    var spawnBuildingComponent = entity.components.get(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT) as SpawnBuildingComponent;
                    OpCfgUidToCfg[iconCfgUid]  = CreateUnitConfig(spawnBuildingComponent.spawnUnitConfigUid, iconCfgUid);
                } else {
                    OpCfgUidToCfg[iconCfgUid] = CreateUnitConfig(cfgUid, iconCfgUid);
                }
            } else {
                OpCfgUidToCfg[iconCfgUid] = CreateUnitConfig(cfgUid, iconCfgUid);
            }
            iconCfg = OpCfgUidToCfg[iconCfgUid];

            // настраиваем конфиг иконки
            ScriptUtils.SetValue(iconCfg, "Name", "Улучшить до " + OpCfgUidToCfg[cfgUid].Name);
            ScriptUtils.SetValue(iconCfg, "Description", OpCfgUidToCfg[cfgUid].Description);
            ScriptUtils.SetValue(iconCfg, "ProductionTime", 250);
            ScriptUtils.SetValue(iconCfg, "MaxHealth", 1); // чтобы время постройки было ровно как надо
            ScriptUtils.SetValue(iconCfg.CostResources, "Gold",   OpCfgUidToCfg[cfgUid].CostResources.Gold);
            ScriptUtils.SetValue(iconCfg.CostResources, "Metal",  OpCfgUidToCfg[cfgUid].CostResources.Metal);
            ScriptUtils.SetValue(iconCfg.CostResources, "Lumber", OpCfgUidToCfg[cfgUid].CostResources.Lumber);
            ScriptUtils.SetValue(iconCfg.CostResources, "People", OpCfgUidToCfg[cfgUid].CostResources.People);
            iconCfg.TechConfig.Requirements.Clear();
        }

        return iconCfg;
    }
};