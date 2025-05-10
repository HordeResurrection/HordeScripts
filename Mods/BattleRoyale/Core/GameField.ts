import { log } from "library/common/logging";
import { broadcastMessage } from "library/common/messages";
import { createHordeColor, createPoint } from "library/common/primitives";
import { Stride_Color, TileType } from "library/game-logic/horde-types";
import { Cell } from "./Cell";
import { GeometryCircle } from "./GeometryCircle";
import { GeometryShrinkingCircle } from "./GeometryShrinkingCircle";

export class GameField {
    constrictionTimeoutTicks:number;
    constrictionsSpeedCoeff:number;

    private _constrictionNextTick:number;
    private _geometryShrinkingCircle:GeometryShrinkingCircle;

    private _bigIslandCells: Array<Cell>;

    constructor(constrictionTimeoutTicks:number, constrictionsSpeedCoeff:number){
        this.constrictionTimeoutTicks   =   constrictionTimeoutTicks;
        this.constrictionsSpeedCoeff    =   constrictionsSpeedCoeff;
        this._constrictionNextTick      =   -1;

        this._FindSpawnField();
    }

    private _FindSpawnField() {
        var scenaSettlements = ActiveScena.GetRealScena().Settlements;
        let scenaWidth       = ActiveScena.GetRealScena().Size.Width;
        let scenaHeight      = ActiveScena.GetRealScena().Size.Height;
        let landscapeMap     = ActiveScena.GetRealScena().LandscapeMap;

        var cellsIslandNum = new Array<Array<number>>(scenaWidth);
        for (var x = 0; x < scenaWidth; x++) {
            cellsIslandNum[x] = new Array<number>(scenaHeight);
            for (var y = 0; y < scenaHeight; y++) {
                cellsIslandNum[x][y] = -1;
            }
        }

        this._bigIslandCells = new Array<Cell>();

        // из каждого замка посылаем волну
        ForEach(scenaSettlements, (settlement) => {
            var unit = settlement.Units.GetCastleOrAnyUnit();
            if (!unit) {
                log.info("Settlement Uid ", settlement.Uid, " нет юнита");
                return;
            }
            var unitCell = new Cell(unit.Cell.X, unit.Cell.Y);
            if (cellsIslandNum[unitCell.X][unitCell.Y] != -1) {
                log.info("Settlement Uid ", settlement.Uid, " Юнит в позиции ", unitCell.X, " ", unitCell.Y, " уже занята Uid ", cellsIslandNum[unitCell.X][unitCell.Y]);
                return;
            }
            log.info("Settlement Uid ", settlement.Uid, " Юнит в позиции ", unitCell.X, " ", unitCell.Y, " клетка свободна, пускаем волну");

            var islandNum   = settlement.Uid;
            var islandCells = new Array<Cell>();
            islandCells.push(unitCell);
            cellsIslandNum[unitCell.X][unitCell.Y] = islandNum;
            for (var cellNum = 0; cellNum < islandCells.length; cellNum++) {
                var cell = islandCells[cellNum];

                // пускаем волну в соседние ячейки
                for (var x = Math.max(cell.X - 1, 0); x <= Math.min(cell.X + 1, scenaWidth - 1); x++) {
                    for (var y = Math.max(cell.Y - 1, 0); y <= Math.min(cell.Y + 1, scenaHeight -1); y++) {
                        if (cellsIslandNum[x][y] == -1) {
                            let tile     = landscapeMap.Item.get(createPoint(x, y));
                            let tileType = tile.Cfg.Type;

                            var isWalkableCell = !(tileType == TileType.Water || tileType == TileType.Mounts);
                            if (!isWalkableCell) {
                                cellsIslandNum[x][y] = -2;
                                continue;
                            }

                            cellsIslandNum[x][y] = islandNum;
                            islandCells.push(new Cell(x, y));
                        }
                    }
                }
            }
            log.info("Settlement Uid ", settlement.Uid, " количество ячеек ", islandCells.length);

            // находим максимальный остров
            if (this._bigIslandCells.length < islandCells.length) {
                this._bigIslandCells = islandCells;
                log.info("это больше текущего количества, обновляем");
            }
        });

        log.info("Найдем максимальный остров из ", this._bigIslandCells.length,
            " ячеек относительно поселения ", cellsIslandNum[this._bigIslandCells[0].X][this._bigIslandCells[0].Y]);
    }

    public *GeneratorRandomCell() : Generator<{ X: number, Y: number }> {
        // Рандомизатор
        let rnd = ActiveScena.GetRealScena().Context.Randomizer;

        let randomNumbers = [... this._bigIslandCells];
    
        while (randomNumbers.length > 0) {
            let num = rnd.RandomNumber(0, randomNumbers.length - 1);
            let randomNumber = randomNumbers[num];
            randomNumbers.splice(num, 1);

            if (randomNumbers.length == 0) {
                randomNumbers = [... this._bigIslandCells];
            }

            yield randomNumber;
        }
    
        return;
    }

