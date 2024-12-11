import { Point2D, createPoint } from "library/common/primitives";
import { HashSetT } from "library/dotnet/dotnet-types";

const AStarPathFinder = HCL.HordeClassLibrary.PathFinders.AStar.AStarPathFinder;
const CpfMain = HCL.HordeClassLibrary.PathFinders.ContourPathFinder.CpfMain;
const PathFinderContext = HCL.HordeClassLibrary.PathFinders.PathFinderContext;

const SpeedAtCellByKnownMapDelegate = HCL.HordeClassLibrary.PathFinders.SpeedAtCellByKnownMapDelegate;
const SpeedAtCellByRealMapDelegate = HCL.HordeClassLibrary.PathFinders.SpeedAtCellByRealMapDelegate;

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
export const PathFinderStatus = HCL.HordeClassLibrary.PathFinders.PathFinderStatus;


/**
 * Выполняет проверку наличия и поиск пути.
 */
export class PathFinder {
    scena: any;
    uCfg: any;
    
    cpf: any;
    aStar: any;
    aStarPathMap: any;

    finishSet: any;

    /**
     * Конструктор
     */
    public constructor(scena: any) {
        this.scena = scena;

        // Инициализация колбеков
        let speedAtCellKnownMap = new SpeedAtCellByKnownMapDelegate((cell, _) => this.speedAtCell.call(this, cell));
        let speedAtCellRealMap = new SpeedAtCellByRealMapDelegate((cell, _) => this.speedAtCell.call(this, cell));
        let context = new PathFinderContext(speedAtCellKnownMap, speedAtCellRealMap);

        // Вспомогательные объекты
        let tmpPoint = createPoint(0, 0);
        this.finishSet = new HashSetT(Point2D);
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
        this.scena.PathMap.StorePathfinderMap(this.aStarPathMap);
        this.aStar.ReturnToPool();
        
        this.scena = null;
        this.cpf = null;
        this.aStar = null;
    }

    /**
     * Выполняет поиск пути из точки в точку.
     * Возвращает коллекцию точек, если путь найден.
     */
    public findPath(uCfg, start, finish) {
        this.finishSet.Clear();
        this.finishSet.Add(finish);
        this.uCfg = uCfg;

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
    public checkPath(uCfg, start, finish) {
        this.finishSet.Clear();
        this.finishSet.Add(finish);
        this.uCfg = uCfg;

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
    private speedAtCell(cell) {

        if (this.uCfg.CanBePlacedByRealMap(this.scena, cell.X, cell.Y, false, true)){
            return 1;
        }

        return 0;
    }
}
