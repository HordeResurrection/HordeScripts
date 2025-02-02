import { createHordeColor } from "library/common/primitives";
import { inspect } from "library/common/introspection";
import { AllContent, UnitConfig } from "library/game-logic/horde-types";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import HordeExampleBase from "./base-example";

/**
 * Пример работы с конфигами.
 * 
 * Внимание! Здесь выполняется работа с реальными объектами (не API)
 * Поэтому для сброса изменений требуется полный перезапуск игры.
 */
export class Example_ConfigWorks extends HordeExampleBase {

    public constructor() {
        super("Работа с конфигами");
    }

    public onFirstRun() {
        this.logMessageOnRun();
        this._configWorks();
    }

    private _configWorks() {
        this.log.info("Слепок контента:", HordeContentApi.ContentStamp);

        // Перечисление всех доступных конфигов юнитов
        this.log.info("Конфиги рыцарей:");
        ForEach(AllContent.UnitConfigs.Configs, (kv: { Key: string, Value: UnitConfig }) => {
            let uid = kv.Key;
            let uCfg = kv.Value;
            if (uid.includes('men')) {
                this.log.info('-', '"' + uid + '"', '-', uCfg);
            }
        })

        // Получаем конфиг катапульты
        let catapultCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Catapult");

        // Здесь можно убрать if-false, чтобы отобразить поля конфига
        // Здесь не следует копать более чем на 1 уровень в глубину, т.к. получается слишком много данных
        if (false) inspect(catapultCfg, 1, "Конфиг катапульты:");

        // Получаем значения из конфига
        let rocks = catapultCfg.MainArmament.EmitBulletsCountMin;
        this.log.info("Текущее количество камней при выстреле:", rocks);

        // Устанавливаем значения в private-члены конфига
        this.log.info("Делаем магию..");
        rocks += 1;
        if (rocks > 10)
            rocks = 1;
        ScriptUtils.SetValue(catapultCfg.MainArmament, "EmitBulletsCountMin", rocks);
        ScriptUtils.SetValue(catapultCfg.MainArmament, "EmitBulletsCountMax", rocks);

        // Результат можно проверить в игре
        this.log.info("Теперь катапульты кидают", catapultCfg.MainArmament.EmitBulletsCountMin, "камней за выстрел!");
    }
}


/**
 * Пример добавления конфига
 * 
 * Внимание! Для сброса изменений требуется запуск "Example_ConfigRemoving".
 */
export class Example_ConfigCreation extends HordeExampleBase {
    private remover: Example_ConfigRemoving;

    public constructor() {
        super("Создание конфига");
        this.remover = new Example_ConfigRemoving();
    }


    public onFirstRun() {
        this.logMessageOnRun();
        this._createConfig();
    }


    private _createConfig() {

        // Берем исходные конфиги
        let ballistaCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Balista");
        let factoryCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Factory");

        // Идентификатор для нового конфига
        // Если установить null или существующий идентификатор, то будет при клонировании будет сгенерирован уникальный идентификатор
        let newCfgUid = "#UnitConfig_Slavyane_DynamicBallista";
        // let newCfgUid = null;

        // Чистим, если конфиг с таким идентификатором уже имеется (видимо пример запускается не первый раз)
        this.remover.removeConfig();

        // Клонируем конфиг и изменяем
        let newBallistaCfg = HordeContentApi.CloneConfig(ballistaCfg, newCfgUid) as UnitConfig;
        ScriptUtils.SetValue(newBallistaCfg, "Name", "Динамическая баллиста");
        ScriptUtils.SetValue(newBallistaCfg, "ProductionTime", 50);
        ScriptUtils.SetValue(newBallistaCfg, "TintColor", createHordeColor(255, 255, 150, 150));
        this.log.info('Создан новый конфиг баллисты:', newBallistaCfg.Uid, `(${newBallistaCfg.Name})`);

        // Добавляем новую баллисту в завод
        let producerParams = factoryCfg.GetProfessionParams<UnitProducerProfessionParams>(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        let produceList = producerParams.CanProduceList;
        this.log.info('Сейчас завод производит:', produceList.Count, 'вида техники');
        this.log.info('Добавляем только что созданную баллисту в список производства..');
        produceList.Add(newBallistaCfg);
        this.log.info('Теперь завод производит:', produceList.Count, 'вида техники');
    }
}

/**
 * Пример удаления конфига
 * 
 * Внимание! Конфиг добавляется в примере "Example_ConfigCreation".
 */
export class Example_ConfigRemoving extends HordeExampleBase {

    public constructor() {
        super("Удаление конфига");
    }


    public onFirstRun() {
        this.logMessageOnRun();
        this.removeConfig();
    }


    public removeConfig() {
        let targetCfgUid = "#UnitConfig_Slavyane_DynamicBallista";

        // Добавлен?
        if (!HordeContentApi.HasUnitConfig(targetCfgUid)) {
            this.log.info('Конфиг пока что не был добавлен:', "'" + targetCfgUid + "'");
            this.log.info("Сначала нужно запустить пример 'Example_ConfigCreation'");
            return;
        }
        let targetCfg = HordeContentApi.GetUnitConfig(targetCfgUid);

        this.log.info('Удаление конфига из контента:', targetCfgUid);
        HordeContentApi.RemoveConfig(targetCfg);

        this.log.info('Удаление из завода ссылок на конфиг:', targetCfgUid);
        let factoryCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Factory");
        let producerParams = factoryCfg.GetProfessionParams<UnitProducerProfessionParams>(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        let produceList = producerParams.CanProduceList;
        ScriptUtils.RemoveAll(produceList, targetCfg);
    }
}
