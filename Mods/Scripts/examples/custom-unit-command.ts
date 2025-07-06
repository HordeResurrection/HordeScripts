import { createPoint } from "library/common/primitives";
import { ACommandArgs, Unit, UnitCommand, UnitCommandConfig } from "library/game-logic/horde-types";
import { setUnitGetOrderWorker } from "library/game-logic/workers";
import HordeExampleBase from "./base-example";


// Тут нужно указать любую команду, которую не использует целевой юнит.
// Сейчас доступны следующие Id специально под кастомные команды:
// - UnitCommand.OneClick_Custom_N - для команд активируемых обычным кликом по кнопке
// - UnitCommand.PointBased_Custom_N - команды которым можно задать целевую точку
// - UnitCommand.Produce_Custom_N - команды с возможностью выбора юнита из списка
const CUSTOM_COMMAND_ID = UnitCommand.OneClick_Custom_0;


/**
 * Пример создания команды для юнита со скриптовым обработчиком.
 */
export class Example_CustomUnitCommand extends HordeExampleBase {
    private baseGetOrderWorker: HordeClassLibrary.UnitComponents.Workers.Interfaces.Special.AUnitWorkerGetOrder;

    public constructor() {
        super("Custom unit command");

        this.baseGetOrderWorker = createBaseGetOrderWorker();
    }


    /**
     * Здесь выполняется создание кастомной команды и её добавление замку игрока.
     */
    public onFirstRun() {
        this.logMessageOnRun();

        // Создание конфига команды
        let cmdCfg = this.getOrCreateUnitCommandConfig();

        // Добавление возможности выдачи команды для замка
        if (!this.addCommandToCastle(cmdCfg)) {
            this.log.warning('Не удалось настроить кастомную команду');
            return;
        }

        this.log.info('Настройка завершена!');
    }


    /**
     * Добавление команды для замка.
     */
    private addCommandToCastle(cmdCfg: UnitCommandConfig) {
        let settlement_0 = ActiveScena.Settlements.Item.get('0');

        // Замок, которому будет добавлена команда
        let someCastle = settlement_0.Units.GetCastleOrAnyUnit();
        if (!someCastle || !someCastle.Cfg.HasMainBuildingSpecification) {
            this.log.warning("Для этого теста требуется наличие замка");
            return false;
        }

        // Установка обработчика команды в конфиг замка (нужно проделать только один раз)
        let pluginWrappedWorker = (u: Unit, commandArgs: ACommandArgs): boolean => this.worker_getUnitOrder(u, commandArgs);
        setUnitGetOrderWorker("Castle_CustomCommand", someCastle.Cfg, pluginWrappedWorker);

        // Добавление команды юниту
        someCastle.CommandsMind.AddCommand(CUSTOM_COMMAND_ID, cmdCfg);
        this.log.info("Команда добавлена юниту:", someCastle);

        return true;
    }


    /**
     * Создание конфига кастомной команды.
     * 
     * Подсказка: Новый конфиг легче организовать через конфиги к моду, чем через динамическое создание.
     */
    private getOrCreateUnitCommandConfig() {
        let exampleCommandCfgUid = "#UnitCommandConfig_CustomEXAMPLE";
        let cmdCfg: UnitCommandConfig;
        if (HordeContentApi.HasUnitCommand(exampleCommandCfgUid)) {
            // Конфиг уже был создан, берем предыдущий
            cmdCfg = HordeContentApi.GetUnitCommand(exampleCommandCfgUid);
            this.log.info('Конфиг команды для теста:', cmdCfg);
        } else {
            // Создание нового конфига
            let baseConfig = HordeContentApi.GetUnitCommand("#UnitCommandConfig_StepAway");  // Тут нужно взять любую команду с привязанной картинкой
            cmdCfg = HordeContentApi.CloneConfig(baseConfig, exampleCommandCfgUid) as UnitCommandConfig;

            this.log.info('Создан новый конфиг команды для теста:', cmdCfg);
        }

        // Настройка
        ScriptUtils.SetValue(cmdCfg, "Name", "Кастомная команда");
        ScriptUtils.SetValue(cmdCfg, "Tip", "Нужно сделать клик");  // Это будет отображаться при наведении курсора
        ScriptUtils.SetValue(cmdCfg, "UnitCommand", CUSTOM_COMMAND_ID);
        ScriptUtils.SetValue(cmdCfg, "Hotkey", "Q");
        ScriptUtils.SetValue(cmdCfg, "ShowButton", true);
        ScriptUtils.SetValue(cmdCfg, "PreferredPosition", createPoint(1, 1));
        ScriptUtils.SetValue(cmdCfg, "AutomaticMode", null);

        // Установка анимации выполняетс чуть другим способом:
        ScriptUtils.GetValue(cmdCfg, "AnimationsCatalogRef").SetConfig(HordeContentApi.GetAnimationCatalog("#AnimCatalog_Command_View"));

        return cmdCfg;
    }


    /**
     * Обработчик для получения приказа из команды
     */
    private worker_getUnitOrder(u: Unit, commandArgs: ACommandArgs): boolean {
        if (u.OrdersMind.IsUncontrollable) {
            return false;  // Юнит в данный момент является неуправляемым (например, в режиме паники)
        }

        if (commandArgs.CommandType == CUSTOM_COMMAND_ID) {
            // Была прожата кастомная команда
            this.log.info("Зафиксировано нажатие кастомной команды. Здесь можно выполнить любые действия.");
            return true;
        } else {
            // Это не кастомная команда - запуск обычного обработчика получения приказа
            return this.baseGetOrderWorker.GetOrder(u, commandArgs);
        }
    }
}


/**
 * Создаёт базовый обработчик выдачи приказа.
 */
function createBaseGetOrderWorker() {
    return new HordeClassLibrary.UnitComponents.Workers.BaseBuilding.Special.BaseBuildingGetOrder();
}

