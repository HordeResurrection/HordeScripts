import { CreateUnitConfig } from "../Utils";
import { Cell } from "./Geometry";
import { PointCommandArgs, ProduceAtCommandArgs, Unit, UnitDirection } from "library/game-logic/horde-types";
import { createPoint } from "library/common/primitives";
import { GlobalVars } from "../GlobalData";
import { log } from "library/common/logging";

export class IUnit {
    /** ссылка на юнита */
    unit: Unit;
    /** ссылка на отдел приказов юнита */
    unit_ordersMind: HordeClassLibrary.UnitComponents.Minds.OrdersMind;
    /** номер команды к которому принадлежит юнит */
    teamNum: number;
    /** тик на котором нужно обрабатывать юнита */
    protected processingTick: number;
    /** модуль на который делится игровой тик, если остаток деления равен processingTick, то юнит обрабатывается */
    protected processingTickModule: number;

    /** флаг, что юнита нужно удалить из списка юнитов, чтобы отключить обработку */
    needDeleted: boolean;

    static CfgUid      : string = "";
    static BaseCfgUid  : string = "";

    constructor (unit: Unit, teamNum: number) {
        this.unit                   = unit;
        this.teamNum                = teamNum;
        this.unit_ordersMind        = this.unit.OrdersMind;
        this.processingTickModule   = 50;
        this.processingTick         = this.unit.PseudoTickCounter % this.processingTickModule;
        this.needDeleted            = false;
    }

    public static InitConfig() {
        if (this.BaseCfgUid != "" && this.CfgUid != "") {
            GlobalVars.configs[this.CfgUid] = CreateUnitConfig(this.BaseCfgUid, this.CfgUid);
        }
    }

    public OnEveryTick(gameTickNum: number) : boolean {
        if (!this._NeedUpdate(gameTickNum)) return false;

        return true;
    }
    public OnDead(gameTickNum: number) {

    }
    /** отдать приказ в точку */
    public GivePointCommand(cell: Cell, command: any, orderMode: any) {
        if (!cell || !isFinite(cell.X) || !isFinite(cell.Y)) {
            return;
        }
        
        if (cell.X < 0) {
            cell.X = 0;
        } else if (cell.X > GlobalVars.scenaWidth) {
            cell.X = GlobalVars.scenaWidth;
        }
        if (cell.Y < 0) {
            cell.Y = 0;
        } else if (cell.Y > GlobalVars.scenaHeight) {
            cell.Y = GlobalVars.scenaHeight;
        }

        var pointCommandArgs = new PointCommandArgs(createPoint(Math.round(cell.X), Math.round(cell.Y)), command, orderMode);
        this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs);
    }
    /** отдать приказ о постройке в точке */
    public GivePointProduceCommand(cfg: any, cell: Cell, orderMode: any) {
        var produceAtCommandArgs = new ProduceAtCommandArgs(
            orderMode,
            cfg,
            createPoint(cell.X, cell.Y));
        this.unit.Cfg.GetOrderDelegate(this.unit, produceAtCommandArgs);
    }
    protected _NeedUpdate(gameTickNum) : boolean {
        if (gameTickNum % this.processingTickModule == this.processingTick) {
            if (this.unit.IsDead) {
                this.needDeleted = true;
                this.OnDead(gameTickNum);
            }
            return true;
        } else {
            return false;
        }
    }
    public ReplaceUnit(unit: Unit): void {
        this.unit = unit;
    }
    public DirectionVector() : Cell {
        switch (this.unit.Direction) {
            case UnitDirection.Down:
                return new Cell(0, 1);
            case UnitDirection.LeftDown:
                return new Cell(-0.70710678118654752440084436210485, 0.70710678118654752440084436210485);
            case UnitDirection.Left:
                return new Cell(-1, 0);
            case UnitDirection.LeftUp:
                return new Cell(-0.70710678118654752440084436210485, -0.70710678118654752440084436210485);
            case UnitDirection.Up:
                return new Cell(0, -1);
            case UnitDirection.RightUp:
                return new Cell(0.70710678118654752440084436210485, -0.70710678118654752440084436210485);
            case UnitDirection.Right:
                return new Cell(1, 0);
            case UnitDirection.RightDown:
                return new Cell(0.70710678118654752440084436210485, 0.70710678118654752440084436210485);
            default:
                return new Cell(0, 0);
        }
    }
}

var rnd = ActiveScena.GetRealScena().Context.Randomizer;
export function RandomUnit<T>(UnitsClass: Array<T>) : T {
    return UnitsClass[rnd.RandomNumber(0, UnitsClass.length - 1)];
}
