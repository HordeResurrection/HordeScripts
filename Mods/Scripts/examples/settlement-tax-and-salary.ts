import { createResourcesAmount } from "library/common/primitives";
import HordeExampleBase from "./base-example";

/**
 * Пример работы с налогами и жалованием.
 * Изменяет налоги и жалования поселениям заданным в "settlements".
 */
export class Example_SettlementTaxAndSalary extends HordeExampleBase {
    private settlements: Array<string>;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Settlement's tax and salary");

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

            // Установить размер одной зарплаты
            censusModel.OneSalarySize = createResourcesAmount(4, 0, 0, 0);

            // Установить размер налогов с одного человека
            censusModel.TaxFactor = createResourcesAmount(8, 4, 4, 0);

            // Установить размер церковной десятины с одного человека
            censusModel.TitheFactor = createResourcesAmount(4, 2, 2, 0);

            // Установить период сбора налогов и выплаты жалования (чтобы отключить сбор, необходимо установить 0)
            censusModel.TaxAndSalaryUpdatePeriod = 9000;
        }
    }
}
