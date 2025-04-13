import { TileType } from "library/game-logic/horde-types";
import { UnitProfession } from "library/game-logic/unit-professions";
import { Hero_Crusader } from "../Units/Hero_Crusader";
import { CreateHordeUnitConfig, FactoryConfig, GetConfigsByWorker, IConfig } from "../Units/IConfig";
import { createHordeColor } from "library/common/primitives";

export class BuildingTemplate {
    public buildings : Array<IConfig>;
    public units: Array<IConfig>;
    public spawnCount: number;

    constructor(buildings: Array<IConfig>, units: Array<IConfig>, spawnCount: number) {
        this.buildings  = buildings;
        this.units      = units;
        this.spawnCount = spawnCount;
    }
};

export class IFactory {
    public  static workerHordeConfigUid : string = "";
    private static _buildings : Array<BuildingTemplate>;

    public static GetBuildings() : Array<BuildingTemplate> {
        if (!this._buildings) {
            this._buildings = new Array<BuildingTemplate>();
            var configs = GetConfigsByWorker(this.workerHordeConfigUid);
            configs.forEach((config) => {
                // проверяем, что конфиг это боевой юнит
                if (!config.unitConfig.IsCombat()) {
                    return;
                }
    
                this._AddBuilding(config);
            });
        }

        return this._buildings;
    }

    private static _AddBuilding(config: FactoryConfig) {
        var factoriesConfig = new Array<IConfig>();
        var unitsConfig     = new Array<IConfig>();

        var rarity_TintColor = [
            null,
            createHordeColor(255, 150, 255, 150),
            createHordeColor(255, 180, 180, 255),
            createHordeColor(255, 255, 150, 255),
            createHordeColor(150, 255, 170, 0)];
        var rarity_NamePrefix = ["", "{храбрый}", "{ратник}", "{дружинник}", "{витязь}"];
        var rarity_HpCoeff = [1.0, 1.25, 1.57, 3.735, 12.15];

        for (var rarity = 0; rarity < 5; rarity++) {
            var unitConfigUid    = String(config.unitConfig.hordeConfig.Uid).replace("#UnitConfig_Slavyane_", IConfig.CfgPrefix) + "_R" + rarity;
            var factoryConfigUid = String(config.factoryConfig.hordeConfig.Uid).replace("#UnitConfig_Slavyane_", IConfig.CfgPrefix)
                + String(config.unitConfig.hordeConfig.Uid).replace("#UnitConfig_Slavyane_", "") + "_R" + rarity;
            
            // создаем новый конфиг и здание для него
            var unitConfig     = new IConfig(CreateHordeUnitConfig(config.unitConfig.hordeConfig.Uid, unitConfigUid));
            var factoryConfig  = new IConfig(CreateHordeUnitConfig(config.factoryConfig.hordeConfig.Uid, factoryConfigUid));

            // настраиваем юнита
                // скорость не меньше героя рыцаря
            var tilesType = [
                TileType.Grass, 
                TileType.Forest,
                TileType.Water, 
                TileType.Marsh, 
                TileType.Sand,  
                TileType.Mounts,
                TileType.Road,  
                TileType.Ice   
            ];
            tilesType.forEach((tileType) => {
                unitConfig.hordeConfig.Speeds.Item.set(tileType,
                    Math.max(unitConfig.hordeConfig.Speeds.Item.get(tileType) as number, Hero_Crusader.GetHordeConfig().Speeds.Item(tileType)));
            });
            // убираем захватываемость
            if (unitConfig.hordeConfig.ProfessionParams.ContainsKey(UnitProfession.Capturable)) {
                unitConfig.hordeConfig.ProfessionParams.Remove(UnitProfession.Capturable);
            }
            ScriptUtils.SetValue(unitConfig.hordeConfig, "Name", config.unitConfig.hordeConfig.Name + "\n" + rarity_NamePrefix[rarity]);
            ScriptUtils.SetValue(unitConfig.hordeConfig, "MaxHealth",
                Math.round(config.unitConfig.hordeConfig.MaxHealth
                    * Math.pow(rarity_HpCoeff[rarity]
                        , 2.0 * config.unitConfig.hordeConfig.MainArmament.ShotParams.Damage / config.unitConfig.hordeConfig.MaxHealth)));
            ScriptUtils.SetValue(unitConfig.hordeConfig.MainArmament.ShotParams, "Damage", Math.round(config.unitConfig.hordeConfig.MainArmament.ShotParams.Damage*(1 + 0.15*rarity)));
            if (rarity_TintColor[rarity]) ScriptUtils.SetValue(unitConfig.hordeConfig, "TintColor", rarity_TintColor[rarity]);
            
            // настраиваем строение

            ScriptUtils.SetValue(factoryConfig.hordeConfig, "Name", config.factoryConfig.hordeConfig.Name + "\n(" + unitConfig.hordeConfig.Name + ")");
            ScriptUtils.SetValue(factoryConfig.hordeConfig, "MaxHealth", 100 + 50*rarity);
            ScriptUtils.SetValue(factoryConfig.hordeConfig, "MinHealth", 0);
            ScriptUtils.SetValue(factoryConfig.hordeConfig, "Shield", 0);
            ScriptUtils.SetValue(factoryConfig.hordeConfig.BuildingConfig, "DestructionBeamsNumber", 0);
            if (rarity_TintColor[rarity]) ScriptUtils.SetValue(factoryConfig.hordeConfig, "TintColor", rarity_TintColor[rarity]);

            factoriesConfig.push(factoryConfig);
            unitsConfig.push(unitConfig);
        }

        var spawnCount = 1;
        this._buildings.push(new BuildingTemplate(factoriesConfig, unitsConfig, spawnCount));
    }
};
