import { ACommandArgs, GeometryCanvas, GeometryVisualEffect, ScriptUnitWorkerGetOrder, Stride_Color, Stride_Vector2, TileType, Unit, UnitCommand, UnitCommandConfig, UnitConfig } from "library/game-logic/horde-types";
import { IUnit } from "./IUnit";
import { IConfig } from "./IConfig";
import { BuildingTemplate } from "../Configs/IFactory";
import { spawnGeometry } from "library/game-logic/decoration-spawn";
import { Formation2 } from "../Core/Formation2";

var opUnitIdToHeroObject : Map<number, IHero> = new Map<number, IHero>();

export class IHero extends IUnit {
    private static _GetOrderWorkerSet : boolean = false;
    private static _baseGetOrderWorker : HordeClassLibrary.UnitComponents.Workers.Interfaces.Special.AUnitWorkerGetOrder;

    public formationStartRadius : number;
    public formationDestiny : number;

    public lastAttackTargetUnit: IUnit | null;

    public formation : Formation2;

    constructor(hordeUnit: Unit) {
        super(hordeUnit);

        this.formationStartRadius = 3;
        this.formationDestiny     = 1 / 3;

        this._frame = null;

        // регистрируем героя
        opUnitIdToHeroObject.set(hordeUnit.Id, this);
    }

    public static GetHordeConfig () : UnitConfig {
        IUnit.GetHordeConfig.call(this);

        // добавляем кастомный обработчик команд
        if (!this._GetOrderWorkerSet) {
            this._GetOrderWorkerSet = true;

            const workerName = `${this.CfgPrefix}_Hero_GetOrderWorker`
            // Обертка для метода из плагина, чтобы работал "this"
            const workerWrapper = (u: Unit, cmdArgs: ACommandArgs) => IHero._GetOrderWorker.call(this, u, cmdArgs);
            // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
            UnitWorkersRegistry.Register(workerName, workerWrapper);
            // Объект-обработчик
            const workerObject = new ScriptUnitWorkerGetOrder();
            // Установка функции-обработчика
            ScriptUtils.SetValue(workerObject, "FuncName", workerName);
            // запоминаем базовый обработчик
            this._baseGetOrderWorker = this.Cfg.GetOrderWorker;
            // Установка обработчика в конфиг
            ScriptUtils.SetValue(this.Cfg, "GetOrderWorker", workerObject);
        }

        return this.Cfg;
    }

    protected static _InitHordeConfig() {
        IUnit._InitHordeConfig.call(this);

        // // добавляем герою держать позицию

        // // создаем кастомную команду

        // var customCommandCfgUid = this.CfgPrefix + "_Hero_CustomCommand";
        // var customCommand : UnitCommandConfig;
        // if (HordeContentApi.HasUnitCommand(customCommandCfgUid)) {
        //     customCommand = HordeContentApi.GetUnitCommand(customCommandCfgUid);
        // } else {
        //     customCommand = HordeContentApi.CloneConfig(HordeContentApi.GetUnitCommand("#UnitCommandConfig_HoldPosition"), customCommandCfgUid) as UnitCommandConfig;
        // }
        // // Настройка
        // ScriptUtils.SetValue(customCommand, "Name", "Активный навык");
        // ScriptUtils.SetValue(customCommand, "Tip", "Применить полученный активный навык");  // Это будет отображаться при наведении курсора
        // //ScriptUtils.SetValue(customCommand, "UnitCommand", CUSTOM_COMMAND_ID);
        // ScriptUtils.SetValue(customCommand, "Hotkey", "Q");
        // ScriptUtils.SetValue(customCommand, "ShowButton", true);
        // ScriptUtils.SetValue(customCommand, "PreferredPosition", createPoint(1, 1));
        // ScriptUtils.SetValue(customCommand, "AutomaticMode", null);
        // // Установка анимации выполняетс чуть другим способом:
        // ScriptUtils.GetValue(customCommand, "AnimationsCatalogRef").SetConfig(HordeContentApi.GetAnimationCatalog("#AnimCatalog_Command_View"));

        // // добавляем кастомный обработчик команд

        // setUnitGetOrderWorker(PluginRef, this.Cfg, this._OnCustomCommand);

        // // добавляем команду удержания позиции
        // if (!this.Cfg.AllowedCommands.ContainsKey(UnitCommand.HoldPosition)) {
        //     this.Cfg.AllowedCommands.Add(UnitCommand.HoldPosition, customCommand);
        // }

        // if (!this.Cfg.AllowedCommands.ContainsKey(UnitCommand.HoldPosition)) {
        //     this.Cfg.AllowedCommands.Add(UnitCommand.HoldPosition, HordeContentApi.GetUnitCommand("#UnitCommandConfig_HoldPosition"));
        // }
    }
    
