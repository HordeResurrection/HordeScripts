import { ISpell, SpellState } from "./ISpell";
import { IUnitCaster } from "./IUnitCaster";

export class IPassiveSpell extends ISpell {
    constructor(caster: IUnitCaster) {
        super(caster);

        this._state = SpellState.ACTIVATED;
    }
}
