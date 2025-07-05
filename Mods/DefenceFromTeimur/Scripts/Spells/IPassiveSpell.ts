import { ACommandArgs } from "library/game-logic/horde-types";
import { ISpell, SpellState } from "./ISpell";
import { IUnitCaster } from "./IUnitCaster";

export class IPassiveSpell extends ISpell {
    protected static _IsPassive : boolean = true;

    constructor(caster: IUnitCaster) {
        super(caster);

        this._state = SpellState.ACTIVATED;
    }

    public Activate(activateArgs: ACommandArgs): boolean {
        // пассивки нельзя активировать
        return false;
    }
}
