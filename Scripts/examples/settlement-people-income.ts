import HordeExampleBase from "./base-example";


const PeopleIncomeLevel = HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;
type PeopleIncomeLevel = HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;

/**
 * Пример работы с уровнями прироста населения.
 * Уровень задаёт скорость прироста населения при определенном количестве ферм и мельниц.
 */
export class Example_SettlementPeopleIncome extends HordeExampleBase {
    private settlements: Array<string>;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Settlement's people income");

        // Поселения, для которых будут выполнены изменения
        this.settlements = ["0"];
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        this.logMessageOnRun();

        let scenaSettlements = ActiveScena.GetRealScena().Settlements;
        for (let settlementId of this.settlements) {
            let settlement = scenaSettlements.GetByUid(settlementId);

            let censusModel = ScriptUtils.GetValue(settlement.Census, "Model");

            // Отключить прирост населения
            censusModel.PeopleIncomeLevels.Clear();
            censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevel(0, 0, -1));
            censusModel.LastPeopleIncomeLevel = 0;
            this.log.info("Прирост населения отключен!");

            // Установить кастомные значения уровней прироста населения
            censusModel.PeopleIncomeLevels = HordeClassLibrary.World.Settlements.Modules.SettlementPopulationCensus.GetDefaultPeopleIncomeLevels();
            censusModel.PeopleIncomeLevels.Clear();
            censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevel(0, 5, 100));  // 0 мельниц  +  5 людей в домах  =  прирост 100 тактов
            censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevel(0, 10, 90));  // 0 мельниц  + 10 людей в домах  =  прирост  90 тактов
            censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevel(1, 15, 80));  // 1 мельница + 15 людей в домах  =  прирост  80 тактов
            censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevel(2, 20, 50));  // 2 мельницы + 20 людей в домах  =  прирост  50 тактов
            censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevel(3, 50, 10));  // 3 мельницы + 50 людей в домах  =  прирост  10 тактов
            censusModel.LastPeopleIncomeLevel = 0;
            this.log.info("Уровни прироста населения изменены!");

            // Установить дефолтные значения уровней прироста населения
            censusModel.PeopleIncomeLevels = HordeClassLibrary.World.Settlements.Modules.SettlementPopulationCensus.GetDefaultPeopleIncomeLevels();
            censusModel.LastPeopleIncomeLevel = 0;
            this.log.info("Уровни прироста населения возвращены к значениям по умолчанию!");

            // Установить значение для текущего таймера прироста населения без привязки к уровням прироста
            // (Это значение НЕ отображается на панели с информацией)
            censusModel.PeopleIncomeTimer = 10;
            this.log.info("Текущий таймер прироста населения установлен:", censusModel.PeopleIncomeTimer);
        }
    }
}
