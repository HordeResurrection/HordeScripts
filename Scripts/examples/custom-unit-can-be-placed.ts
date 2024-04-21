import { CanBePlacedByKnownMapJsResult, CanBePlacedByRealMapJsResult, KnownUnit, Unit } from "library/game-logic/horde-types";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { setUnitCanBePlacedWorker } from "library/game-logic/workers-tools";
import HordeExampleBase from "./base-example";

/**
 * Пример создания юнита со скриптовым CanBePlaced-обработчиком.
 * Здесь выполняется создание кастомного конфига замка, который нельзя строить впритык к другим зданиям.
 * 
 * Внимание! В данный момент здесь наблюдается низкая производительность из-за маршаллинга.
 */
export class Example_CustomUnitCanBePlaced extends HordeExampleBase {
    private baseCanBePlacedWorker: any;

    public constructor() {
        super("Custom worker: CanBePlaced");

        this.baseCanBePlacedWorker = host.newObj(HCL.HordeClassLibrary.UnitComponents.Workers.BaseBuilding.Special.BaseBuildingCanBePlaced);
    }


    public onFirstRun() {
        this.logMessageOnRun();
        
        // Создание конфига кастомного замка
        let unitCfg = this.getOrCreateUnitConfig();

        // Создание и установка CanBePlaced-обработчика
        setUnitCanBePlacedWorker(this, unitCfg, this.canBePlacedWorkerByKnownMap, this.canBePlacedWorkerByRealMap);

        this.log.info('Настройка воина завершена!');
    }


    private getOrCreateUnitConfig() {
        let exampleCfgUid = "#UnitConfig_Slavyane_Castle_EXAMPLE";
        let unitCfg;
        if (HordeContentApi.HasUnitConfig(exampleCfgUid)) {
            // Конфиг уже был создан, берем предыдущий
            unitCfg = HordeContentApi.GetUnitConfig(exampleCfgUid);
            this.log.info('Конфиг здания для теста:', unitCfg);
        } else {
            // Создание нового конфига
            let unitCfgOrig = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Castle");
            unitCfg = HordeContentApi.CloneConfig(unitCfgOrig, exampleCfgUid);
            ScriptUtils.SetValue(unitCfg, "Name", "Замок-пример");

            // Добавление здания рабочему
            let producerCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Worker1");
            let producerParams = producerCfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            let produceList = producerParams.CanProduceList;
            produceList.Add(unitCfg);

            this.log.info('Создан новый конфиг здания для теста:', unitCfg);
        }

        return unitCfg;
    }


    private canBePlacedWorkerByKnownMap(settlement, uCfg, x, y, size1x1, considerUnit) {

        // Запуск обычного CanBePlaced-обработчика на известной карте
        let troubleUnitVar = host.newVar(KnownUnit);
        let tmpResult = this.baseCanBePlacedWorker.CanBePlacedByKnownMap(settlement, uCfg, x, y, troubleUnitVar.out, size1x1, considerUnit);

        let result = new CanBePlacedByKnownMapJsResult(tmpResult, troubleUnitVar);
        if (!tmpResult) {
            return result;
        }

        // Поиск других зданий вокруг
        let w = uCfg.Size.Width;
        let h = uCfg.Size.Height;
        if (size1x1) {
            w = 1;
            h = 1;
        }

        const scn = settlement.Scena;
        const scnW = scn.Size.Width;
        const scnH = scn.Size.Height;
        for (let i = x - 1; i < x + w + 1; i++) {
            for (let j = y - 1; j < y + h + 1; j++) {
                if (i < 0 || i >= scnW)
                    continue;
                if (j < 0 || j >= scnH)
                    continue;

                let ku = settlement.Map.GetUpperKnownUnit(i, j);
                if (!ku) {
                    continue;
                }

                if (ku.Cfg.IsBuilding) {
                    result.CanBePlaced = false;
                    return result;
                }
            }
        }
        
        return result;
    }


    private canBePlacedWorkerByRealMap(scena, uCfg, x, y, size1x1, considerUnit) {

        // Запуск обычного CanBePlaced-обработчика на реальной карте
        let troubleUnitVar = host.newVar(Unit);
        let tmpResult = this.baseCanBePlacedWorker.CanBePlacedByRealMap(scena, uCfg, x, y, troubleUnitVar.out, size1x1, considerUnit);

        let result = new CanBePlacedByRealMapJsResult(tmpResult, troubleUnitVar);
        if (!tmpResult) {
            return result;
        }

        // Поиск других зданий вокруг
        let w = uCfg.Size.Width;
        let h = uCfg.Size.Height;
        if (size1x1) {
            w = 1;
            h = 1;
        }

        const scnW = scena.Size.Width;
        const scnH = scena.Size.Height;
        for (let i = x - 1; i < x + w + 1; i++) {
            for (let j = y - 1; j < y + h + 1; j++) {
                if (i < 0 || i >= scnW)
                    continue;
                if (j < 0 || j >= scnH)
                    continue;

                let u = scena.UnitsMap.GetUpperUnit(i, j);
                if (!u) {
                    continue;
                }

                if (u.Cfg.IsBuilding) {
                    result.CanBePlaced = false;
                    return result;
                }
            }
        }
        
        return result;
    }
}
