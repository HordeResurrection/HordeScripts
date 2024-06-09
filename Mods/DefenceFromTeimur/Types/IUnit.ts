import { CreateConfig } from "../Utils";
import { Cell } from "./Geometry";
import { PointCommandArgs, ProduceAtCommandArgs } from "library/game-logic/horde-types";
import { createPoint } from "library/common/primitives";
import { GlobalVars } from "../GlobalData";

export class IUnit {
    unit: any;
    unit_ordersMind: any;
    teamNum: number;
    processingTick: number;

    static CfgUid      : string = "";
    static BaseCfgUid  : string = "";

    constructor (unit: any, teamNum: number) {
        this.unit            = unit;
        this.teamNum         = teamNum;
        this.unit_ordersMind = this.unit.OrdersMind;
        this.processingTick  = this.unit.PseudoTickCounter % 50;
    }

    public static InitConfig() {
        GlobalVars.configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);
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
