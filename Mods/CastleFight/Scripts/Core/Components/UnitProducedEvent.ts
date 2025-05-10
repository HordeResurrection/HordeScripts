import { IComponent, COMPONENT_TYPE } from "./IComponent";

export class UnitProducedEvent extends IComponent {
    /** ссылка на юнита-строителя */
    producerUnit: any;
    /** ссылка на построенного юнита */
    producedUnit: any;

    public constructor(producerUnit: any, producedUnit: any) {
        super(COMPONENT_TYPE.UNIT_PRODUCED_EVENT);

        this.producerUnit = producerUnit;
        this.producedUnit = producedUnit;
    }

    public Clone() : UnitProducedEvent {
        return new UnitProducedEvent(this.producerUnit, this.producedUnit);
    }
};