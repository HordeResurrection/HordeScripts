import { createPoint } from "library/common/primitives";
import { inspect } from "library/common/introspection";
import { BattleController, OneClickCommandArgs, PointCommandArgs, ProduceAtCommandArgs, ProduceCommandArgs, UnitCommand, UnitHurtType, UnitDirection } from "library/game-logic/horde-types";
import { unitCanBePlacedByKnownMap, unitCanBePlacedByRealMap, unitCheckPathTo, unitSpeedAtCellByKnownMap, unitSpeedAtCellByRealMap, unitTeleport } from "library/game-logic/unit-and-map";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import HordeExampleBase from "./base-example";
import { getOrCreateTestUnit } from "./unit-example-utils";

/**
 * Пример работы с юнитом
 */
export class Example_UnitWorks extends HordeExampleBase {

    public constructor() {
        super("Unit works");
    }

    public onFirstRun() {
        this.logMessageOnRun();
        
        let unit = getOrCreateTestUnit(this);
        if (unit == null) {
            this.log.info('Не удалось создать юнита для этого примера!');
            return;
        }
        this.log.info('Для этого примера выбран:', unit);

        // В юните много разных методов (убрать false, чтобы отобразить названия методов)
        if (false) inspect(unit);

        // Здесь хранятся значения переменных юнита
        let unitDTO = ScriptUtils.GetValue(unit, "Model");
        this.log.info('Здоровье юнита:', unitDTO.Health);
        this.log.info('Направление юнита:', unitDTO.PositionModel.Direction);

        // Устанавливаем направление "Вверх"
        unitDTO.PositionModel.Direction = UnitDirection.Up;
        this.log.info('Направление юнита после изменения:', unitDTO.PositionModel.Direction);

        // Боевой отдел:
        let battleMind = unit.BattleMind;

        this.log.info(`${battleMind}`);
        this.log.info(`Нанесем 1 ед. урона юниту с типом повреждения "ближний бой"`);
        battleMind.TakeDamage(1, UnitHurtType.Mele);

        // Другие методы в BattleMind:
        //   TakeEffectiveDamage(attacker, dmg, type) - нанесение урона без учета брони
        //   InstantDeath(attacker, type) - уничтожить юнит
        //   CauseDamage(target, dmg, type) - нанесение урона другому юниту
        //   CauseEffectiveDamage(target, dmg, type) - нанесение урона другому юниту без учета брони

        // Отдел приказов
        let ordersMind = unit.OrdersMind;
        // Подробнее см. в отдельном примере - "Example_UnitOrders"

        // Отдел команд
        let commandsMind = unit.CommandsMind;

        // Запретим/разрешим команду атаки
        // Внимание! Запрет будет действовать на уровне получения команды.
        // Т.е. непосредственно атаковать юнит все ещё сможет и даже будет получать приказ при автоатаке, но игрок не сможет выдать эту команду.
        let unitCmd = UnitCommand.Attack;
        this.log.info('Запрещение команды:', unitCmd);
        commandsMind.DisallowCommand(unitCmd);
        if (commandsMind.IsCommandDisallowed(unitCmd)) {
            this.log.info('- Команда атаки запрещена');
        } else {
            this.log.info('- Команда атаки разрешена');
        }
        // Снимать запрет нужно столько же раз, сколько он был установлен
        this.log.info('Снятие запрета на команду:', unitCmd);
        commandsMind.AllowDisallowedCommand(unitCmd);
        if (commandsMind.IsCommandDisallowed(unitCmd)) {
            this.log.info('- Команда атаки запрещена');
        } else {
            this.log.info('- Команда атаки разрешена');
        }

        // Проверим, может ли юнит дойти до клетки?
        let cell = createPoint(55, 10);
        if (unitCheckPathTo(unit, cell)) {
            this.log.info('Юнит может пройти к', cell);
        } else {
            this.log.info('Юнит НЕ может пройти к', cell);
        }

        // Телепортация юнита (отключено, чтобы не сбивать другие примеры)
        if (false) {
            if (unitTeleport(unit, cell)) {
                this.log.info('Юнит телепортирован в', cell);
            } else {
                this.log.info('Юнит НЕ может быть телепортирован в', cell);
            }
        }

        // Скорость юнита в клетке
        this.log.info('Скорость юнита в клетке', cell, 'согласно реальной карте:', unitSpeedAtCellByRealMap(unit, cell));

        // Скорость юнита в клетке с учетом тумана войны
        this.log.info('Скорость юнита в клетке', cell, 'согласно известной карте:', unitSpeedAtCellByKnownMap(unit, cell));

        // Можно ли разместить юнита с указанным конфигом в этой клетке?
        // Тут важно, что проверяется без наличия самого юнита
        let riderCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Raider");
        let settlement = unit.Owner;
        this.log.info('Можно ли поместить юнита', '"' + riderCfg.Name + '"', 'в клетке', cell,
            'согласно известной карте:', unitCanBePlacedByKnownMap(riderCfg, settlement, cell.X, cell.Y));

        // Такая же проверка с учетом тумана войны
        this.log.info('Можно ли поместить юнита', '"' + riderCfg.Name + '"', 'в клетке', cell,
            'согласно реальной карте:', unitCanBePlacedByRealMap(riderCfg, cell.X, cell.Y));
    }
}


