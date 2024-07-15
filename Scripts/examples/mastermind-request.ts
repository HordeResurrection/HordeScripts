import { createPoint } from "library/common/primitives";
import { ProduceRequest, ProduceRequestParameters } from "library/mastermind/matermind-types";
import HordeExampleBase from "./base-example";

/**
 * Пример работы с MasterMind
 */
export class Example_MasterMindRequest extends HordeExampleBase {
    workPlayerNum: string;
    printRequestsPeriod: number;
    masterMind: any;

    public constructor() {
        super("Request for MasterMind");
        
        this.workPlayerNum = "1";
        this.printRequestsPeriod = 1000;
    }

    public onFirstRun() {
        this.logMessageOnRun();
        
        let workPlayer = Players[this.workPlayerNum].GetRealPlayer();
        this.masterMind = workPlayer.MasterMind;
        if (!this.masterMind) {
            this.log.info('Выбранный игрок не управляется MasterMind.');
            return;
        }
        
        // Активация MasterMind, если отключен
        if (!this.masterMind.IsWorkMode) {
            this.log.info('Включение режима работы MasterMind для', workPlayer.Nickname);
            this.masterMind.IsWorkMode = true;
        }

        // Объект для задания запросов
        let productionDepartament = this.masterMind.ProductionDepartment;

        // Создадим запрос на производство одной катапульты
        let catapultCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Catapult");

        // Параметры запроса
        let produceRequestParameters = new ProduceRequestParameters(catapultCfg, 1);
        produceRequestParameters.CheckExistsRequest = false;            // Следует ли проверять наличие имеющихся запросов?
        produceRequestParameters.AllowAuxiliaryProduceRequests = true;  // Разрешить ли создавать запросы на производство требуемых юнитов?
        produceRequestParameters.TargetCell = null;                     // Местоположение строительства (актуально только для зданий)

        // Добавление запроса
        let catapultRequestVar = host.newVar(ProduceRequest);
        if (productionDepartament.AddRequestToProduce(produceRequestParameters, catapultRequestVar.out)) {
            this.log.info('Добавлен запрос на создание катапульты:', catapultRequestVar);
        } else {
            this.log.info('Не удалось добавить запрос на создание катапульты.');
        }

        // Создадим запрос на производство одной избы
        let farmCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Farm");

        // Параметры запроса
        produceRequestParameters = new ProduceRequestParameters(farmCfg, 1);
        produceRequestParameters.CheckExistsRequest = false;            // Следует ли проверять наличие имеющихся запросов?
        produceRequestParameters.AllowAuxiliaryProduceRequests = false; // Разрешить ли создавать запросы на производство требуемых юнитов?
        produceRequestParameters.TargetCell = createPoint(95, 3);       // Местоположение строительства (верхний левый угол)
        produceRequestParameters.MaxRetargetAttempts = 0;               // Количество попыток (за такт) для выбора другого места строительства поблизости
        produceRequestParameters.DisableBuildPlaceChecking = true;      // Принудительное строительство в этой клетке без проверки места
        let producer = workPlayer.GetRealSettlement().Units.GetById(205);
        produceRequestParameters.Producer = producer;                   // Так можно задать юнита-исполнителя (если null, то будет выбран свободный подходящий производитель)

        // Добавление запроса
        let farmRequestVar = host.newVar(ProduceRequest);
        if (productionDepartament.AddRequestToProduce(produceRequestParameters, farmRequestVar.out)) {
            this.log.info('Добавлен запрос на постройку избы:', farmRequestVar);
        } else {
            this.log.info('Не удалось добавить запрос на постройку избы.');
        }

        // Проверяем запросы
        let requests = this.masterMind.Requests;
        this.log.info('Запросов в обработке:', requests.Count);
        ForEach(requests, item => {
            this.log.info('-', item);
        });
    }

    public onEveryTick(gameTickNum: number) {
        if (this.masterMind == 0) {
            return;
        }
        if (this.printRequestsPeriod == 0) {
            return;
        }
        if (gameTickNum % this.printRequestsPeriod != 0) {
            return;
        }

        // Отобразить текущие запросы
        let requests = this.masterMind.Requests;
        this.log.info('Запросов в обработке:', requests.Count);
        ForEach(requests, item => {
            this.log.info('-', item);
        });
    }
}
