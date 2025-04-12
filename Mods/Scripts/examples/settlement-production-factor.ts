import HordeExampleBase from "./base-example";


const SettlementProduction = HordeClassLibrary.World.Settlements.Modules.SettlementProduction;
type SettlementProduction = HordeClassLibrary.World.Settlements.Modules.SettlementProduction;

/**
 * Пример работы с уровнем производства поселения.
 * Уровень производства влияет на скорость тренировки воинов.
 */
export class Example_SettlementProductionFactor extends HordeExampleBase {
    private settlements: Array<string>;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Settlement production factor");

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

            let production = settlement.Production;

            // Установить кастомные значения уровней производства
            production.DevelopmentLevelSpeedFactors.Clear();
            production.DevelopmentLevelSpeedFactors.Add(1.00); // 0 кузниц  -> 1.00x ускорение
            production.DevelopmentLevelSpeedFactors.Add(1.25); // 1 кузница -> 1.25x ускорение
            production.DevelopmentLevelSpeedFactors.Add(1.50); // 2 кузницы -> 1.50x ускорение
            production.DevelopmentLevelSpeedFactors.Add(1.75); // 3 кузницы -> 1.75x ускорение
            production.DevelopmentLevelSpeedFactors.Add(2.00); // 4 кузницы -> 2.00x ускорение
            production.DevelopmentLevelSpeedFactors.Add(5.00); // 5 кузниц  -> 5.00x ускорение

            // Установить дефолтные значения уровней производства
            ScriptUtils.SetValue(production, "DevelopmentLevelSpeedFactors", SettlementProduction.GetDefaultDevelopmentLevelSpeedFactors());
        }
    }
}
