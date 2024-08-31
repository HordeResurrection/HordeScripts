import { GlobalVars } from "../GlobalData";
import { ITeimurUnit } from "./ITeimurUnit";

export abstract class ILegendaryUnit extends ITeimurUnit {
    static Description : string = "";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig() {
        ITeimurUnit.InitConfig.call(this);

        if (this.Description != "") {
            GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", this.Description);
        }
    }

    public OnDead(gameTickNum: number): void {
        super.OnDead(gameTickNum);
    }
}
