import { Point2D } from "library/common/primitives";
import { ARequest, MasterMind, ProduceRequest, ProduceRequestParameters, ProductionDepartment } from "library/mastermind/mastermind-types";
import HordeExampleBase from "./base-example";
import { Player } from "library/game-logic/horde-types";

/**
 * Пример работы с MasterMind
 */
export class Example_MasterMindRequest extends HordeExampleBase {
    workPlayer: Player;
    printRequestsPeriod: number;
    masterMind: MasterMind | null;
    productionDepartament: ProductionDepartment | null;

    public constructor() {
        super("Request for MasterMind");

        this.workPlayer = ActivePlayer;
        if (Players.length > 1)
            this.workPlayer = Players[1];  // Если есть бот, то задачи будут отправлены на него

        this.printRequestsPeriod = 1000;
        this.masterMind = null;
        this.productionDepartament = null;
    }

    public onFirstRun() {
        this.logMessageOnRun();

        this.masterMind = this.workPlayer.MasterMind;
        if (!this.masterMind) {
            this.log.info('Выбранный игрок не управляется MasterMind.');
            return;
        }

        // Активация MasterMind, если отключен
        if (!this.masterMind.IsWorkMode) {
            this.log.info('Включение режима работы MasterMind для', this.workPlayer.Nickname);
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

        // Создадим запрос на производство заборов
        this.addFenceRequest(new Point2D(102, 11), null);
        this.addFenceRequest(new Point2D(100, 10), new Point2D(101, 10));

        // Создадим запрос на производство моста
        this.addBridgeRequest(new Point2D(71, 40), new Point2D(75, 47));

        // Проверяем запросы
        let requests = this.masterMind.Requests;
        this.log.info('Запросов в обработке:', requests.Count);
        ForEach(requests, (item: ARequest) => {
            this.log.info('-', item);
        });
    }

    public onEveryTick(gameTickNum: number) {
        if (!this.masterMind) {
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
        produceRequestParameters.TargetCell = new Point2D(95, 3);       // Местоположение строительства (верхний левый угол)
        produceRequestParameters.MaxRetargetAttempts = 0;               // Количество попыток (за такт) для выбора другого места строительства поблизости
        produceRequestParameters.DisableBuildPlaceChecking = true;      // Принудительное строительство в этой клетке без проверки места
        produceRequestParameters.ProductEntranceCheckRadius = 2;        // Радиус проверяемого региона вокруг клетки входа (для зданий-казарм и складов)
        produceRequestParameters.ReservationIgnoreLevel = 0;            // Уровень баллов резервирования, которые будут проигнорированы при выбре места строительства

        let producer = this.workPlayer.GetRealSettlement().Units.GetById(205);
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

    private addFenceRequest(start: Point2D, end: Point2D | null) {
        let uCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Fence");

        // Параметры запроса
        let produceRequestParameters = new ProduceRequestParameters(uCfg, 1);
        produceRequestParameters.CheckExistsRequest = false;            // Следует ли проверять наличие имеющихся запросов?
        produceRequestParameters.AllowAuxiliaryProduceRequests = false; // Разрешить ли создавать запросы на производство требуемых юнитов?
        produceRequestParameters.TargetCell = start;                    // Местоположение строительства (верхний левый угол)
        produceRequestParameters.TargetEndCell = end;                   // До какой точки строить (только для составных зданий)
        produceRequestParameters.ProductEntranceCheckRadius = 2;        // Радиус проверяемого региона вокруг клетки входа (для зданий-казарм и складов)
        produceRequestParameters.ReservationIgnoreLevel = 0;            // Уровень баллов резервирования, которые будут проигнорированы при выбре места строительства

        // Следующие параметры всегда имеют такие значения для составных зданий:
        produceRequestParameters.DisableBuildPlaceChecking = true;
        produceRequestParameters.MaxRetargetAttempts = 0;

        // Добавление запроса
        this.addProduceRequest(produceRequestParameters);
    }

    private addBridgeRequest(start: Point2D, end: Point2D | null) {
        let uCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Bridge");

        // Параметры запроса
        let produceRequestParameters = new ProduceRequestParameters(uCfg, 1);
        produceRequestParameters.CheckExistsRequest = false;            // Следует ли проверять наличие имеющихся запросов?
        produceRequestParameters.AllowAuxiliaryProduceRequests = false; // Разрешить ли создавать запросы на производство требуемых юнитов?
        produceRequestParameters.TargetCell = start;                    // Местоположение строительства (верхний левый угол)
        produceRequestParameters.TargetEndCell = end;                   // До какой точки строить (только для составных зданий)
        produceRequestParameters.ProductEntranceCheckRadius = 2;        // Радиус проверяемого региона вокруг клетки входа (для зданий-казарм и складов)
        produceRequestParameters.ReservationIgnoreLevel = 0;            // Уровень баллов резервирования, которые будут проигнорированы при выбре места строительства

        // Следующие параметры всегда имеют такие значения для составных зданий:
        produceRequestParameters.DisableBuildPlaceChecking = true;
        produceRequestParameters.MaxRetargetAttempts = 0;

        // Добавление запроса
        this.addProduceRequest(produceRequestParameters);
    }

    private addProduceRequest(produceRequestParameters: ProduceRequestParameters) {
        if (this.productionDepartament == null) {
            return null;
        }

        let requestVar = host.newVar(ProduceRequest) as HostVariable<ProduceRequest>;
        if (this.productionDepartament.AddRequestToProduce(produceRequestParameters, requestVar.out)) {
            this.log.info('Добавлен запрос на производство:', requestVar);
        } else {
            this.log.info('Не удалось добавить запрос на производство.');
        }

        return requestVar;
    }
}
