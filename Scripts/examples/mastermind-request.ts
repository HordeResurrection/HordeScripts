import { createPoint } from "library/common/primitives";
import { ARequest, ProduceRequest, ProduceRequestParameters } from "library/mastermind/mastermind-types";
import HordeExampleBase from "./base-example";

/**
 * Пример работы с MasterMind
 */
export class Example_MasterMindRequest extends HordeExampleBase {
    workPlayerNum: string;
    printRequestsPeriod: number;
    masterMind: any;
    productionDepartament: any;

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
        this.productionDepartament = this.masterMind.ProductionDepartment;

        // Создадим запрос на производство одной катапульты
        this.addCatapultRequest(1);

        // Создадим запрос на производство одной избы
        this.addFarmRequest(1);

        // Создадим запрос на строительство двух казарм
        this.addBarrackRequest(2);

        // Проверяем запросы
        let requests = this.masterMind.Requests;
        this.log.info('Запросов в обработке:', requests.Count);
        ForEach(requests, (item: ARequest) => {
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
        ForEach(requests, (item: ARequest) => {
            this.log.info('-', item);
        });
    }

    private addCatapultRequest(n: number) {
        let uCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Catapult");

        // Параметры запроса
        let produceRequestParameters = new ProduceRequestParameters(uCfg, n);
        produceRequestParameters.CheckExistsRequest = false;            // Следует ли проверять наличие имеющихся запросов?
        produceRequestParameters.AllowAuxiliaryProduceRequests = true;  // Разрешить ли создавать запросы на производство требуемых юнитов?
        produceRequestParameters.TargetCell = null;                     // Местоположение строительства (актуально только для зданий)

        // Добавление запроса
        this.addProduceRequest(produceRequestParameters);
    }

    private addFarmRequest(n: number) {
        let uCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Farm");

        // Параметры запроса
        let produceRequestParameters = new ProduceRequestParameters(uCfg, 1);
        produceRequestParameters.CheckExistsRequest = false;            // Следует ли проверять наличие имеющихся запросов?
        produceRequestParameters.AllowAuxiliaryProduceRequests = false; // Разрешить ли создавать запросы на производство требуемых юнитов?
        produceRequestParameters.TargetCell = createPoint(95, 3);       // Местоположение строительства (верхний левый угол)
        produceRequestParameters.MaxRetargetAttempts = 0;               // Количество попыток (за такт) для выбора другого места строительства поблизости
        produceRequestParameters.DisableBuildPlaceChecking = true;      // Принудительное строительство в этой клетке без проверки места
        produceRequestParameters.ProductEntranceCheckRadius = 2;        // Радиус проверяемого региона вокруг клетки входа (для зданий-казарм и складов)
        produceRequestParameters.ReservationIgnoreLevel = 0;            // Уровень баллов резервирования, которые будут проигнорированы при выбре места строительства

        let workPlayer = Players[this.workPlayerNum].GetRealPlayer();
        let producer = workPlayer.GetRealSettlement().Units.GetById(205);
        produceRequestParameters.Producer = producer;                   // Так можно задать юнита-исполнителя (если null, то будет выбран свободный подходящий производитель)

        // Добавление запроса
        for (let i = 0; i < n; i++) {
            this.addProduceRequest(produceRequestParameters);
        }
    }

    private addBarrackRequest(n: number) {
        let uCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Barrack");

        // Параметры запроса
        let produceRequestParameters = new ProduceRequestParameters(uCfg, 1);
        produceRequestParameters.CheckExistsRequest = false;            // Следует ли проверять наличие имеющихся запросов?
        produceRequestParameters.AllowAuxiliaryProduceRequests = false; // Разрешить ли создавать запросы на производство требуемых юнитов?
        produceRequestParameters.TargetCell = null;                     // Местоположение строительства (null - означает автоматический выбор места)
        produceRequestParameters.MaxRetargetAttempts = null;            // Количество попыток (за такт) для выбора другого места строительства поблизости (при null будет использовано значение по умолчанию)
        produceRequestParameters.DisableBuildPlaceChecking = false;     // Отключить режим принудительного строительства
        produceRequestParameters.ProductEntranceCheckRadius = 2;        // Радиус проверяемого региона вокруг клетки входа (для зданий-казарм и складов)
        produceRequestParameters.ReservationIgnoreLevel = 0;            // Уровень баллов резервирования, которые будут проигнорированы при выбре места строительства

        // Добавление запроса
        for (let i = 0; i < n; i++) {
            this.addProduceRequest(produceRequestParameters);
        }
    }

    private addProduceRequest(produceRequestParameters) {
        let requestVar = host.newVar(ProduceRequest);
        if (this.productionDepartament.AddRequestToProduce(produceRequestParameters, requestVar.out)) {
            this.log.info('Добавлен запрос на производство:', requestVar);
        } else {
            this.log.info('Не удалось добавить запрос на производство.');
        }
        return requestVar;
    }
}
