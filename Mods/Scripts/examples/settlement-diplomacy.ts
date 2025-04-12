import { DiplomacyStatus, Settlement } from "library/game-logic/horde-types";
import HordeExampleBase from "./base-example";


/**
 * Пример работы с дипломатией.
 */
export class Example_SettlementDiplomacy extends HordeExampleBase {
    private settlements: Array<string>;
    private noLogDipActions: boolean;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Settlement diplomacy");

        // Поселения, для которых будут выполнены изменения
        this.settlements = ["0"];

        // Нужно ли логгировать изменение дип. отношений?
        this.noLogDipActions = true;
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        this.logMessageOnRun();

        let scenaSettlements = ActiveScena.GetRealScena().Settlements;

        for (let settlementId of this.settlements) {
            let settlement = scenaSettlements.GetByUid(settlementId);

            let oldDipStatuses = this.getCurrentStatuses(settlement);
            this.declarePeaceToAll(settlement);
            this.declareAllianceToAll(settlement);
            this.restoreStatuses(settlement, oldDipStatuses);
        }
    }

    /**
     * Получение текущих дип. статусов.
     */
    private getCurrentStatuses(settlement: Settlement) {
        const townName = '"' + settlement.TownName + '"';
        let scenaSettlements = ActiveScena.GetRealScena().Settlements;

        this.log.info("Получение дипломатических статусов", townName);
        let dipStatuses: { [key: string]: DiplomacyStatus } = {};
        ForEach(scenaSettlements, (otherSettlement: Settlement) => {
            if (otherSettlement == settlement) { return; }

            dipStatuses[otherSettlement.Uid] = settlement.Diplomacy.GetDiplomacyStatus(otherSettlement);

            this._logDipAction("Между", settlement.LeaderName, "и", otherSettlement.LeaderName, "статус:", dipStatuses[otherSettlement.Uid]);
        });
        this.log.info("Получены все дипломатические статусы с", townName);

        return dipStatuses;
    }

    /**
     * Заключение мира со всеми
     */
    private declarePeaceToAll(settlement: Settlement) {
        const townName = '"' + settlement.TownName + '"';
        let scenaSettlements = ActiveScena.GetRealScena().Settlements;

        this.log.info("Заключение мира с", townName);
        ForEach(scenaSettlements, (otherSettlement: Settlement) => {
            if (otherSettlement == settlement) { return; }

            settlement.Diplomacy.DeclarePeace(otherSettlement);
            otherSettlement.Diplomacy.DeclarePeace(settlement);

            this._logDipAction("Заключен союз между", settlement.LeaderName, "и", otherSettlement.LeaderName);
        });
        this.log.info("Все поселения заключили мир с", townName);
    }

    /**
     * Заключение союзов со всеми
     */
    private declareAllianceToAll(settlement: Settlement) {
        const townName = '"' + settlement.TownName + '"';
        let scenaSettlements = ActiveScena.GetRealScena().Settlements;

        this.log.info("Заключение союзов с", townName);
        ForEach(scenaSettlements, (otherSettlement: Settlement) => {
            if (otherSettlement == settlement) { return; }

            settlement.Diplomacy.DeclareAlliance(otherSettlement);
            otherSettlement.Diplomacy.DeclareAlliance(settlement);

            this._logDipAction("Заключен союз между", settlement.LeaderName, "и", otherSettlement.LeaderName);
        });
        this.log.info("Все поселения заключили союз с", townName);
    }

    /**
     * Вернуть все как было
     */
    private restoreStatuses(settlement: Settlement, oldDipStatuses: { [key: string]: DiplomacyStatus }) {
        const townName = '"' + settlement.TownName + '"';
        let scenaSettlements = ActiveScena.GetRealScena().Settlements;

        this.log.info("Восстановление изначальных отношений..");
        ForEach(scenaSettlements, (otherSettlement: Settlement) => {
            if (otherSettlement == settlement) { return; }
            let oldDipStatus = oldDipStatuses[otherSettlement.Uid];
            if (oldDipStatus == DiplomacyStatus.Unknown) {
                // Does not implemented now
            } else if (oldDipStatus == DiplomacyStatus.Neutral) {
                settlement.Diplomacy.DeclarePeace(otherSettlement);
                otherSettlement.Diplomacy.DeclarePeace(settlement);
                this._logDipAction("Заключен мир между", settlement.LeaderName, "и", otherSettlement.LeaderName);
            } else if (oldDipStatus == DiplomacyStatus.Alliance) {
                settlement.Diplomacy.DeclareAlliance(otherSettlement);
                otherSettlement.Diplomacy.DeclareAlliance(settlement);
                this._logDipAction("Заключен союз между", settlement.LeaderName, "и", otherSettlement.LeaderName);
            } else if (oldDipStatus == DiplomacyStatus.War) {
                settlement.Diplomacy.DeclareWar(otherSettlement);
                otherSettlement.Diplomacy.DeclareWar(settlement);
                this._logDipAction("Между", settlement.LeaderName, "и", otherSettlement.LeaderName, "объявлена война!");
            } else if (oldDipStatus == DiplomacyStatus.Suzerain) {
                // Does not implemented now
            } else if (oldDipStatus == DiplomacyStatus.Vassal) {
                // Does not implemented now
            }
        });
        this.log.info("Восстановлены изначальные дипломатические статусы с", townName);
    }

    /**
     * Записать в лог инфо об изменении дип. статуса
     */
    private _logDipAction(...vars: any[]) {
        if (!this.noLogDipActions) {
            this.log.info("-", ...vars);
        }
    }
}
