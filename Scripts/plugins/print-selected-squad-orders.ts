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
        if (squad.Count == 0) {
            this.log.info("[*] Selected squad is empty");
            return;
        }
        this.log.info("[*] Selected squad:");
        ForEach(squad, u => {
            this.log.info(u);

            this._printOrders(u, '');
            this._printNotifications(u, '');
        });
    }

    private _printOrders(u, prefix = "") {
        if (!u) {
            return;
        }

        this.log.info('= Orders', '(BehaviorFlags:', u.OrdersMind.BehaviorFlags.ToString() + ')');
        
        let ordersMind = u.OrdersMind;
        let needCancel = ScriptUtils.GetValue(ordersMind, "NeedCancelActiveOrder");
        let activeOrder = ordersMind.ActiveOrder;
        
        let disableNotificationsTimer = ScriptUtils.GetValueAs(AOrderBaseT, activeOrder, "_timerDisableNotifications");
        let notificationsStr = `Allow notifications: ${activeOrder.CanBeCanceledByNotification}`;
        if (disableNotificationsTimer && disableNotificationsTimer.LeftTicks > 0) {
            notificationsStr += ` (LeftTicks: ${disableNotificationsTimer.LeftTicks})`;  // Feature: потом эту строку можно будет перенести в ядро
        }

        this.log.info(prefix + '-   Current:', activeOrder.ToString(), '| IsInstinct:', activeOrder.IsInstinct, '|', notificationsStr, '| NeedCancel:', needCancel);
        this.log.info(prefix + '-    ', ordersMind.ActiveAct);
        this.log.info(prefix + '-    ', ordersMind.ActiveMotion);
        this.log.info(prefix + '-     Motive:', u.OrdersMind.ActiveOrder.MotiveNotification);
        
        let queue = ScriptUtils.GetValue(ordersMind, "OrdersQueue");
        let next = queue.GetNextExpectedOrder();
        if (next) {
            this.log.info(prefix + '-   Next:', next.ToString());
        } else {
            this.log.info(prefix + '-   Next:', 'None');
        }
    }
    
    private _printNotifications(u, prefix = "") {
        if (!u) {
            return;
        }
        
        this.log.info('= Notifications');
        
        let instinctsMind = u.InstinctsMind;
        this.log.info(prefix + '-   MainAlarm:', instinctsMind.MainAlarm);
        this.log.info(prefix + '-   MainThreat:', instinctsMind.MainThreat);
        this.log.info(prefix + '-   PanikCause:', instinctsMind.PanikCause);
        this.log.info(prefix + '-   SideAction:', instinctsMind.SideAction);
    }
}
