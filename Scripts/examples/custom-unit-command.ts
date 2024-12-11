import { createPoint } from "library/common/primitives";
import { UnitCommand } from "library/game-logic/horde-types";
import { setUnitGetOrderWorker } from "library/game-logic/workers-tools";
import HordeExampleBase from "./base-example";


// Тут нужно указать любую команду, которую не использует целевой юнит.
// В дальнейшем здесь будет возможность задать произвольный числовой идентификатор (или строковый, как пойдет)
const CUSTOM_COMMAND_ID = UnitCommand.StepAway;


/**
 * Пример создания команды для юнита со скриптовым обработчиком.
 */
export class Example_CustomUnitCommand extends HordeExampleBase {
    private baseGetOrderWorker: any;

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
        if (!this.addCommandToCastle(cmdCfg)) {
            this.log.warning('Не удалось настроить кастомную команду');
            return;
        }

        this.log.info('Настройка завершена!');
    }


    /**
     * Добавление команды для замка.
     */
    private addCommandToCastle(cmdCfg) {
        let realScena = ActiveScena.GetRealScena();
        let settlement_0 = realScena.Settlements.Item.get('0');
    
        // Замок, которому будет добавлена команда
        let someCastle = settlement_0.Units.GetCastleOrAnyUnit();
        if (!someCastle || !someCastle.Cfg.HasMainBuildingSpecification) {
            this.log.warning("Для этого теста требуется наличие замка");
            return false;
        }

        // Установка обработчика команды в конфиг замка (нужно проделать только один раз)
        setUnitGetOrderWorker(this, someCastle.Cfg, this.worker_getUnitOrder);
        
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
        let cmdCfg;
        if (HordeContentApi.HasUnitCommand(exampleCommandCfgUid)) {
            // Конфиг уже был создан, берем предыдущий
            cmdCfg = HordeContentApi.GetUnitCommand(exampleCommandCfgUid);
            this.log.info('Конфиг команды для теста:', cmdCfg);
        } else {
            // Создание нового конфига
            let baseConfig = HordeContentApi.GetUnitCommand("#UnitCommandConfig_StepAway");  // Тут нужно взять любую команду с привязанной картинкой
            cmdCfg = HordeContentApi.CloneConfig(baseConfig, exampleCommandCfgUid);

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
    private worker_getUnitOrder(u: Unit, commandArgs) {
        if (u.OrdersMind.IsUncontrollable) {
            return;  // Юнит в данный момент является неуправляемым (например, в режиме паники)
        }

        if (commandArgs.CommandType == CUSTOM_COMMAND_ID) {
            // Была прожата кастомная команда
            this.log.info("Зафиксированно нажатие кастомной команды. Здесь можно выполнить любые действия.");
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
    return new HCL.HordeClassLibrary.UnitComponents.Workers.BaseBuilding.Special.BaseBuildingGetOrder();
}

