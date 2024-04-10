import { ProduceRequestArgs } from "library/mastermind/matermind-types";
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

        // Активация бота, если отключен
        if (!masterMind.IsWorkMode) {
            this.log.info('Включение режима работы MasterMind для', realPlayer.Nickname);
            masterMind.IsWorkMode = true;
        }

        // Создадим запрос на производство одной катапульты
        let productionDepartament = masterMind.ProductionDepartment;
        let catapultCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Catapult");
        let produceRequestArgs = new ProduceRequestArgs(catapultCfg, 1);
        produceRequestArgs.CheckExistsRequest = false;  // Следует ли проверять наличие имеющихся запросов?
        produceRequestArgs.AllowAuxiliaryProduceRequests = true; // Разрешить ли создавать запросы на производство требуемых юнитов?
        if (!productionDepartament.AddRequestToProduce(produceRequestArgs)) {
            this.log.info('Не удалось добавить запрос на создание катапульты.');
        } else {
            this.log.info('Добавлен запрос на создание 1 катапульты.');
        }

        // Проверяем запросы
        let requests = masterMind.Requests;
        this.log.info('Запросов в обработке:', requests.Count);
        ForEach(requests, item => {
            this.log.info('-', item);
        });
    }
}
