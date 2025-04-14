import { createResourcesAmount } from "library/common/primitives";
import HordeExampleBase from "./base-example";
import { Unit } from "library/game-logic/horde-types";


/**
 * Работа с поселением
 */
export class Example_SettlementWorks extends HordeExampleBase {

    public constructor() {
        super("Settlement works");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        let realPlayer = Players[0].GetRealPlayer();
        let realSettlement = realPlayer.GetRealSettlement();

        // Дипломатия
        let diplomacy = realSettlement.Diplomacy;
        let otherSettlement = Players[1].GetRealPlayer().GetRealSettlement();
        if (diplomacy.IsWarStatus(otherSettlement)) {
            this.log.info(`${realSettlement.LeaderName} ВОЮЕТ с ${otherSettlement.LeaderName}!`);
        } else {
            this.log.info(`${realSettlement.LeaderName} НЕ воюет с ${otherSettlement.LeaderName}!`);
        }

        // Модуль вИдения
        // Примеры см. в "Example_ScenaWorks"
        // let vision = realSettlement.Vision;

        // Юниты поселения
        let units = realSettlement.Units;
        this.log.info(`Количество юнитов:`, units.Count);
        // Здесь можно получать юнитов только по идентификатору, а по координатам см. через сцену.
        let unit = units.GetById(0);
        if (unit) {
            this.log.info(`У ${realPlayer.Nickname} обнаружен юнит с id=0: ${unit}`);
        }

        // Перечисление юнитов этого поселения
        let enumerator = units.GetEnumerator();
        while (enumerator.MoveNext()) {
            this.log.info('Первый юнит:', enumerator.Current);
            break;  // Через ForEach пока что нельзя делать break, а через использование enumerator'а можно
        }
        enumerator.Dispose();

        // Модуль победы/поражения
        let existence = realSettlement.Existence;

        // Объявить поражение
        if (false) { existence.ForceTotalDefeat(); }  // Убрать false и тогда этому поселению будет засчитано поражение

        // Сбросить состояние победы/поражения
        if (false) { existence.ForceResetToCombat(); }
    }
}


/**
 * Работа с ресурсами поселения
 */
export class Example_SettlementResources extends HordeExampleBase {
    private settlements: Array<string>;

    public constructor() {
        super("Settlement resources");

        this.settlements = ["0"];
    }

    public onFirstRun() {
        this.logMessageOnRun();

        let scenaSettlements = ActiveScena.GetRealScena().Settlements;
        for (let settlementId of this.settlements) {
            let settlement = scenaSettlements.GetByUid(settlementId);

            // Высокоуровневый объект для управления ресурсами поселения
            let settlementResources = settlement.Resources;
            this.log.info("Ресурсы поселения", '"' + settlement.TownName + '":', settlementResources);

            let initialResources = settlementResources.GetCopy();
            this.log.info("Текущее количество ресурсов:", initialResources);

            let amount = createResourcesAmount(50, 50, 10, 0);
            settlementResources.SetResources(amount);
            this.log.info("Установлено:", amount);
            this.log.info("- Текущее количество ресурсов:", settlementResources.GetCopy());

            amount = createResourcesAmount(1, 2, 3, 5);
            settlementResources.AddResources(amount);
            this.log.info("Добавлено:", amount);
            this.log.info("- Текущее количество ресурсов:", settlementResources.GetCopy());

            amount = createResourcesAmount(3, 1, 2, 5);
            settlementResources.TakeResources(amount);
            this.log.info("Снято:", amount);
            this.log.info("- Текущее количество ресурсов:", settlementResources.GetCopy());

            amount = createResourcesAmount(300, 100, 200, 0);
            this.log.info("Попытка снять:", amount);
            if (!settlementResources.TakeResourcesIfEnough(amount)) {
                this.log.info("- Ресурсов недостаточно!");
            }
            this.log.info("- Текущее количество ресурсов:", settlementResources.GetCopy());

            settlementResources.SetResources(initialResources);
            this.log.info("Установлено прежнее количество ресурсов:", settlementResources.GetCopy());
        }
    }
}


/**
 * Информация о юнитах поселения
 */
export class Example_SettlementUnitsInfo extends HordeExampleBase {

    public constructor() {
        super("Settlement units info");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        let realPlayer = Players[0].GetRealPlayer();
        let realSettlement = realPlayer.GetRealSettlement();
        let that = this;

        // Юниты разных типов
        let professionCenter = realSettlement.Units.Professions;
        this.log.info('Выбор юнита по типу:');
        let logUnit = function (str: string, u: Unit) { that.log.info(str + ':', u ? u : '<None>') };
        logUnit('- Первый в MainBuildings', professionCenter.MainBuildings.First());
        logUnit('- Первый в Barracks', professionCenter.Barracks.First());
        logUnit('- Первый в Factories', professionCenter.Factories.First());
        logUnit('- Первый в Stables', professionCenter.Stables.First());
        logUnit('- Первый в Sawmills', professionCenter.Sawmills.First());
        logUnit('- Первый в MetalStocks', professionCenter.MetalStocks.First());
        logUnit('- Первый в Workers', professionCenter.Workers.First());
        logUnit('- Первый в FreeWorkers', professionCenter.FreeWorkers.First());
        logUnit('- Первый в AllUnitsExceptPassive', professionCenter.AllUnitsExceptPassive.First());
        logUnit('- Первый в ProducingUnits', professionCenter.ProducingUnits.First());
        logUnit('- Первый в ProducingBuildings', professionCenter.ProducingBuildings.First());
        logUnit('- Первый в ActiveBuildings', professionCenter.ActiveBuildings.First());
        logUnit('- Первый в DevelopmentBoosterBuildings', professionCenter.DevelopmentBoosterBuildings.First());
        logUnit('- Первый в MaxGrowthSpeedIncreaseBuildings', professionCenter.MaxGrowthSpeedIncreaseBuildings.First());
        logUnit('- Первый в Unarmed', professionCenter.Unarmed.First());

        // Информация о производстве
        let settlementProduction = realSettlement.Production;
        let catapultCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Catapult");
        this.log.info('В данный момент катапульт имеется:', professionCenter.CountUnitsOfType(catapultCfg));
        this.log.info('В данный момент катапульт производится:', settlementProduction.CountProducingNowUnits(catapultCfg));
    }
}
