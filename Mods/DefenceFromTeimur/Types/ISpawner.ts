import { generateRandomCellInRect } from "library/common/position-tools";
import { Cell, Rectangle } from "./Geometry";
import { Wave, WaveUnit } from "./AttackPlan";
import { GlobalVars } from "../GlobalData";
import { broadcastMessage, createGameMessageWithSound } from "library/common/messages";
import { createHordeColor } from "library/common/primitives";
import { UnitDirection } from "library/game-logic/horde-types";
import { IUnit } from "./IUnit";
import { log } from "library/common/logging";
import { spawnUnits } from "../Utils";
import { ILegendaryUnit } from "./ILegendaryUnit";

export abstract class ISpawner {
    name: string;
    teamNum: number;
    queue: Array<WaveUnit>;

    constructor (name: string, teamNum: number) {
        this.name    = name;
        this.teamNum = teamNum;

        this.queue = new Array<WaveUnit>();
    }

    protected Generator() : any {
        return {
            next: function() {
              return { value: new Cell(), done: true };
            }
        };
    }

    public SpawnWave(wave: Wave) {
        broadcastMessage(wave.message, createHordeColor(255, 255, 50, 10));

        for (var i = 0; i < wave.waveUnits.length; i++) {
            if (wave.waveUnits[i].count == 0) {
                continue;
            }

            this.queue.push(new WaveUnit(wave.waveUnits[i].unitClass, wave.waveUnits[i].count));
        }
    }

    public SpawnUnit(waveUnit: WaveUnit) {
        if (waveUnit.count == 0) {
            return;
        }

        this.queue.push(new WaveUnit(waveUnit.unitClass, waveUnit.count));
    }

    public OnEveryTick (gameTickNum: number) {
        var generator = this.Generator();

        for (var i = 0; i < this.queue.length; i++) {
            var spawnedUnits = spawnUnits(GlobalVars.teimurSettlement,
                GlobalVars.configs[this.queue[i].unitClass.CfgUid],
                this.queue[i].count,
                UnitDirection.Down,
                generator);

            for (var spawnedUnit of spawnedUnits) {
                GlobalVars.units.push(new this.queue[i].unitClass(spawnedUnit, this.teamNum));
            }

            if (spawnedUnits.length > 0 && GlobalVars.units[GlobalVars.units.length - 1] instanceof ILegendaryUnit) {
                for (var settlementNum = 0; settlementNum < GlobalVars.teams[this.teamNum].settlementsIdx.length; settlementNum++) {
                    var settlement = GlobalVars.teams[this.teamNum].settlements[settlementNum];

                    let msg1 = createGameMessageWithSound("Замечен " + GlobalVars.configs[this.queue[i].unitClass.CfgUid].Name, createHordeColor(255, 255, 165, 10));
                    settlement.Messages.AddMessage(msg1);
                    let msg2 = createGameMessageWithSound((this.queue[i].unitClass as unknown as typeof ILegendaryUnit).Description, createHordeColor(255, 200, 130, 10));
                    settlement.Messages.AddMessage(msg2);
                }
            }

            if (spawnedUnits.length < this.queue[i].count) {
                this.queue[i].count -= spawnedUnits.length;
                return;
            } else {
                this.queue.splice(i--, 1);
            }
        }
    }
}

export class RectangleSpawner extends ISpawner {
    rect: Rectangle;

    constructor (rect: Rectangle, teamNum: number) {
        super("RectangleSpawner", teamNum);

        this.rect = rect;
    }

    protected Generator() : any {
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
        let scenaWidth  = GlobalVars.ActiveScena.GetRealScena().Size.Width;
        let scenaHeight = GlobalVars.ActiveScena.GetRealScena().Size.Height;
        var xs = Math.max(center.X - rMax, 0);
        var xe = Math.min(center.X + rMax, scenaWidth - 1);
        var ys = Math.max(center.Y - rMax, 0);
        var ye = Math.min(center.Y + rMax, scenaHeight - 1);
        for (var x = xs; x <= xe; x++) {
            for (var y = ys; y < ye; y++) {
                var r     = Math.sqrt((x - center.X)*(x - center.X) + (y - center.Y)*(y - center.Y));
                if (r < this.rMin || this.rMax < r) {
                    continue;
                }

                var angle = Math.atan2(y - center.Y, x - center.X);
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

    protected Generator() : any {
        let rnd = GlobalVars.ActiveScena.GetRealScena().Context.Randomizer;
        var set = new Array<number>(this.cells.length);
        for (var i = 0; i < this.cells.length; i++) {
            set[i] = i;
        }

        return {
            next: function() {
                if (set.length <= 0) {
                    return { value: new Cell(), done: false };
                }

                var i       = rnd.RandomNumber(0, set.length - 1); 
                var cellNum = set[i];
                set.splice(i, 1);
                return { value: this.cells[cellNum], done: true };
            }
        };
    }
}
