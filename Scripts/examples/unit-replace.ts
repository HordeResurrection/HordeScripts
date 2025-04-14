import { spawnDecoration } from "library/game-logic/decoration-spawn";
import HordeExampleBase from "./base-example";
import { getOrCreateTestUnit } from "./unit-example-utils";
import { ReplaceUnitParameters } from "library/game-logic/horde-types";


/**
 * Пример замены юнита
 */
export class Example_ReplaceUnit extends HordeExampleBase {

    public constructor() {
        super("Replace unit");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        // Юнит для замены
        let unitToReplace = this.getUnitToReplace();
        if (!unitToReplace) {
            this.log.info('Не удалось подобрать юнита для этого примера!');
            return;
        }
        this.log.info('Для этого примера выбран:', unitToReplace);

        // Параметры замены
        let replaceParams = new ReplaceUnitParameters();
        replaceParams.OldUnit = unitToReplace;
        replaceParams.NewUnitConfig = this.getTargetConfig();
        replaceParams.Cell = null;                  // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
        replaceParams.PreserveHealthLevel = true;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
        replaceParams.PreserveExperience = true;    // Нужно ли передать опыт?
        replaceParams.PreserveOrders = true;        // Нужно ли передать приказы?
        replaceParams.PreserveKillsCounter = true;  // Нужно ли передать счетчик убийств?
        replaceParams.Silent = true;                // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)

        // Замена
        this.log.info('Заменяем выбранного юнита на:', replaceParams.NewUnitConfig);
        let newUnit = unitToReplace.Owner.Units.ReplaceUnit(replaceParams);
        if (!newUnit) {
            this.log.info("Не удалось заменить юнита");
            return;
        }

        // Создание графического эффекта
        spawnDecoration(ActiveScena.GetRealScena(), HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), newUnit.Position);
        this.log.info("Выбранный юнит заменен на:", newUnit);
    }

    private getUnitToReplace() {
        // - Варианты:
        return getOrCreateTestUnit(this);
        //return ActiveScena.GetRealScena().Settlements.GetByUid("0").Units.GetCastleOrAnyUnit();
        //return Players[0].GetRealPlayer().SelectedSquadVirtual.GetFirstUnit();
    }

    private getTargetConfig() {
        // - Варианты:
        return HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Heavymen");
        //return HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Castle");
        //return HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Farm");
        //return HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Mill");
    }
}
