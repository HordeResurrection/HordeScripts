import { IComponent, COMPONENT_TYPE } from "./IComponent";

/**
 * событие разового дохода
 */ 
export class IncomeEvent extends IComponent {
    /** доход железа */
    metal: number;
    /** доход золота */
    gold: number;
    /** доход дерева */
    lumber: number;
    /** доход населения */
    people: number;

    public constructor(metal:number, gold:number, lumber:number, people: number) {
        super(COMPONENT_TYPE.INCOME_EVENT);

        this.metal  = metal;
        this.gold   = gold;
        this.lumber = lumber;
        this.people = people;
    }

    public Clone(): IncomeEvent {
        return new IncomeEvent(this.metal, this.gold, this.lumber, this.people);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        ScriptUtils.SetValue(cfg, "Description", cfg.Description + (cfg.Description == "" ? "" : "\n") + "Разово дает " +
            (this.metal > 0  ? this.metal  + " железа" : "") +
            (this.gold > 0   ? this.gold   + " золота" : "") +
            (this.lumber > 0 ? this.lumber + " дерева" : "") +
            (this.people > 0 ? this.people + " людей"  : "") + "\n");
    }
}