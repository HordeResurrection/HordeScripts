import { BaseUnitEventArgs, TakeDamageEventArgs, Unit } from "library/game-logic/horde-types";
import HordeExampleBase from "./base-example";
import { getOrCreateTestUnit } from "./unit-example-utils";

/**
 * Пример обработки событий юнита
 */
export class Example_UnitHandleEvents extends HordeExampleBase {
    private settlements: Array<string>;

    public constructor() {
        super("Handle unit events");

        this.settlements = ["0"];

        if (!this.globalStorage.currentHandlers) {
            this.globalStorage.currentHandlers = [];
        }
    }

    public onFirstRun() {
        this.logMessageOnRun();

        // Удаляем предыдущие обработчики (на случай hot-reload)
        this.globalStorage.currentHandlers.forEach((handler: any) => handler.disconnect());

        // Установка обработчиков
        let scenaSettlements = ActiveScena.GetRealScena().Settlements;
        for (let settlementId of this.settlements) {
            let settlement = scenaSettlements.GetByUid(settlementId);
            let settlementUnits = settlement.Units;

            let that = this;

            // Обработка события для всех юнитов поселения
            this.globalStorage.currentHandlers.push(settlementUnits.UnitCauseDamage.connect((sender, args) => that.log.info('[Settlement]', args)));
            this.globalStorage.currentHandlers.push(settlementUnits.UnitTakeDamage.connect((sender, args) => that.log.info('[Settlement]', args)));
            this.globalStorage.currentHandlers.push(settlementUnits.UnitTakeDamageByUnknownSource.connect((sender, args) => that.log.info('[Settlement]', args)));

            // Обработка событий для каждого юнита отдельно
            ForEach(settlementUnits, (u: Unit) => {
                let eventsMind = u.EventsMind;
                this.globalStorage.currentHandlers.push(eventsMind.CauseDamage.connect((sender, args) => that.log.info('[Unit]', args)));
                this.globalStorage.currentHandlers.push(eventsMind.TakeDamage.connect((sender, args) => that.log.info('[Unit]', args)));
                this.globalStorage.currentHandlers.push(eventsMind.TakeDamageByUnknownSource.connect((sender, args) => that.log.info('[Unit]', args)));
            });
        }
    }
}


/**
 * Пример перечисления событий юнита за последний такт
 * 
 * Здесь под "событиями" подразумеваются данные о том, что что-то случилось.
 */
export class Example_UnitEnumerateEvents extends HordeExampleBase {
    private workFlag: boolean | undefined = undefined;

    public constructor() {
        super("Enumerate unit events");
    }

    public onFirstRun() {
        this.logMessageOnRun();
    }

    public onEveryTick(gameTickNum: number) {
        if (this.workFlag == false) {
            return;
        }

        let unit = getOrCreateTestUnit(this);
        if (!unit) {
            this.log.info('Не удалось создать юнита для этого примера!');
            this.log.info('Пример', '"' + arguments.callee.name + '"', 'отключен!');
            this.workFlag = false;
            return;
        } else if (this.workFlag === undefined) {
            this.log.info('Для этого примера выбран:', unit);
            this.workFlag = true;
        }

        try {
            // Отдел событий
            let eventsMind = unit.EventsMind;

            // События за последний такт
            let lastFrameEvents = ScriptUtils.GetValue(eventsMind, "LastFrameEvents");

            // Перечисление событий за такт
            ForEach(lastFrameEvents, (e: BaseUnitEventArgs) => {
                this.log.info('Tick:' + Battle.GameTimer.GameFramesCounter, '-', e);

                // Проверка убийства юнита
                if (unit.Health <= 0) {
                    if (host.isType(TakeDamageEventArgs, e)) {
                        let eDmg = e as TakeDamageEventArgs;
                        if (eDmg.AttackerUnit) {
                            this.log.info('  Тестовый юнит был убит юнитом:', eDmg.AttackerUnit);
                        } else {
                            this.log.info('  Тестовый юнит умер');
                        }
                    }
                }

                // Внимание! Объект события может "жить" от 1 до 2 игровых тактов. Зависит от места проверки событий.
                // Если вести отсчет относительно времени обработки юнита, то объект события (e) живет ровно 1 такт.

                // Важно! Не следует сохранять "e"-объекты в глобальные переменные, т.к. данные в них будут заменены через 1-2 такта.
                // Это связанно с тем, что для оптимизации используется общий пул "e"-объектов.
                // Если требуется сохранить какие-то данные собятия, то для этого нужно переместить их в отдельную структуру.
            });
        } catch (ex) {
            this.log.exception(ex);
            this.log.info('Пример', '"' + arguments.callee.name + '"', 'отключен!');
            this.workFlag = false;
        }
    }
}
