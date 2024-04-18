import { createPoint } from "library/common/primitives";
import { ProduceRequestParameters } from "library/mastermind/matermind-types";
import HordeExampleBase from "./base-example";

/**
 * Пример работы с MasterMind
 */
export class Example_MasterMindRequest extends HordeExampleBase {

    public constructor() {
        super("Request for MasterMind");
    }

    public onFirstRun() {
        this.logMessageOnRun();
        
        let realPlayer = Players["1"].GetRealPlayer();
        let masterMind = realPlayer.MasterMind;
        if (!masterMind) {
            this.log.info('Выбранный игрок не управляется MasterMind.');
            return;
        }

        // Активация MasterMind, если отключен
        if (!masterMind.IsWorkMode) {
            this.log.info('Включение режима работы MasterMind для', realPlayer.Nickname);
            masterMind.IsWorkMode = true;
        }

        // Создадим запрос на производство одной катапульты
        let productionDepartament = masterMind.ProductionDepartment;
        let catapultCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Catapult");

        // Параметры запроса
        let produceRequestParameters = new ProduceRequestParameters(catapultCfg, 1);
        produceRequestParameters.CheckExistsRequest = false;            // Следует ли проверять наличие имеющихся запросов?
        produceRequestParameters.AllowAuxiliaryProduceRequests = true;  // Разрешить ли создавать запросы на производство требуемых юнитов?
        produceRequestParameters.TargetPosition = null;                 // Местоположение строительства (актуально только для зданий)

        // Добавление запроса
        if (!productionDepartament.AddRequestToProduce(produceRequestParameters)) {
            this.log.info('Не удалось добавить запрос на создание катапульты.');
        } else {
            this.log.info('Добавлен запрос на создание 1 катапульты.');
        }

        // Создадим запрос на производство одной избы
        let productionDepartament = masterMind.ProductionDepartment;
        let farmCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Farm");

        // Параметры запроса
        produceRequestParameters = new ProduceRequestParameters(farmCfg, 1);
        produceRequestParameters.CheckExistsRequest = false;            // Следует ли проверять наличие имеющихся запросов?
        produceRequestParameters.AllowAuxiliaryProduceRequests = false; // Разрешить ли создавать запросы на производство требуемых юнитов?
        produceRequestParameters.TargetPosition = createPoint(95, 3);   // Местоположение строительства (верхний левый угол)
        produceRequestParameters.MaxRetargetAttempts = 0;               // Количество попыток (за такт) для выбора другого места строительства поблизости

        // Добавление запроса
        if (!productionDepartament.AddRequestToProduce(produceRequestParameters)) {
            this.log.info('Не удалось добавить запрос на постройку избы.');
        } else {
            this.log.info('Добавлен запрос на постройку избы.');
        }

        // Проверяем запросы
        let requests = masterMind.Requests;
        this.log.info('Запросов в обработке:', requests.Count);
        ForEach(requests, item => {
            this.log.info('-', item);
        });
    }
}
