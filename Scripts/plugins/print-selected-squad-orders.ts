import { IDisposableT, IEnumeratorT } from "library/dotnet/dotnet-types";
import HordePluginBase from "./base-plugin";
import { Squad, Unit } from "library/game-logic/horde-types";


/**
 * Плагин для отображения списка приказов выделенных юнитов
 */
export class PrintSelectedSquadOrdersPlugin extends HordePluginBase {

    public constructor() {
        super("Player selected squad");
    }


    public onFirstRun() {
        if (this.globalStorage.squadChangedHandler) {
            this.globalStorage.squadChangedHandler.disconnect();
        }

        // Обработчик события изменения UI-отряда игрока
        // Подробнее см. в "Example_PlayerSelectedSquad"
        let squadUISelector = ScriptUtils.GetValue(ActivePlayer, "SquadUISelector") as HordeResurrection.Engine.Battle.Players.Input.PlayerSquadSelector;
        this.globalStorage.squadChangedHandler = squadUISelector.SquadChanged.connect((sender, args) => {
            try {
                if (!args) {
                    return;
                }
                if (!args.WithSound) {
                    return;
                }
                this.processNewSquad(args.NewSquad);
            } catch (exc) {
                this.log.exception(exc);
            }
        });
    }

    private processNewSquad(squad: Squad) {
        let tickText = `${DataStorage.gameTickNum}`;

        if (squad.Count == 0) {
            this.log.info(`[*] [${tickText}] Selected squad is empty`);
            return;
        }

        if (squad.Count == 1) {
            this.log.info(`[*] [${tickText}] Selected squad: 1 unit`);
        } else {
            this.log.info(`[*] [${tickText}] Selected squad:`, squad.Count, "units", "(print info for only first unit)");
        }

        let u = squad.GetFirstUnit();
        if (!u) {
            this.log.info("== Selected unit is null");
            return;
        }

        this.log.info('==', u);

        this._printCurrentOrder(u, '-   ');
        this._printNextOrders(u, '-   ');
        this._printNotifications(u, '-   ');
    }

    private _printCurrentOrder(u: Unit, prefix = "") {
        if (!u) {
            return;
        }

        let ordersMind = u.OrdersMind;
        this.log.info('= Orders', '(Count:', ordersMind.OrdersCount + ', BehaviorFlags:', ordersMind.BehaviorFlags.ToString() + ')');

        let needCancel = ordersMind.NeedCancelActiveOrder;
        let activeOrder = ordersMind.ActiveOrder;
        let notificationsStr = activeOrder.GetNotificationsInfoString();

        this.log.info(prefix + 'Current:', activeOrder);
        this.log.info(prefix + '  >', 'IsInstinct:', activeOrder.IsInstinct, '|', notificationsStr, '| NeedCancel:', needCancel);
        this.log.info(prefix + '  Act:', ordersMind.ActiveAct);
        this.log.info(prefix + '  Motion:', ordersMind.ActiveMotion);
        this.log.info(prefix + '  Motive:', str(ordersMind.ActiveOrder.MotiveNotification));

    }

    private _printNextOrders(u: Unit, prefix = "") {
        if (!u) {
            return;
        }

        let nextOrders: Array<any> = [];

        let ordersMind = u.OrdersMind;
        let queue = ScriptUtils.GetValue(ordersMind, "OrdersQueue");

        let instinctOrder = ScriptUtils.GetValue(queue, "CurrentInstinctOrder");
        if (instinctOrder) {
            nextOrders.push(instinctOrder);
        }

        let enumerator = host.cast(IEnumeratorT, queue.GetFollowingOrdersEnumerator()) as IEnumeratorT;
        while (enumerator.MoveNext()) {
            nextOrders.push(enumerator.Current);
        }
        (host.cast(IDisposableT, enumerator) as IDisposableT).Dispose();

        if (nextOrders.length > 0) {
            for (let i = 0; i < nextOrders.length; i++) {
                if (i == 0) {
                    this.log.info(prefix + `Next:`, str(nextOrders[i]));
                } else {
                    this.log.info(prefix + `  +${i}:`, str(nextOrders[i]));
                }
            }
        } else {
            this.log.info(prefix + 'Next: <Queue is empty>');
        }
    }

    private _printNotifications(u: Unit, prefix = "") {
        if (!u) {
            return;
        }

        this.log.info('= Notifications');

        let instinctsMind = u.InstinctsMind;
        this.log.info(prefix + 'MainAlarm:', str(instinctsMind.MainAlarm));
        this.log.info(prefix + 'MainThreat:', str(instinctsMind.MainThreat));
        this.log.info(prefix + 'PanikCause:', str(instinctsMind.PanikCause));
        this.log.info(prefix + 'SideAction:', str(instinctsMind.SideAction));
    }
}

function str(obj: any) {
    if (obj)
        return obj.ToString();
    return '<None>';
}
