import { MaraResources } from "../Utils/Common";
import { MaraSubcontroller } from "./MaraSubcontroller";
import { MaraSettlementController } from "Mara/MaraSettlementController";

export class MiningSubcontroller extends MaraSubcontroller {
    constructor (parent: MaraSettlementController) {
        super(parent);
    }

    Tick(tickNumber: number): void {
        
    }

    public GetTotalResources(): MaraResources {
        //TODO: estimate lumber and minerals resources in cultivated resource clusters

        let settlementResources = this.parentController.Settlement.Resources;
        
        let totalResources = new MaraResources(
            settlementResources.Wood,
            settlementResources.Metal,
            settlementResources.Gold,
            settlementResources.FreePeople
        );

        return totalResources;
    }
}