/**
 * Пример работы с приказами юнита
 */
export class Example_UnitOrders extends HordeExampleBase {

    public constructor() {
        super("Unit orders");
    }

    public onFirstRun() {
        this.logMessageOnRun();

        let unit = getOrCreateTestUnit(this);
        if (unit == null) {
            this.log.info('Не удалось создать юнита для этого примера!');
            return;
        }
        this.log.info('Для этого примера выбран:', unit);

        // Отдел приказов
        let ordersMind = unit.OrdersMind;

        // Проверка что юнит бездействует
        this.log.info('Юнит бездействует? Вариант 1:', ordersMind.IsIdle());
        this.log.info('Юнит бездействует? Вариант 2:', ordersMind.OrdersCount == 0);

        // Текущий приказ юнита (другой вариант)
        let activeOrder = ordersMind.ActiveOrder;
        this.log.info('Текущий приказ юнита:', activeOrder);

        // Отменить приказы юнита кроме текущего
        ordersMind.CancelOrdersSafe(false);

        // Отменить все приказы юнита
        ordersMind.CancelOrdersSafe(true);

        // Устанавливаем smart-приказ юниту (как при клике правой кнопкой мыши)
        let deactivateNotificationsTime = 600;  // отмена инстинктов на столько тактов
        let targetCell = createPoint(unit.Cell.X, unit.Cell.Y + 1);
        ordersMind.AssignSmartOrder(targetCell, AssignOrderMode.Replace, deactivateNotificationsTime);
        this.log.info('Юнит получил smart-приказ в', targetCell);

        // Создание разных команд для приказов
        let oneClickCommandArgs = new OneClickCommandArgs(UnitCommand.StepAway, AssignOrderMode.Queue);
        this.log.info('Простая команда:', '"' + oneClickCommandArgs + '"');
        let pointCommandArgs = new PointCommandArgs(createPoint(10, 10), UnitCommand.Attack, AssignOrderMode.Queue);
        this.log.info('Команда с целью в клетке:', '"' + pointCommandArgs) + '"';
        let produceAtCommandArgs = new ProduceAtCommandArgs(AssignOrderMode.Queue, HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Fence"), createPoint(2, 4), createPoint(3, 7), 1000);
        this.log.info('Команда строительства в клетке:', '"' + produceAtCommandArgs + '"');
        let produceCommandArgs = new ProduceCommandArgs(AssignOrderMode.Queue, HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Worker1"), 1);
        this.log.info('Команда тренировки:', '"' + produceCommandArgs + '"');

        // Выдача приказа согласно команде
        if (unit.Cfg.GetOrderDelegate(unit, oneClickCommandArgs)) {
            this.log.info('Добавлен приказ для команды:', '"' + oneClickCommandArgs + '"');
        } else {
            this.log.info('Не удалось добавить приказ через команду:', '"' + pointCommandArgs + '"');
        }

        // Выдача приказа согласно команде
        if (unit.Cfg.GetOrderDelegate(unit, pointCommandArgs)) {
            this.log.info('Добавлен приказ для команды:', '"' + pointCommandArgs + '"');
        } else {
            this.log.info('Не удалось добавить приказ через команду:', '"' + pointCommandArgs + '"');
        }
    }
}
