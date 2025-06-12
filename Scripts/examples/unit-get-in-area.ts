import { createPoint, createRect } from "library/common/primitives";
import { BooleanT } from "library/dotnet/dotnet-types";
import { iterateOverUnitsInBox } from "library/game-logic/unit-and-map";
import HordeExampleBase from "./base-example";
import { Unit } from "library/game-logic/horde-types";

const X_0 = 0;
const Y_0 = 0;
const X_1 = 20;
const Y_1 = 20;

/**
 * Выбрать всех юнитов в области (вариант 1 - перебор)
 * 
 * Внимание! Прямой перебор больших областей будет подтормаживать.
 */
export class Example_GetUnitsInArea_Bruteforce extends HordeExampleBase {

    public constructor() {
        super("Get units in area (bruteforce)");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        let unitsMap = ActiveScena.GetRealScena().UnitsMap;
        let count = 0;

        this.log.info('Юниты:');
        for (let i = X_0; i < X_1; i++) {
            for (let j = Y_0; j < Y_1; j++) {
                let unit = unitsMap.GetUpperUnit(i, j);
                if (!unit)
                    continue;
                this.log.info('-', unit);
                count++;
            }
        }
        this.log.info('Всего:', count);
    }
}


/**
 * Выбрать всех юнитов в области (вариант 2 - через отряд)
 * 
 * Внимание! Здесь используется такая же логика как и при выделению юнитов рамкой, т.е., например, нельзя выбрать несколько зданий.
 */
export class Example_GetUnitsInArea_Squad extends HordeExampleBase {

    public constructor() {
        super("Get units in area (squad)");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        // Создаём колбек для фильтрации юнитов
        let filterCallback = host.func(BooleanT, 1, function (unit: Unit) {
            // Для примера пропускаем все здания в области
            return !unit.Cfg.IsBuilding;
        });

        let unitsMap = ActiveScena.GetRealScena().UnitsMap;
        let rect = createRect(X_0, Y_0, X_1, Y_1);
        let squad = unitsMap.GetSquadFromRect(rect, filterCallback);

        this.log.info('Собрано юнитов:', squad.Count);
        ForEach(squad, (u: Unit) => {
            this.log.info('-', u);
        });
    }
}


/**
 * Выбрать всех юнитов в области (вариант 3 - оптимизация через k-мерное дерево)
 * Это наиболее оптимальный вариант для выделения юнитов, но нужно самостоятельно учитывать повторы для движущихся юнитов и зданий.
 */
export class Example_GetUnitsInArea_KdTree extends HordeExampleBase {

    public constructor() {
        super("Get units in area (Kd tree)");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        // Создание древа юнитов (актуально только на первом такте, т.к. древо ещё не создана)
        if (DataStorage.gameTickNum == 0)
            ActiveScena.UnitsMap.UnitsTree.Recreate();

        let center = createPoint((X_1 - X_0) / 2, (Y_1 - Y_0) / 2);
        let radius = (X_1 - X_0) / 2;
        let unitsIter = iterateOverUnitsInBox(center, radius);
        let count = 0;

        this.log.info('Юниты:');
        for (let u = unitsIter.next(); !u.done; u = unitsIter.next()) {
            this.log.info('-', u.value);
            count++;
        }
        this.log.info('Всего:', count);
    }
}
