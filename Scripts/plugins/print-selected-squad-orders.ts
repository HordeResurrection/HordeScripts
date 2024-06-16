import HordePluginBase from "./base-plugin";


export const AOrderBaseT = ScriptUtils.GetTypeByName("HordeClassLibrary.UnitComponents.OrdersSystem.Orders.AOrderBase", "HordeClassLibrary");


/**
 * Плагин для отображения списка приказов выделенных юнитов
 */
export class PrintSelectedSquadOrdersPlugin extends HordePluginBase {

    public constructor() {
        super("Player selected squad");
    }


    public onFirstRun() {
        let workPlayer = HordeEngine.HordeResurrection.Engine.Logic.Main.PlayersController.ActivePlayer;

        if (this.globalStorage.squadChangedHandler) {
            this.globalStorage.squadChangedHandler.disconnect();
        }

        // Обработчик события изменения UI-отряда игрока
        // Подробнее см. в "Example_PlayerSelectedSquad"
        let squadUISelector = ScriptUtils.GetValue(workPlayer, "SquadUISelector");
        this.globalStorage.squadChangedHandler = squadUISelector.SquadChanged.connect((sender, args) => {
            try {
                if (!args.WithSound) {
                    return;
                }
                this.processNewSquad(args.NewSquad);
            } catch (exc) {
                this.log.exception(exc);
            }
        });
    }

    private processNewSquad(squad) {
        let tickText = `${DataStorage.gameTickNum}`;

        if (squad.Count == 0) {
            this.log.info(`[*] [${tickText}] Selected squad is empty`);
            return;
        }

        if (squad.Count == 1) {
            this.log.info(`[*] [${tickText}] Selected squad: 1 unit`);
        } else {
            this.log.info(`[*] [${tickText}] Selected squad:", squad.Count, "units", "(print info for only first unit)`);
        }

        let u = squad.GetFirstUnit();
        if (!u) {
            this.log.info("== Selected unit is null");
            return;
        }
        
        this.log.info('==', u);

        this._printOrders(u, '-   ');
        this._printNotifications(u, '-   ');
    }

    private _printOrders(u, prefix = "") {
        if (!u) {
            return;
        }

        let ordersMind = u.OrdersMind;
        this.log.info('= Orders', '(Count:', ordersMind.OrdersCount + ', BehaviorFlags:', ordersMind.BehaviorFlags.ToString() + ')');
        
        let needCancel = ScriptUtils.GetValue(ordersMind, "NeedCancelActiveOrder");
        let activeOrder = ordersMind.ActiveOrder;
        
        let disableNotificationsTimer = ScriptUtils.GetValueAs(AOrderBaseT, activeOrder, "_timerDisableNotifications");
        let notificationsStr = `Allow notifications: ${activeOrder.CanBeCanceledByNotification}`;
        if (disableNotificationsTimer && disableNotificationsTimer.LeftTicks > 0) {
            notificationsStr += ` (LeftTicks: ${disableNotificationsTimer.LeftTicks})`;  // Feature: потом эту строку можно будет перенести в ядро
        }

        this.log.info(prefix + 'Current:', activeOrder);
        this.log.info(prefix + '  >', 'IsInstinct:', activeOrder.IsInstinct, '|', notificationsStr, '| NeedCancel:', needCancel);
        this.log.info(prefix + '  Act:', ordersMind.ActiveAct);
        this.log.info(prefix + '  Motion:', ordersMind.ActiveMotion);
        this.log.info(prefix + '  Motive:', str(ordersMind.ActiveOrder.MotiveNotification));
        
        let queue = ScriptUtils.GetValue(ordersMind, "OrdersQueue");
        let next = queue.GetNextExpectedOrder();
        this.log.info(prefix + 'Next:', str(next));
    }
    
    private _printNotifications(u, prefix = "") {
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

function str(obj) {
    if (obj)
        return obj.ToString();
    return '<None>';
}
