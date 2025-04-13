export class Cell {
    X: number;
    Y: number;

    constructor(X: number, Y: number) {
        this.X = X;
        this.Y = Y;
    }

    Add(cell: Cell) : Cell {
        return new Cell(this.X + cell.X, this.Y + cell.Y);
    }
    Minus(cell: Cell) : Cell {
        return new Cell(this.X - cell.X, this.Y - cell.Y);
    }
    Scale(b: number) : Cell {
        return new Cell(this.X * b, this.Y * b);
    }
    Length_L2() : number {
        return Math.sqrt(this.X*this.X + this.Y*this.Y);
    }
    Length_L2_2() : number {
        return this.X*this.X + this.Y*this.Y;
    }
    Length_Chebyshev() : number {
        return Math.max(Math.abs(this.X), Math.abs(this.Y));
    }
    static IsEquals(a: Cell, b: Cell): boolean {
        return Math.abs(a.X - b.X) < 1e-6 && Math.abs(a.Y - b.Y) < 1e-6;
    }
    static ConvertHordePoint(cell: HordeResurrection.Basic.Primitives.Geometry.Point2D) {
        return new Cell(cell.X, cell.Y);
    }
}
