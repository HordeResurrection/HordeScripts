import { Cell } from "../Utils";
import { IComponent, COMPONENT_TYPE } from "./IComponent";

export class ReviveComponent extends IComponent {
    /** точка - места респа рабочего */
    cell: Cell;
    /** время возрождения */
    reviveTicks: number;
    /** время когда рабочего нужно реснуть */
    tick: number;
    /** флаг, что юнит ждет респа */
    waitingToRevive: boolean;
    
    public constructor(point: Cell, reviveTicks: number, tick: number) {
        super(COMPONENT_TYPE.REVIVE_COMPONENT);

        this.cell           = point;
        this.reviveTicks     = reviveTicks;
        this.tick            = tick;
        this.waitingToRevive = false;
    }

    public Clone() : ReviveComponent {
        return new ReviveComponent(this.cell, this.reviveTicks, this.tick);
    }
};