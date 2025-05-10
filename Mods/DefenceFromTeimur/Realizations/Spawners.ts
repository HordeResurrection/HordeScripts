import { GlobalVars } from "../GlobalData";
import { Rectangle, Cell } from "../Types/Geometry";
import { ISpawner } from "../Types/ISpawner";
import { generateRandomCellInRect } from "../Utils";

export class RectangleSpawner extends ISpawner {
    rect: Rectangle;

    constructor (rect: Rectangle, teamNum: number) {
        super("RectangleSpawner", teamNum);

        this.rect = rect;
    }

    public Generator() : any {
        return generateRandomCellInRect(this.rect.X, this.rect.Y, this.rect.W, this.rect.H);
    }
}

/** angle задается в диапазоне [0, 2PI] */
export class RingSpawner extends ISpawner {
    center: Cell;
    rMin: number;
    rMax: number;
    angleMin: number;
    angleMax: number;

    private cells: Array<Cell>;

    constructor (center: Cell, rMin: number, rMax: number, angleMin: number, angleMax: number, teamNum: number) {
        super("RingSpawner", teamNum);

        this.rMin = rMin;
        this.rMax = rMax;
        this.angleMin = angleMin;
        this.angleMax = angleMax;

        this.cells = new Array<Cell>();

        // создаем множество ячеек
        // пробегаем по квадрату и выбираем нужные ячейки
        let scenaWidth  = ActiveScena.GetRealScena().Size.Width;
        let scenaHeight = ActiveScena.GetRealScena().Size.Height;
        var xs = Math.max(center.X - rMax, 0);
        var xe = Math.min(center.X + rMax, scenaWidth - 1);
        var ys = Math.max(center.Y - rMax, 0);
        var ye = Math.min(center.Y + rMax, scenaHeight - 1);
        for (var x = xs; x <= xe; x++) {
            for (var y = ys; y <= ye; y++) {
                var r     = Math.sqrt((x - center.X)*(x - center.X) + (y - center.Y)*(y - center.Y));
                if (r < this.rMin || this.rMax < r) {
                    continue;
                }

                var angle = Math.atan2(center.Y - y, x - center.X);
                if (angle < 0) {
                    angle += 2*Math.PI;
                }
                if (angle < this.angleMin || this.angleMax < angle) {
                    continue;
                }

                this.cells.push(new Cell(x, y));
            }
        }
    }

    public Generator() : any {
        let rnd = ActiveScena.GetRealScena().Context.Randomizer;
        var set = new Array<number>(this.cells.length);
        for (var i = 0; i < this.cells.length; i++) {
            set[i] = i;
        }
        var _this = this;

        return {
            next: function() {
                if (set.length <= 0) {
                    return { value: new Cell(), done: true };
                }

                var i       = rnd.RandomNumber(0, set.length - 1); 
                var cellNum = set[i];
                set.splice(i, 1);
                return { value: _this.cells[cellNum], done: false };
            }
        };
    }
}

export class RandomSpawner extends ISpawner {
    spawners: Array<ISpawner>;

    constructor (spawners: Array<ISpawner>, teamNum: number) {
        super("RandomSpawner", teamNum);

        this.spawners = spawners;
    }

    public Generator() : any {
        var spawnerNum = GlobalVars.rnd.RandomNumber(0, this.spawners.length - 1);
        return this.spawners[spawnerNum].Generator();
    }
}
