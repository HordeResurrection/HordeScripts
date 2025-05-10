import { GlobalVars } from "../GlobalData";

export class IIncomePlan {
    static Description: string = "";

    public constructor() {

    }

    public OnStart() {
        this.AddResources(this.StartResources());
    }

    public OnEveryTick(gameTickNum: number) {
        this.AddResources(this.IncomeResources(gameTickNum));
    }

    public StartResources() : any {
        return null;
    }

    public IncomeResources(gameTickNum: any) : any {
        return null;
    }

    private AddResources(resources) {
        if (resources == null) {
            return;
        }

        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            if (GlobalVars.teams[teamNum].settlementsIdx.length == 0 ||
                GlobalVars.teams[teamNum].castle.unit.IsDead) {
                continue;
            }
            for (var settlement of GlobalVars.teams[teamNum].settlements) {
                settlement.Resources.AddResources(resources);
            }
        } 
    }
};
