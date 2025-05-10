import { IComponent, COMPONENT_TYPE } from "./IComponent";

/** событие разового увеличение пассивного дохода поселения */
export class IncomeIncreaseEvent extends IComponent {
    /** увеличение дохода железа */
    metal: number;
    /** увеличение дохода золота */
    gold: number;
    /** увеличение дохода дерева */
    lumber: number;

    public constructor(metal:number, gold:number, lumber:number) {
        super(COMPONENT_TYPE.INCOME_INCREASE_EVENT);

        this.metal = metal;
        this.gold = gold;
        this.lumber = lumber;
    }

    public Clone(): IncomeIncreaseEvent {
        return new IncomeIncreaseEvent(this.metal, this.gold, this.lumber);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        ScriptUtils.SetValue(cfg, "Description", cfg.Description + (cfg.Description == "" ? "" : "\n") + "Увеличивает доход на " +
            (this.metal > 0  ? this.metal  + " железа" : "") +
            (this.gold > 0   ? this.gold   + " золота" : "") +
            (this.lumber > 0 ? this.lumber + " дерева" : "") + "\n");
    }
}