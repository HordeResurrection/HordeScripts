import { Point2D, createPoint } from "library/common/primitives";
import { HashSetT } from "library/dotnet/dotnet-types";
import { Scena, UnitConfig } from "./horde-types";

const AStarPathFinder = HordeClassLibrary.PathFinders.AStar.AStarPathFinder;
type AStarPathFinder = HordeClassLibrary.PathFinders.AStar.AStarPathFinder;
const CpfMain = HordeClassLibrary.PathFinders.ContourPathFinder.CpfMain;
type CpfMain = HordeClassLibrary.PathFinders.ContourPathFinder.CpfMain;
const PathFinderContext = HordeClassLibrary.PathFinders.PathFinderContext;
type PathFinderContext = HordeClassLibrary.PathFinders.PathFinderContext;

const SpeedAtCellByKnownMapDelegate = HordeClassLibrary.PathFinders.SpeedAtCellByKnownMapDelegate;
type SpeedAtCellByKnownMapDelegate = HordeClassLibrary.PathFinders.SpeedAtCellByKnownMapDelegate;
const SpeedAtCellByRealMapDelegate = HordeClassLibrary.PathFinders.SpeedAtCellByRealMapDelegate;
type SpeedAtCellByRealMapDelegate = HordeClassLibrary.PathFinders.SpeedAtCellByRealMapDelegate;

/**
 * Результат работы поисковика пути.
 * 
 * Допустимые значения:
    - Search           - Поиск выполняется в данный момент.
    - Found            - Поиск завершен и путь найден.
    - FoundNearerPoint - Поиск завершен, но путь не найден. Была определена ближайшая клеточка
    - NotExist         - Поиск завершен, путь не найден. Юнит уже стоит на ближайшей точке
    - AttemptsEnded    - Поиск прерван: закончились попытки.
    - SearchError      - Ошибка при поиске пути.
*/
export const PathFinderStatus = HordeClassLibrary.PathFinders.PathFinderStatus;
export type PathFinderStatus = HordeClassLibrary.PathFinders.PathFinderStatus;


/**
 * Выполняет проверку наличия и поиск пути.
 */
export class PathFinder {
    scena: Scena | undefined;
    uCfg: UnitConfig | undefined;

    cpf: CpfMain | undefined;
    aStar: AStarPathFinder | undefined;
    aStarPathMap: any;

    finishSet: any;

    /**
     * Конструктор
     */
    public constructor(scena: Scena) {
        this.scena = scena;

        // Инициализация колбеков
        let speedAtCellKnownMap = new SpeedAtCellByKnownMapDelegate((cell: Point2D, _) => this.speedAtCell.call(this, cell));
        let speedAtCellRealMap = new SpeedAtCellByRealMapDelegate((cell: Point2D, _) => this.speedAtCell.call(this, cell));
        let context = new PathFinderContext(speedAtCellKnownMap, speedAtCellRealMap);

        // Вспомогательные объекты
        let tmpPoint = createPoint(0, 0);
        this.finishSet = new HashSetT<Point2D>(Point2D);
        this.finishSet.Add(tmpPoint);

        // Инициализация объекта для проверки наличия пути
        this.cpf = new CpfMain(context, tmpPoint, this.finishSet);

        // Инициализация объекта для поиска пути
        this.aStarPathMap = this.scena.PathMap.GetFreePathfinderMap();
        this.aStar = AStarPathFinder.Pool.Get(context, this.scena.Size, tmpPoint, this.finishSet, this.aStarPathMap).Object;
    }

    /**
     * Освобождение данных после завершения использования объекта.
     */
    public Dispose() {
        this.scena?.PathMap.StorePathfinderMap(this.aStarPathMap);
        this.aStar?.ReturnToPool();

        this.scena = undefined;
        this.cpf = undefined;
        this.aStar = undefined;
    }

    /**
     * Выполняет поиск пути из точки в точку.
     * Возвращает коллекцию точек, если путь найден.
     */
    public findPath(uCfg: UnitConfig, start: Point2D, finish: Point2D) {
        this.finishSet.Clear();
        this.finishSet.Add(finish);
        this.uCfg = uCfg;

        if (!this.aStar)
            throw new Error("Can't use disposed pathfinder object.");

        this.aStar.Reinitialize(start, this.finishSet);
        this.aStar.FindPath();

        let solution = this.aStar.Solution;
        if (!solution) {
            return null;
        }
        return solution.Path;
    }

    /**
     * Проверяет наличие пути из точки в точку (оптимизированный алгоритм).
     * Возвращает true, если путь найден.
     * Возвращает false, в случаях если путь не существует, или если истекло время поиска.
     */
    public checkPath(uCfg: UnitConfig, start: Point2D, finish: Point2D) {
        this.finishSet.Clear();
        this.finishSet.Add(finish);
        this.uCfg = uCfg;

        if (!this.cpf)
            throw new Error("Can't use disposed pathfinder object.");

        this.cpf.Reinitialize(start, this.finishSet);
        this.cpf.FindPath();

        return this.cpf.Status == PathFinderStatus.Found;
    }

    /**
     * Проверяет скокрость в указанной клетке для указанного конфига юнита.
     * Примечание:
В данный момент здесь выполняется CanBePlaced-проверка, которая НЕ определяет непосредственно значение скорости в клетке.
Это может отразиться на итоговом пути.
     */
    private speedAtCell(cell: Point2D) {

        if (!this.uCfg) {
            return 0;
        }

        if (this.uCfg.CanBePlacedByRealMap(this.scena!, cell.X, cell.Y, false, true)) {
            return 1;
        }

        return 0;
    }
}
