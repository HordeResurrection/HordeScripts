export class Cell {
    X: number;
    Y: number;

    constructor(x?: number, y?: number) {
        this.X = x ?? 0;
        this.Y = y ?? 0;
    }
}

export class Rectangle {
    X: number;
    Y: number;
    W: number;
    H: number;

    constructor (x: number, y:number, w: number, h: number) {
        this.X = x;
        this.Y = y;
        this.W = w;
        this.H = h;
    }
}
