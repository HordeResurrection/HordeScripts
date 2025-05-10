import { IComponent, COMPONENT_TYPE } from "./IComponent";

export class SettlementComponent extends IComponent {        
    /** пассивный доход железа */
    incomeMetal: number;
    /** пассивный доход золота */
    incomeGold: number;
    /** пассивный доход дерева */
    incomeLumber: number;
    /** сколько ждать тактов для начисления пассивного дохода */
    incomeWaitTacts: number;
    /** такт пассивного дохода */
    incomeTact: number;

    public constructor(
        incomeMetal:number,
        incomeGold:number,
        incomeLumber:number,
        incomeWaitTacts: number,
        incomeTact:number) {
        super(COMPONENT_TYPE.SETTLEMENT_COMPONENT);

        this.incomeMetal  = incomeMetal;
        this.incomeGold   = incomeGold;
        this.incomeLumber = incomeLumber;
        this.incomeWaitTacts = incomeWaitTacts;
        this.incomeTact   = incomeTact;
    }

    public Clone() : SettlementComponent {
        throw "Cant Clone SettlementComponent";
    }
};