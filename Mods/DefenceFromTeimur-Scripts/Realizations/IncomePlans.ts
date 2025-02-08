import { createResourcesAmount } from "library/common/primitives";
import { IIncomePlan } from "../Types/IIncomePlan";

export class IncomePlan_0 extends IIncomePlan {
    static Description: string = "Вначале дается 1000/1000/1000/20. Каждые 30 секунд приходит по 500/500/300/7 ресурсов. До 10 минуты инком линейно растет с 0.";

    prevIncomeGameTick: number;
    incomePeriod: number;

    constructor() {
        super();

        this.prevIncomeGameTick = 0;
        this.incomePeriod = 30*50;
    }

    public StartResources() : any {
        return createResourcesAmount(1000, 1000, 1000, 20);
    }

    public IncomeResources(gameTickNum: any) : any {
        if (this.prevIncomeGameTick + this.incomePeriod >= gameTickNum) {
            return null;
        }
        this.prevIncomeGameTick = gameTickNum;
        
        const gameTickMax  = 10*60*50;
        const goldmetal_k  = 500.0 / gameTickMax;
        const lumber_k     = 300.0 / gameTickMax;
        const people_k     = 7.0   / gameTickMax;
        return createResourcesAmount(
            Math.min(500, Math.floor(goldmetal_k*gameTickNum)),
            Math.min(500, Math.floor(goldmetal_k*gameTickNum)),
            Math.min(300, Math.floor(lumber_k*gameTickNum)),
            Math.min(7, Math.floor(people_k*gameTickNum)));
    }
}

export class IncomePlan_1 extends IIncomePlan {
    static Description: string = "Вначале дается 500/500/500/20. Каждые 30 секунд приходит по 150/150/90/5 ресурсов.";

    prevIncomeGameTick: number;
    incomePeriod: number;

    constructor() {
        super();

        this.prevIncomeGameTick = 0;
        this.incomePeriod = 30*50;
    }

    public StartResources() : any {
        return createResourcesAmount(500, 500, 500, 20);
    }

    public IncomeResources(gameTickNum: any) : any {
        if (this.prevIncomeGameTick + this.incomePeriod >= gameTickNum) {
            return null;
        }
        this.prevIncomeGameTick = gameTickNum;
        
        return createResourcesAmount(150, 150, 90, 5);
    }
}
