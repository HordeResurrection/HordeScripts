import { ACommandArgs, ScriptUnitWorkerGetOrder, Unit } from "library/game-logic/horde-types";
import { ISpell } from "./ISpell";
import { GlobalVars } from "../GlobalData";
import { IReviveUnit } from "../Types/IReviveUnit";

export class IUnitCaster extends IReviveUnit {
    private static _OpUnitIdToUnitCasterObject : Map<number, IUnitCaster> = new Map<number, IUnitCaster>();
    private static _GetOrderWorkerSet : boolean = false;
    private static _baseGetOrderWorker : HordeClassLibrary.UnitComponents.Workers.Interfaces.Special.AUnitWorkerGetOrder;

    public static InitConfig() {
        super.InitConfig();

        var cfg = GlobalVars.configs[this.CfgUid];

        // добавляем кастомный обработчик команд
        if (!this._GetOrderWorkerSet) {
            this._GetOrderWorkerSet = true;

            const workerName = `${this.CfgUid}_Caster_GetOrderWorker`
            // Обертка для метода из плагина, чтобы работал "this"
            const workerWrapper = (u: Unit, cmdArgs: ACommandArgs) => this._GetOrderWorker.call(this, u, cmdArgs);
            // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
            UnitWorkersRegistry.Register(workerName, workerWrapper);
            // Объект-обработчик
            const workerObject = new ScriptUnitWorkerGetOrder();
            // Установка функции-обработчика
            ScriptUtils.SetValue(workerObject, "FuncName", workerName);
            // запоминаем базовый обработчик
            this._baseGetOrderWorker = cfg.GetOrderWorker;
            // Установка обработчика в конфиг
            ScriptUtils.SetValue(cfg, "GetOrderWorker", workerObject);
        }
    }

    private static _GetOrderWorker(unit: Unit, commandArgs: ACommandArgs): boolean {
        var heroObj = this._OpUnitIdToUnitCasterObject.get(unit.Id);
        if (heroObj) {
            if (!heroObj.OnOrder(commandArgs)) {
                return true;
            }
        }

        // запуск обычного обработчика получения приказа
        return this._baseGetOrderWorker.GetOrder(unit, commandArgs);
    }

    protected _spells : Array<ISpell>;

    constructor(hordeUnit: Unit, teamNum: number) {
        super(hordeUnit, teamNum);

        this._spells = new Array<ISpell>();
        IUnitCaster._OpUnitIdToUnitCasterObject.set(this.unit.Id, this);

        // \todo вернуть когда починят горячие клавиши
        //this.unit.CommandsMind.HideCommand(UnitCommand.MoveToPoint);
        //this.unit.CommandsMind.HideCommand(UnitCommand.Attack);
        //this.unit.CommandsMind.HideCommand(UnitCommand.Cancel);
    }

    public AddSpell(spellType: typeof ISpell) : boolean {
        // если добавляется тот же скилл, то прокачиваем скилл
        var spellNum;
        for (spellNum = 0; spellNum < this._spells.length; spellNum++) {
            if (this._spells[spellNum].GetUid() == spellType.GetUid()) {
                break;
            }
        }

        if (spellNum < this._spells.length) {
            this._spells[spellNum].LevelUp();
            return true;
        } else if (spellNum == this._spells.length && this._spells.length < 4) {
            this._spells.push(new spellType(this));
            return true;
        } else {
            return false;
        }
    }

    public Spells() : Array<ISpell> {
        return this._spells;
    }

    public OnEveryTick(gameTickNum: number): boolean {
        this._spells.forEach(spell => spell.OnEveryTick(gameTickNum));

        return super.OnEveryTick(gameTickNum);
    }

    public OnOrder(commandArgs: ACommandArgs) {
        for (var spellNum = 0; spellNum < this._spells.length; spellNum++) {
            if (this._spells[spellNum].GetUnitCommand() != commandArgs.CommandType) {
                continue;
            }

            this._spells[spellNum].Activate(commandArgs);
            return false;
        }

        return true;
    }

    public ReplaceUnit(unit: Unit): void {
        super.ReplaceUnit(unit);

        IUnitCaster._OpUnitIdToUnitCasterObject.set(this.unit.Id, this);
        this._spells.forEach(spell => spell.OnReplacedCaster(this));
    }
}
