
export class MaraPoint {
    public readonly X: number;
    public readonly Y: number;

    constructor(x: number, y: number) {
        this.X = Math.round(x);
        this.Y = Math.round(y);
    }

    public ToString(): string {
        return `${this.X};${this.Y}`;
    }

    public EqualsTo(other: MaraPoint): boolean {
        return this.X == other.X && this.Y == other.Y;
    }
}
