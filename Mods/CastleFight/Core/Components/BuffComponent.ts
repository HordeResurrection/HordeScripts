import { BUFF_TYPE } from "./BuffableComponent";
import { IComponent, COMPONENT_TYPE } from "./IComponent";

/** Компонент, что юнит может баффать BuffableComponent */
export class BuffComponent extends IComponent {
    /** тип баффа */
    buffType: BUFF_TYPE;

    public constructor(buffType: BUFF_TYPE) {
        super(COMPONENT_TYPE.BUFF_COMPONENT);

        this.buffType = buffType;
    }

    public Clone() : BuffComponent {
        return new BuffComponent(this.buffType);
    }
};