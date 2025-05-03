import { log } from "library/common/logging";
import { IUnit } from "../Units/IUnit";
import { Formation2 } from "./Formation2";
import { GameSettlement } from "./GameSettlement";
import { IHero } from "../Units/IHero";

export class PlayerSettlement extends GameSettlement {
    public isDefeat:      boolean;
    public formation:     Formation2;
    public heroUnit:      IHero;
    public settlementUid: number;

    public constructor(hordeSettlement: HordeClassLibrary.World.Settlements.Settlement, hordeUnit: IHero) {
        super(hordeSettlement);

        this.isDefeat      = false;
        this.heroUnit      = hordeUnit;
        this.formation     = new Formation2(this.heroUnit, this.heroUnit.formationStartRadius, this.heroUnit.formationDestiny);
        this.heroUnit.formation = this.formation;
        this.settlementUid = Number.parseInt(hordeSettlement.Uid);
    }

    public OnEveryTick(gameTickNum:number) {
        this.formation.OnEveryTick(gameTickNum);
        this.heroUnit.OnEveryTick(gameTickNum);
    }
}
