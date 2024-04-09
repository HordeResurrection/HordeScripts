import HordePluginBase from "./base-plugin";


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

            this.log.info('= Unit orders', '(BehaviorFlags:', u.OrdersMind.BehaviorFlags.ToString() + ')');
            this._printOrders(u, '');
        });
    }

    private _printOrders(u, prefix = "") {
        if (!u) {
            return;
        }
        
        var needCancel = ScriptUtils.GetValue(u.OrdersMind, "NeedCancelActiveOrder");
        var activeOrder = u.OrdersMind.ActiveOrder;
        this.log.info(prefix + '- Current:', activeOrder.ToString(), '| IsInstinct:', activeOrder.IsInstinct, '| Allow notifications:', activeOrder.CanBeCanceledByNotification, '| NeedCancel:', needCancel);
        this.log.info(prefix + '-   ', u.OrdersMind.ActiveAct);
        this.log.info(prefix + '-   ', u.OrdersMind.ActiveMotion);
        
        var queue = ScriptUtils.GetValue(u.OrdersMind, "OrdersQueue");
        var next = queue.GetNextExpectedOrder();
        if (next) {
            this.log.info(prefix + '- Next:', next.ToString());
        } else {
            this.log.info(prefix + '- Next:', 'None');
        }
    }
}