    public Area() : number {
        return this._bigIslandCells.length;
    }

    public OnEveryTick(gameTickNum:number){
        // ловим    начало  анимации
        if  (this._constrictionNextTick < 0)  {
            this._constrictionNextTick = gameTickNum + this.constrictionTimeoutTicks;

            return;
        }

        // спавним новый круг
        if (this._constrictionNextTick <= gameTickNum) {
            var realScena   =   ActiveScena.GetRealScena();
            
            if (this._geometryShrinkingCircle) {
                var lastCircle = this._geometryShrinkingCircle;
                var newRadius = Math.round(Math.max(2, lastCircle.endCircle.radius / (32*2)));

                var lastCircleCentre = lastCircle.endCircle.center.Scale(1/32);

                var possibleCenters = new Array<Cell>();
                var xs = lastCircleCentre.X - newRadius;
                var xe = lastCircleCentre.X + newRadius;
                var ys = lastCircleCentre.Y - newRadius;
                var ye = lastCircleCentre.Y + newRadius;
                for (var x = xs; x < xe; x++) {
                    for (var y = ys; y < ye; y++) {
                        var cell = new Cell(x, y);
                        if (cell.Minus(lastCircleCentre).Length_L2() > newRadius) {
                            continue;
                        }
                        possibleCenters.push(cell);
                    }
                }

                // страховка, что позиций может не быть
                if (possibleCenters.length == 0) {
                    possibleCenters.push(lastCircleCentre);
                }

                var rnd = realScena.Context.Randomizer;
                var newCenter = possibleCenters[rnd.RandomNumber(0, possibleCenters.length - 1)];

                this._geometryShrinkingCircle   =   new GeometryShrinkingCircle(
                    new GeometryCircle(lastCircle.endCircle.radius, lastCircle.endCircle.center, new Stride_Color(255, 255, 255), 10),
                    new GeometryCircle(32*newRadius, newCenter.Scale(32), new Stride_Color(255, 0, 0), 10),
                    newRadius * this.constrictionsSpeedCoeff,
                    2,
                    this.constrictionTimeoutTicks
                );
            } else {
                let scenaWidth  = realScena.Size.Width;
                let scenaHeight = realScena.Size.Height;
                var newRadius = Math.round(Math.min(scenaWidth, scenaHeight)/3);

                var possibleCenters = new Array<Cell>();
                for (var x = newRadius; x < scenaWidth - newRadius; x++) {
                    for (var y = newRadius; y < scenaHeight - newRadius; y++) {
                        possibleCenters.push(new Cell(x, y));
                    }
                }

                var rnd = realScena.Context.Randomizer;
                var newCenter = possibleCenters[rnd.RandomNumber(0, possibleCenters.length - 1)];

                this._geometryShrinkingCircle   =   new GeometryShrinkingCircle(
                    new GeometryCircle(
                        32*0.5*Math.sqrt(scenaWidth*scenaWidth + scenaHeight*scenaHeight),
                        new Cell(scenaWidth, scenaHeight).Scale(32/2),
                        new Stride_Color(255, 255, 255),
                        10),
                    new GeometryCircle(32*newRadius, newCenter.Scale(32), new Stride_Color(255, 0, 0), 10),
                    newRadius * this.constrictionsSpeedCoeff,
                    2,
                    this.constrictionTimeoutTicks
                );
            }

            // выставляем время спавна нового круга
            this._constrictionNextTick = gameTickNum + this._geometryShrinkingCircle.animationTotalTime + this._geometryShrinkingCircle.end_tiksToLive;

            log.info("время спавна ", gameTickNum,
                " время следующего спавна ", this._constrictionNextTick,
                " Радиус ", this._geometryShrinkingCircle.endCircle.radius/32,
                " Центр ", this._geometryShrinkingCircle.endCircle.center.X/32," ; ",this._geometryShrinkingCircle.endCircle.center.Y/32
            );

            broadcastMessage("Область сражения сужается!", createHordeColor(255, 255, 55, 55));
        }
        
        //  отрисовка
        if  (this._geometryShrinkingCircle)  {
            this._geometryShrinkingCircle.OnEveryTick(gameTickNum);
        }
    }

    public  CurrentCircle():GeometryCircle | null {
        if(this._geometryShrinkingCircle    &&  this._geometryShrinkingCircle.currentCircle){
            return  this._geometryShrinkingCircle.currentCircle;
        }else{
            return  null;
        }
    }
};