    private static _GetOrderWorker(unit: Unit, commandArgs: ACommandArgs): boolean {
        var heroObj = opUnitIdToHeroObject.get(unit.Id);
        if (heroObj) {
            heroObj.OnOrder(commandArgs);
        }

        // if (unit.OrdersMind && unit.OrdersMind.IsUncontrollable) {
        //     return false;  // Юнит в данный момент является неуправляемым (например, в режиме паники)
        // }

        // if (commandArgs.CommandType == UnitCommand.HoldPosition) {
        //     // Была прожата кастомная команда
        //     broadcastMessage("Зафиксированно нажатие кастомной команды. Здесь можно выполнить любые действия.",
        //         createHordeColor(255, 255, 55, 55)
        //     );
        //     return true;
        // } else {
        //     // Это не кастомная команда - запуск обычного обработчика получения приказа
             return this._baseGetOrderWorker.GetOrder(unit, commandArgs);
        // }
        //return (new HordeClassLibrary.UnitComponents.Workers.BaseBuilding.Special.BaseBuildingGetOrder()).GetOrder(unit, commandArgs);
    }

    public IsDead() : boolean {
        return this.hordeUnit.IsDead;
    }

    public OnDestroyBuilding(buildingTemplate: BuildingTemplate, rarity: number, spawnUnitConfig: IConfig, spawnCount: number) : [IConfig, number] {
        return [spawnUnitConfig, spawnCount];
    }

    public OnAddToFormation(unit: IUnit) { }

    public OnEveryTick(gameTickNum: number): boolean {
        this._UpdateFrame();

        if (!IUnit.prototype.OnEveryTick.call(this, gameTickNum)) {
            return false;
        }

        return true;
    }

    public OnOrder(commandArgs: ACommandArgs) {
        // сохраняем последнего атакованного юнита
        if (commandArgs.CommandType == UnitCommand.Attack) {
            var targetHordeUnit = ActiveScena.UnitsMap.GetUpperUnit(commandArgs.TargetCell);
            if (targetHordeUnit) {
                this.lastAttackTargetUnit = new IUnit(targetHordeUnit);
            }
        }
    }

    private _frame : GeometryVisualEffect | null;
    private _UpdateFrame() {
        if (this.IsDead()) {
            if (this._frame) {
                this._frame.Free();
                this._frame = null;
            }
            return;
        }

        if (!this._frame) {
            this._MakeFrame();
        } else {
            this._frame.Position = this.hordeUnit.Position;

            // в лесу рамка должна быть невидимой
            let landscapeMap = ActiveScena.GetRealScena().LandscapeMap;
            var tile = landscapeMap.Item.get(this.hordeUnit.Cell);
            if (tile.Cfg.Type == TileType.Forest) {
                this._frame.Visible = false;
            } else {
                this._frame.Visible = true;
            }
        }
    }
    private _MakeFrame() {
        // Объект для низкоуровневого формирования геометрии
        let geometryCanvas = new GeometryCanvas();
        
        const width  = 32;
        const height = 32;

        var points = host.newArr(Stride_Vector2, 5)  as Stride_Vector2[];;
        points[0] = new Stride_Vector2(Math.round(-0.7*width),  Math.round(-0.7*height));
        points[1] = new Stride_Vector2(Math.round( 0.7*width),  Math.round(-0.7*height));
        points[2] = new Stride_Vector2(Math.round( 0.7*width),  Math.round( 0.7*height));
        points[3] = new Stride_Vector2(Math.round(-0.7*width),  Math.round( 0.7*height));
        points[4] = new Stride_Vector2(Math.round(-0.7*width),  Math.round(-0.7*height));

        geometryCanvas.DrawPolyLine(points,
            new Stride_Color(
                this.hordeUnit.Owner.SettlementColor.R,
                this.hordeUnit.Owner.SettlementColor.G,
                this.hordeUnit.Owner.SettlementColor.B),
            3.0, false);

        let ticksToLive = GeometryVisualEffect.InfiniteTTL;
        this._frame = spawnGeometry(ActiveScena, geometryCanvas.GetBuffers(), this.hordeUnit.Position, ticksToLive);
    }
}