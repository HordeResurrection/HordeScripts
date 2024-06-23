import { GlobalVars } from "../GlobalData";
import { CreateUnitConfig } from "../Utils";
import { Cell } from "./Geometry";
import { ITeimurUnit } from "./ITeimurUnit";

export abstract class ILegendaryUnit extends ITeimurUnit {
    static Description : string = "";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig() {
        ITeimurUnit.InitConfig.call(this);
    }
}
