import HordeExampleBase from "./base-example";
import { createPoint } from "library/common/primitives";
import { getOrCreateTestUnit } from "./unit-example-utils";


/**
 * Пример проверки пути для юнита.
 */
export class Example_UnitCheckPath extends HordeExampleBase {

    public constructor() {
        super("Unit check path");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        let unit = getOrCreateTestUnit(this);
        if (unit == null) {
            this.log.info('Не удалось создать юнита для этого примера!');
            return;
        }
        this.log.info('Для этого примера выбран:', unit);

        // Проверим, может ли юнит дойти до клетки?
        let cell = createPoint(65, 125);
        let allowPushAway = false;  // Этот параметр отвечает за проверку пути с учетом "расталкивания". Для большинства случаев здесь следует ставить false.
        let pathCheckResult = unit.MapMind.CheckPathTo(cell, allowPushAway);
        this.log.info('Запущен поиск пути к', cell);

        // Здесь имеется три ключевых результата
        this.log.info('Результат поиска:');
        if (pathCheckResult.Found) {
            this.log.info('- "Found" - Путь к', cell, 'найден! Юнит может пройти к этой клетке');
        } else if (pathCheckResult.Interrupted) {
            this.log.info('- "Interrupted" - Поиск пути к', cell, 'прерван, т.к. достигнут лимит длины поиска!');
        } else if (pathCheckResult.PathNotExists) {
            this.log.info('- "PathNotExists" - Путь к', cell, 'НЕ существует!');
        }

        // Комбинации ключевых результатов:
        this.log.info('Дополнительные проверки:');
        if (pathCheckResult.FoundOrInterrupted) {
            this.log.info('- "FoundOrInterrupted" - Путь к', cell, 'либо найден, либо поиск прерван из-за дальности пути к целевой клетке.');
            // Такая проверка имеет смысл, когда юниту лучше начать двигаться в сторону цели, даже если пока что не удалось проверить наличие пути.]
        }
        if (pathCheckResult.NotFound) {
            this.log.info('- "NotFound" - Путь к', cell, 'НЕ найден! Возможно поиск был прерван из-за дальности пути к целевой клетке.');
            // Тут либо пути действительно нет, либо достигнут лимит поиска
            // По сути это отрицание "Found"-результата.
            // Такая проверка актуальна тогда, когда требуется достоверно знать, что путь точно существует.
        }
    }
}
