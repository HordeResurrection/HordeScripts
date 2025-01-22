import { createPoint } from "library/common/primitives";
import { UnitDirection } from "library/game-logic/horde-types";
import { spawnUnit } from "library/game-logic/unit-spawn";
import HordeExampleBase from "./base-example";

/**
 * Пример создания юнита
 */
export class Example_SpawnUnit extends HordeExampleBase {

    public constructor() {
        super("Spawn unit");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        let realScena = ActiveScena.GetRealScena();
        let settlements = realScena.Settlements;

        let settlement_0 = settlements.Item.get('0');  // Олег
        let archerCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer");
        let cell = createPoint(5, 5);
        let dir = UnitDirection.RightDown;

        let unit = spawnUnit(
            settlement_0,
            archerCfg,
            cell,
            dir
        );

        if (unit) {
            this.log.info(`Создан юнит: ${unit}`);
        } else {
            this.log.info('Юнита создать не удалось');
        }
    }
}
