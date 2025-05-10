import { IComponent, COMPONENT_TYPE } from "./IComponent";

/** компонент увеличивающий в процентах пассивный доход поселения */
export class IncomeIncreaseComponent extends IComponent {
    public constructor() {
        super(COMPONENT_TYPE.INCOME_INCREASE_COMPONENT);
    }

    public Clone(): IncomeIncreaseComponent {
        return new IncomeIncreaseComponent();
    }
}