import HordeExampleBase from "./base-example";


/**
 * Пример работы с бонусами при добыче ресурсов.
 */
export class Example_SettlementResourcesBonus extends HordeExampleBase {
    private settlements: Array<string>;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Settlement resources bonus");

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

            let resourcesBonus = settlement.Resources.Bonus;
            
            // Установить множители количества добываемых ресурсов
            ScriptUtils.SetValue(resourcesBonus, "MetalFactor", 2.5);
            ScriptUtils.SetValue(resourcesBonus, "GoldFactor", 1.5);
            ScriptUtils.SetValue(resourcesBonus, "LumberFactor", 3.5);
        }
    }
}
