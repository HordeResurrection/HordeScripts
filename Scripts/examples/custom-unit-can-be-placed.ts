import { CanBePlacedByKnownMapJsResult, CanBePlacedByRealMapJsResult, KnownUnit, Scena, Settlement, Unit, UnitConfig } from "library/game-logic/horde-types";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { setUnitCanBePlacedWorker } from "library/game-logic/workers";
import HordeExampleBase from "./base-example";

const BaseBuildingCanBePlaced = HordeClassLibrary.UnitComponents.Workers.BaseBuilding.Special.BaseBuildingCanBePlaced;
type BaseBuildingCanBePlaced = HordeClassLibrary.UnitComponents.Workers.BaseBuilding.Special.BaseBuildingCanBePlaced;

/**
 * Пример создания юнита со скриптовым CanBePlaced-обработчиком.
 * Здесь выполняется создание кастомного конфига замка, который нельзя строить впритык к другим зданиям.
 * 
 * Внимание! В данный момент здесь наблюдается низкая производительность из-за маршаллинга.
 */
export class Example_CustomUnitCanBePlaced extends HordeExampleBase {
    private baseCanBePlacedWorker: BaseBuildingCanBePlaced;

    public constructor() {
        super("Custom worker: CanBePlaced");

        this.baseCanBePlacedWorker = new BaseBuildingCanBePlaced();
    }


    public onFirstRun() {
        this.logMessageOnRun();

        // Создание конфига кастомного замка
        let unitCfg = this.getOrCreateUnitConfig();

        // Создание и установка CanBePlaced-обработчиков
        let pluginWrapped_canBePlacedWorkerByKnownMap =
            (settlement: Settlement, uCfg: UnitConfig, x: number, y: number, size1x1?: boolean, considerUnit?: boolean) =>
                this.canBePlacedWorkerByKnownMap(settlement, uCfg, x, y, size1x1, considerUnit);
        let pluginWrapped_canBePlacedWorkerByRealMap =
            (scena: Scena, uCfg: UnitConfig, x: number, y: number, size1x1?: boolean, considerUnit?: boolean) =>
                this.canBePlacedWorkerByRealMap(scena, uCfg, x, y, size1x1, considerUnit);
        setUnitCanBePlacedWorker("Example", unitCfg, pluginWrapped_canBePlacedWorkerByKnownMap, pluginWrapped_canBePlacedWorkerByRealMap);

        this.log.info('Настройка воина завершена!');
    }


    private getOrCreateUnitConfig() {
        let exampleCfgUid = "#UnitConfig_Slavyane_Castle_EXAMPLE";
        let unitCfg: UnitConfig;
        if (HordeContentApi.HasUnitConfig(exampleCfgUid)) {
            // Конфиг уже был создан, берем предыдущий
            unitCfg = HordeContentApi.GetUnitConfig(exampleCfgUid);
            this.log.info('Конфиг здания для теста:', unitCfg);
        } else {
            // Создание нового конфига
            let unitCfgOrig = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Castle");
            unitCfg = HordeContentApi.CloneConfig(unitCfgOrig, exampleCfgUid) as UnitConfig;
            ScriptUtils.SetValue(unitCfg, "Name", "Замок-пример");

            // Добавление здания рабочему
            let producerCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Worker1");
            let producerParams = producerCfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer) as UnitProducerProfessionParams;
            let produceList = producerParams.CanProduceList;
            produceList.Add(unitCfg);

            this.log.info('Создан новый конфиг здания для теста:', unitCfg);
        }

        return unitCfg;
    }


    /**
     * Определяет возможность постройки здания по карте известной поселению (т.е. с учетом тумана войны).
     */
    private canBePlacedWorkerByKnownMap(settlement: Settlement, uCfg: UnitConfig, x: number, y: number, size1x1?: boolean, considerUnit?: boolean) {

        // Запуск обычного CanBePlaced-обработчика на известной карте
        let troubleUnitVar = host.newVar(KnownUnit) as HostVariable<KnownUnit>;
        let tmpResult = this.baseCanBePlacedWorker.CanBePlacedByKnownMap(settlement, uCfg, x, y, troubleUnitVar.out, size1x1, considerUnit);

        let result = new CanBePlacedByKnownMapJsResult(tmpResult, troubleUnitVar.value);
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


    /**
     * Определяет возможность постройки здания по реальной карте сцены (т.е. без учета тумана войны).
     */
    private canBePlacedWorkerByRealMap(scena: Scena, uCfg: UnitConfig, x: number, y: number, size1x1?: boolean, considerUnit?: boolean) {

        // Запуск обычного CanBePlaced-обработчика на реальной карте
        let troubleUnitVar = host.newVar(Unit) as HostVariable<Unit>;
        let tmpResult = this.baseCanBePlacedWorker.CanBePlacedByRealMap(scena, uCfg, x, y, troubleUnitVar.out, size1x1, considerUnit);

        let result = new CanBePlacedByRealMapJsResult(tmpResult, troubleUnitVar.value);
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
