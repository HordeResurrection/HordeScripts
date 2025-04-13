import { IUnit } from "../Units/IUnit";
import { Formation2 } from "./Formation2";
import { GameSettlement } from "./GameSettlement";

export class PlayerSettlement extends GameSettlement {
    public isDefeat:      boolean;
    public formation:     Formation2;
    public heroUnit:      IUnit;
    public settlementUid: number;

    public constructor(hordeSettlement: HordeClassLibrary.World.Settlements.Settlement, hordeUnit: IUnit) {
        super(hordeSettlement);

        this.isDefeat      = false;
        this.heroUnit      = hordeUnit;
        this.formation     = new Formation2(this.heroUnit, 3);
        this.settlementUid = Number.parseInt(hordeSettlement.Uid);
    }

    public OnEveryTick(gameTickNum:number) {
        this.formation.OnEveryTick(gameTickNum);

        if (gameTickNum % this.heroUnit.processingTickModule == this.heroUnit.processingTick) {
            this.heroUnit.OnEveryTick(gameTickNum);
        }
    }
}
