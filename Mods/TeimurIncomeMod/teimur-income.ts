import HordePluginBase from "plugins/base-plugin";
import { Settlement } from "library/game-logic/horde-types";

const PeopleIncomeLevel = HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;
type PeopleIncomeLevel = HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;

/**
 * Плагин для установки кастомного значения уровней прироста населения для фракции Теймура.
 * В итоге значения будут примерно такие же, как и у славян, но не требуются мельницы, а также учитывается каждый отдельный дом, а не попарно.
 */
export class TeimurIncomePlugin extends HordePluginBase {

    public constructor() {
        super("Teimur income");
    }

    public onFirstRun() {
        ForEach(ActiveScena.Settlements, (settlement: Settlement) => {
            if (settlement.Force.Uid != "#Force_Barbarian") {
                return;
            }

            let censusData = ScriptUtils.GetValue(settlement.Census, "Data");

            censusData.PeopleIncomeLevels = HordeClassLibrary.World.Settlements.Modules.SettlementPopulationCensus.GetDefaultPeopleIncomeLevels();
            censusData.PeopleIncomeLevels.Clear();
            for (let i = 0; i <= 20; i++) {
                censusData.PeopleIncomeLevels.Add(new PeopleIncomeLevel(0, 5 * i, 600 - 20 * i));
            }
            censusData.LastPeopleIncomeLevel = 0;
            this.log.info("Изменены уровни прироста населения для " + settlement);
        });
    }
}
