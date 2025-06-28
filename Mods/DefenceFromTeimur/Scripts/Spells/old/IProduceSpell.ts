import { ACommandArgs, UnitCommand, UnitConfig } from "library/game-logic/horde-types";
import { ISpell } from "./ISpell";
import { IUnitCaster } from "./IUnitCaster";

export class IProduceSpell extends ISpell {
    /// \todo вернуть после исправления
    //protected static _ButtonCommandTypeBySlot       : Array<UnitCommand> = [UnitCommand.Produce_Custom_0, UnitCommand.Produce_Custom_1, UnitCommand.Produce_Custom_2, UnitCommand.Produce_Custom_3];
    protected static _ButtonCommandTypeBySlot       : Array<UnitCommand> = [UnitCommand.Produce, UnitCommand.Produce, UnitCommand.Produce, UnitCommand.Produce];
    protected static _ButtonCommandBaseUid          : string = "#UnitCommandConfig_Produce";
    protected _productCfg : UnitConfig;

    constructor(caster: IUnitCaster) {
        var casterCfg = caster.unit.Cfg;
        CfgAddUnitProducer(casterCfg);
        if (casterCfg.AllowedCommands.ContainsKey(UnitCommand.Repair)) {
            casterCfg.AllowedCommands.Remove(UnitCommand.Repair);
        }
        if (casterCfg.AllowedCommands.ContainsKey(UnitCommand.Produce)) {
            casterCfg.AllowedCommands.Remove(UnitCommand.Produce);
        }
        caster.unit.CommandsMind.RemoveAddedCommand(UnitCommand.Repair);
        caster.unit.CommandsMind.RemoveAddedCommand(UnitCommand.Produce);

        super(caster);
    }

    public Activate(activateArgs: ACommandArgs) : boolean {
        if (super.Activate(activateArgs)) {
            // @ts-expect-error
            this._productCfg = activateArgs.ProductCfg;

            return true;
        } else {
            return false;
        }
    }
}