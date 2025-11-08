import { createPoint } from "library/common/primitives";
import { GeometryPresets, MotionCustom, OrderCustom, PointCommandArgs, StateMotion, Unit, UnitCommand, UnitCommandConfig, UnitDirection, UnitState, VisualEffectConfig } from "library/game-logic/horde-types";
import { setUnitStateWorker } from "library/game-logic/workers";
import HordeExampleBase from "./base-example";
import { spawnUnit } from "library/game-logic/unit-spawn";
import { spawnDecoration } from "library/game-logic/decoration-spawn";


const CUSTOM_COMMAND_ID = UnitCommand.PointBased_Custom_0;
const DELAY_TO_ACTION = 250;


/**
 * Пример работы с кастомным приказом.
 * 
 * Здесь юниту добавляется кастомная команда, которая даёт Custom-приказ, который даёт Custom-состояние юнита.
 * Это Custom-состояние будет обработано в функции `stateWorker_Custom`.
 */
export class Example_CustomUnitOrder extends HordeExampleBase {
    
    private smokeDecorationCfg: VisualEffectConfig;

    public constructor() {
        super("Custom unit order");
        this.smokeDecorationCfg = HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_ArrowSmoke");
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
     * Добавление команды для замка и обработчика Custom-состояния.
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
        let pluginWrappedWorker = (u: Unit) => this.stateWorker_Custom(u);
        setUnitStateWorker("CustomOrderExample", someCastle.Cfg, UnitState.Custom, pluginWrappedWorker);

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
        ScriptUtils.SetValue(cmdCfg, "Tip", "Нужно сделать клик по кнопке, а затем на карту");  // Это будет отображаться при наведении курсора
        ScriptUtils.SetValue(cmdCfg, "UnitCommand", CUSTOM_COMMAND_ID);
        ScriptUtils.SetValue(cmdCfg, "Hotkey", "Q");
        ScriptUtils.SetValue(cmdCfg, "ShowButton", true);
        ScriptUtils.SetValue(cmdCfg, "PreferredPosition", createPoint(1, 1));
        ScriptUtils.SetValue(cmdCfg, "AutomaticMode", null);

        // Установка анимации выполняется чуть другим способом:
        ScriptUtils.GetValue(cmdCfg, "AnimationsCatalogRef").SetConfig(HordeContentApi.GetAnimationCatalog("#AnimCatalog_Command_View"));

        return cmdCfg;
    }


    /**
     * Обработчик юнита для состояния Custom.
     * Этот метод будет запускаться каждый такт, пока у юнита стоит OrderCustom.
     */
    private stateWorker_Custom(u: Unit) {

        let motion = u.OrdersMind.ActiveMotion;

        // Проверяем, что сейчас действительно выполняется кастомный приказ
        if (!host.isType(MotionCustom, motion)) {
            motion.State = StateMotion.Failed;
            return;
        }
        
        // Настройка при первом запуске обработки состояния Custom
        if (motion.IsUnprepared) {

            // Команда с которой был выдан приказ
            let cmdArgs = (u.OrdersMind.ActiveOrder as OrderCustom).CommandArgs;

            // В нашем случае это была PointBased-команда
            if (!host.isType(PointCommandArgs, cmdArgs)) {
                motion.State = StateMotion.Failed;
                return;
            }

            // Для примера - создаём временного юнита
            let targetCell = (cmdArgs as PointCommandArgs).TargetCell;
            u.ScriptData.CustomWorkerExample = {
                SpawnedUnit: spawnUnit(u.Owner, HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Archer"), targetCell, UnitDirection.Up)
            };
            spawnDecoration(u.Scena, this.smokeDecorationCfg, GeometryPresets.CellToCenterPosition(targetCell));
            
            // Отмечаем, что настройка завершена
            motion.State = StateMotion.InProgress;
            this.log.info("Custom state: prepairing completed!");
        }
        
        // Действия после прохождения указанного количества тактов
        if (motion.CheckProgress(DELAY_TO_ACTION))
        {
            // Действие примера завершено - удаляем временного юнита
            let spawnedUnit = u.ScriptData.CustomWorkerExample.SpawnedUnit;
            if (spawnedUnit == null) {
                motion.State = StateMotion.Failed;
                return;
            }
            spawnedUnit.Delete();
            spawnDecoration(u.Scena, this.smokeDecorationCfg, spawnedUnit.PositionInt);
            
            // Отмечаем, что состояние полностью обработано, пора получать следующий приказ
            motion.State = StateMotion.Done;
            this.log.info("Custom state completed!");
        }
    }
}

