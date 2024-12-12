import { SettlementControllerStateFactory } from "../Common/Settlement/SettlementControllerStateFactory";
import { MaraUtils } from "../MaraUtils";
import { MaraSettlementControllerState } from "./MaraSettlementControllerState";

export class IdleState extends MaraSettlementControllerState {
    OnEntry(): void {
        this.settlementController.Info(`Chilling...`);
    }

    OnExit(): void {
        //do nothing
    }

    Tick(tickNumber: number): void {
        if (tickNumber % 50 != 0)  {
            return;
        }

        if (this.checkForNewEnemies()) {
            this.settlementController.Info(`The filth has risen its head again. Engaging purge protocols.`);
            this.settlementController.State = SettlementControllerStateFactory.MakeRoutingState(this.settlementController);
            return;
        }
    }

    private checkForNewEnemies(): boolean {
        let enemies = this.settlementController.StrategyController.EnemySettlements;
        let undefeatedEnemies: any[] = enemies.filter((value) => {return !MaraUtils.IsSettlementDefeated(value)});

        return undefeatedEnemies.length > 0;
    }
}