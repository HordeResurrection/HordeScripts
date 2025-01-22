import { createPoint } from "library/common/primitives";
import { PathFinder } from "library/game-logic/path-find";
import HordeExampleBase from "./base-example";

/**
 * Пример поиска пути.
 */
export class Example_PathFind extends HordeExampleBase {

    /**
     * Конструктор.
     */
    public constructor() {
        super("Path finding");
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        this.logMessageOnRun();

        let pathChecker = new PathFinder(ActiveScena);

        // Точки пути
        let startCell = createPoint(39, 31);
        let finishCell = createPoint(42, 26);

        // Проверяем наличие пути из точки в точку для всадника (оптимизированный алгоритм)
        let raiderCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Raider");
        let result = pathChecker.checkPath(raiderCfg, startCell, finishCell);
        if (result) {
            this.log.info(`Юнит "${raiderCfg.Name}" может пройти из ${startCell} в ${finishCell}`);
        } else {
            this.log.info(`Юнит "${raiderCfg.Name}" НЕ может пройти из ${startCell} в ${finishCell}`);
        }

        // Выполняем поиск пути из точки в точку для лучника
        let archerCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer");
        let path = pathChecker.findPath(archerCfg, startCell, finishCell);
        if (path) {
            this.log.info(`Юнит "${archerCfg.Name}" может пройти из ${startCell} в ${finishCell}. Путь:`);
            ForEach(path, node => {
                this.log.info('-', node);
            });
        } else {
            this.log.info(`Юнит "${archerCfg.Name}" НЕ может пройти из ${startCell} в ${finishCell}`);
        }

        // Важно выполнить освобождение данных после завершения использования объекта (иначе потечет память)
        // Так же целесообразно создать лишь один такой поисковик на плагин/мод и использовать его на протяжении всего сражения.
        pathChecker.Dispose();
    }
}
