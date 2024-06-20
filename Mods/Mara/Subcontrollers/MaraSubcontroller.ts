import { MaraSettlementController } from "Mara/MaraSettlementController";

export abstract class MaraSubcontroller {
    protected readonly settlementController: MaraSettlementController;

    constructor (parent: MaraSettlementController) {
        this.settlementController = parent;
    }

    abstract Tick(tickNumber: number): void;
}