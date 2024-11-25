import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { OpCfgUidToCfg } from "../Configs/IConfig";
import { CfgAddUnitProducer, CreateUnitConfig } from "../Utils";
import { IComponent, COMPONENT_TYPE } from "./IComponent";

export class SpawnBuildingComponent extends IComponent {
    /** ид конфига юнита */
    spawnUnitConfigUid: string;
    /** такт с которого нужно спавнить юнитов */
    spawnTact: number;
    /** частота спавна в тактах */
    spawnPeriodTact: number;
    /** количество юнитов, которые спавнятся */
    spawnCount: number = 1;

    /** юнит для сброса таймера спавна */
    public static resetSpawnCfgUid = "#CastleFight_Reset_spawn";

    public constructor(spawnUnitConfigUid: string, spawnTact: number, spawnPeriodTact: number, spawnCount: number) {
        super(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT);

        this.spawnUnitConfigUid = spawnUnitConfigUid;
        this.spawnTact          = spawnTact;
        this.spawnPeriodTact    = spawnPeriodTact;
        this.spawnCount         = spawnCount;
    }

    public Clone(): SpawnBuildingComponent {
        return new SpawnBuildingComponent(this.spawnUnitConfigUid, this.spawnTact, this.spawnPeriodTact, this.spawnCount);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        // даем профессию найма юнитов
        CfgAddUnitProducer(cfg);

        // добавляем сброс таймера спавна
        this.InitResetSpawnCfg();
        var producerParams = cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        produceList.Add(OpCfgUidToCfg[SpawnBuildingComponent.resetSpawnCfgUid]);

        // добавляем описание спавнующего юнита
        var spawnUnitCfg = OpCfgUidToCfg[this.spawnUnitConfigUid];
        ScriptUtils.SetValue(cfg, "Description", cfg.Description + (cfg.Description == "" ? "" : "\n") +
            "Тренирует: " + spawnUnitCfg.Name + "\n" +
            spawnUnitCfg.Description);
    }

    public InitResetSpawnCfg() {
        if (OpCfgUidToCfg[SpawnBuildingComponent.resetSpawnCfgUid] != undefined) {
            return;
        }

        // создаем конфиг
        OpCfgUidToCfg[SpawnBuildingComponent.resetSpawnCfgUid] = CreateUnitConfig("#UnitConfig_Slavyane_Swordmen", SpawnBuildingComponent.resetSpawnCfgUid);
        
        var cfg = OpCfgUidToCfg[SpawnBuildingComponent.resetSpawnCfgUid];

        // имя
        ScriptUtils.SetValue(cfg, "Name", "Перезапустить найм");
        // описание
        ScriptUtils.SetValue(cfg, "Description", "Перезапустить найм юнитов. Юниты будут наняты через обычное время с перезапуска.");
        // время постройки
        ScriptUtils.SetValue(cfg, "ProductionTime", 500);
        // убираем требования
        cfg.TechConfig.Requirements.Clear();
        // убираем производство людей
        ScriptUtils.SetValue(cfg, "ProducedPeople", 0);
        // убираем налоги
        ScriptUtils.SetValue(cfg, "SalarySlots", 0);
        // делаем 0-ую стоимость
        ScriptUtils.SetValue(cfg.CostResources, "Gold",   0);
        ScriptUtils.SetValue(cfg.CostResources, "Metal",  0);
        ScriptUtils.SetValue(cfg.CostResources, "Lumber", 0);
        ScriptUtils.SetValue(cfg.CostResources, "People", 0);
    }
}