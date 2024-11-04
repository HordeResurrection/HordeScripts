import { MaraPoint } from "../MaraPoint";
import { MaraCellIndex } from "./MaraCellIndex";

export class MaraRegion {
    public get Cells(): Array<MaraPoint> {
        return this.cells;
    }

    public get Center(): MaraPoint {
        return this.center;
    }

    private cells: Array<MaraPoint> = [];
    private cellsIndex: MaraCellIndex;
    private center: MaraPoint;

    constructor(cells: Array<MaraPoint>) {
        this.cellsIndex = new MaraCellIndex();

        this.addCells(cells);
    }

    public HasCell(cell: MaraPoint): boolean {
        return this.cellsIndex.Get(cell);
    }

    public AddCells(cells: Array<MaraPoint>) {
        this.addCells(cells);
    }

    private addCells(cells: Array<MaraPoint>): void {
        this.cells.push(...cells);
        this.cellsIndex.SetMany(cells);

        let avgX = 0;
        let avgY = 0;

        this.cells.forEach((cell) => {
            avgX += cell.X;
            avgY += cell.Y;
        });

        avgX /= this.cells.length;
        avgY /= this.cells.length;

        this.center = new MaraPoint(Math.round(avgX), Math.round(avgY));
    }
}

