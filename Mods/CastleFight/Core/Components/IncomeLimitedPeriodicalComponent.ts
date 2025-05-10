import { IComponent, COMPONENT_TYPE } from "./IComponent";

/** компонент ограниченного дохода */
export class IncomeLimitedPeriodicalComponent extends IComponent {
    /** всего железа */
    totalMetal: number;
    /** всего золота */
    totalGold: number;
    /** всего дерева */
    totalLumber: number;

    /** железа в период */
    metal: number;
    /** золота в период */
    gold: number;
    /** дерева в период */
    lumber: number;

    /** период прихода инкома */
    periodTacts: number;
    /** такт получения следующего инкома */
    tact: number;

    public constructor(totalMetal: number, totalGold: number, totalLumber: number, metal: number, gold: number,
                       lumber: number, periodTacts: number, tact: number) {
        super(COMPONENT_TYPE.INCOME_LIMITED_PERIODICAL_COMPONENT);

        this.totalMetal  = totalMetal;
        this.totalGold   = totalGold;
        this.totalLumber = totalLumber;
        this.metal       = metal;
        this.gold        = gold;
        this.lumber      = lumber;
        this.periodTacts = periodTacts;
        this.tact        = tact;
    }

    public Clone() : IncomeLimitedPeriodicalComponent {
        return new IncomeLimitedPeriodicalComponent(this.totalMetal,
            this.totalGold,
            this.totalLumber,
            this.metal,
            this.gold,
            this.lumber,
            this.periodTacts,
            this.tact);
    }
};