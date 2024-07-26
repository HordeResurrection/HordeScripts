import { CreateUnitConfig } from "../Utils";
import { Cell } from "./Geometry";
import { PointCommandArgs, ProduceAtCommandArgs } from "library/game-logic/horde-types";
import { createPoint } from "library/common/primitives";
import { GlobalVars } from "../GlobalData";

export class IUnit {
    /** ссылка на юнита */
    unit: any;
    /** ссылка на отдел приказов юнита */
    unit_ordersMind: any;
    /** номер команды к которому принадлежит юнит */
    teamNum: number;
    /** тик на котором нужно обрабатывать юнита */
    processingTick: number;
    /** модуль на который делится игровой тик, если остаток деления равен processingTick, то юнит обрабатывается */
    processingTickModule: number;

    /** флаг, что юнита нужно удалить из списка юнитов, чтобы отключить обработку */
    needDeleted: boolean;

    static CfgUid      : string = "";
    static BaseCfgUid  : string = "";

    constructor (unit: any, teamNum: number) {
        this.unit                   = unit;
        this.teamNum                = teamNum;
        this.unit_ordersMind        = this.unit.OrdersMind;
        this.processingTickModule   = 50;
        this.processingTick         = this.unit.PseudoTickCounter % this.processingTickModule;
        this.needDeleted            = true;
    }

    public static InitConfig() {
        if (this.BaseCfgUid != "" && this.CfgUid != "") {
            GlobalVars.configs[this.CfgUid] = CreateUnitConfig(this.BaseCfgUid, this.CfgUid);
        }
    }

    public OnEveryTick(gameTickNum: number) {}
    public OnDead(gameTickNum: number) {}
    /** отдать приказ в точку */
    public GivePointCommand(cell: Cell, command: any, orderMode: any) {
        var pointCommandArgs = new PointCommandArgs(createPoint(cell.X, cell.Y), command, orderMode);
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
}

var rnd = ActiveScena.GetRealScena().Context.Randomizer;
export function RandomUnit<T>(UnitsClass: Array<T>) : T {
    return UnitsClass[rnd.RandomNumber(0, UnitsClass.length - 1)];
}
