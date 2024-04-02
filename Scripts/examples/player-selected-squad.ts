import HordeExampleBase from "./base-example";

/**
 * Пример работы с выделенным игроком отрядом
 */
export class Example_PlayerSelectedSquad extends HordeExampleBase {
    workPlayer: any;

    public constructor() {
        super("Player selected squad");
        this.workPlayer = Players[0].GetRealPlayer();
    }

    public onFirstRun() {
        this.logMessageOnRun();

        if (this.globalStorage.squadChangedHandler) {
            this.globalStorage.squadChangedHandler.disconnect();
        }

        // У каждого игрока имеется два отряда для обозначения текущих выделенных юнитов: UI и Virtual
        // UI - тот что отображается в интерфейсе. Он обновляется мгновенно, даже если игра на паузе
        // Virtual - тот что обрабатывается в логике игры. Обновление происходит только после синхронизации хостов. Т.е. на паузе этот отряд не изменяется.
        // Внимание! UI-отряд следует использовать исключительно для получения информации.
        // Внимание! Virtual-отряд можно использовать для воздействия на логику игры (при условии что скрипт выполняется в Logic-потоке, а сами действия одинаковы на каждом хосте)

        // Пример работы с UI отрядом игрока
        // Здесь при каждом выделении отряда будет отображаться информация в лог.
        let squadUISelector = ScriptUtils.GetValue(this.workPlayer, "SquadUISelector");
        this.globalStorage.squadChangedHandler = squadUISelector.SquadChanged.connect((sender, args) => {
            try {
                if (!args.WithSound) {
                    // Пропускаем согласование UI и Virtual отрядов
                    // В некоторых случаях это может иметь последствия, но для этого примера не критично. Максимум - будет выдана информация не потому отряду, что выделен
                    return;
                }
                this.processNewSquad(args.NewSquad);
            } catch (exc) {
                this.log.exception(exc);
            }
        });

        this.log.info("Установлен обработчик на событие выделения отряда");
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
