import { ACommandArgs, ScriptUnitWorkerGetOrder, Unit, UnitCommand } from "library/game-logic/horde-types";
import { ISpell, SpellState } from "./ISpell";
import { IReviveUnit } from "../Types/IReviveUnit";
import { createGameMessageWithNoSound } from "library/common/messages";
import { createHordeColor } from "library/common/primitives";
import { printObjectItems } from "library/common/introspection";
import { log } from "library/common/logging";

var opUnitCfgUidToBaseWorker : Map<string, HordeClassLibrary.UnitComponents.Workers.Interfaces.Special.AUnitWorkerGetOrder> = new Map<string, HordeClassLibrary.UnitComponents.Workers.Interfaces.Special.AUnitWorkerGetOrder>();
var opUnitIdToCasterObj : Map<number, IUnitCaster> = new Map<number, IUnitCaster>();

export class IUnitCaster extends IReviveUnit {
    private static _SpellsMaxCount : number = 5;
    private static _WorkerObject : ScriptUnitWorkerGetOrder | null = null;

    public static InitConfig() {
        // удаляем конфиг, чтобы был скопирован обработчик из базового конфига
        if (HordeContentApi.HasUnitConfig(this.CfgUid)) {
            HordeContentApi.RemoveConfig(HordeContentApi.GetUnitConfig(this.CfgUid));
        }

        super.InitConfig();

        if (!this._WorkerObject) {
            const workerName = `${this.CfgUid}_Caster_GetOrderWorker`
            // Обертка для метода из плагина, чтобы работал "this"
            const workerWrapper = (u: Unit, cmdArgs: ACommandArgs) => this._GetOrderWorker.call(this, u, cmdArgs);
            // Прокидываем доступ к функции-обработчику в .Net через глобальную переменную
            UnitWorkersRegistry.Register(workerName, workerWrapper);
            // Объект-обработчик
            this._WorkerObject = new ScriptUnitWorkerGetOrder();
            // Установка функции-обработчика
            ScriptUtils.SetValue(this._WorkerObject, "FuncName", workerName);
        }
    }

    private static _GetOrderWorker(unit: Unit, commandArgs: ACommandArgs): boolean {
        var heroObj = opUnitIdToCasterObj.get(unit.Id);
        
        if (!heroObj) {
            return unit.Cfg.GetOrderWorker.GetOrder(unit, commandArgs);
        }

        if (!heroObj.OnOrder(commandArgs)) {
            return true;
        }

        // запуск обычного обработчика получения приказа
        return (opUnitCfgUidToBaseWorker.get(unit.Cfg.Uid) as ScriptUnitWorkerGetOrder)
            .GetOrder(unit, commandArgs);
    }

    protected _spells : Array<ISpell>;
    private _causeDamageHandler : any;
    private _takeDamageHandler : any;

    constructor(hordeUnit: Unit, teamNum: number) {
        super(hordeUnit, teamNum);

        this._spells = new Array<ISpell>();
        this._SetWorker();
        
        this.unit.CommandsMind.HideCommand(UnitCommand.Attack);
        this.unit.CommandsMind.HideCommand(UnitCommand.MoveToPoint);
        this.unit.CommandsMind.HideCommand(UnitCommand.Cancel);

        var that = this;
        this._causeDamageHandler = this.unit.EventsMind.CauseDamage.connect((sender, args) => that.OnCauseDamage(sender, args));
        this._takeDamageHandler  = this.unit.EventsMind.TakeDamage.connect((sender, args) => that.OnTakeDamage(sender, args));
    }

    private _SetWorker () {
        opUnitIdToCasterObj.set(this.unit.Id, this);
        if (!opUnitCfgUidToBaseWorker.has(this.unit.Cfg.Uid)) {
            opUnitCfgUidToBaseWorker.set(this.unit.Cfg.Uid, this.unit.Cfg.GetOrderWorker);
            ScriptUtils.SetValue(this.unit.Cfg, "GetOrderWorker", this.constructor["_WorkerObject"]);
        }
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
            if (this._spells[spellNum].LevelUp()) {
                let msg = createGameMessageWithNoSound("Способность улучшена!", createHordeColor(255, 255, 100, 100));
                this.unit.Owner.Messages.AddMessage(msg);
                return true;
            } else {
                let msg = createGameMessageWithNoSound("Способность максимального уровня!", createHordeColor(255, 255, 100, 100));
                this.unit.Owner.Messages.AddMessage(msg);
                return false;
            }
        } else if (spellNum == this._spells.length && this._spells.length < this.constructor["_SpellsMaxCount"]) {
            this._spells.push(new spellType(this));
            return true;
        } else {
            let msg = createGameMessageWithNoSound("Нет свободных слотов!", createHordeColor(255, 255, 100, 100));
            this.unit.Owner.Messages.AddMessage(msg);
            return false;
        }
    }

    public Spells() : Array<ISpell> {
        return this._spells;
    }

    public OnEveryTick(gameTickNum: number): boolean {
        this._spells.forEach(spell => spell.OnEveryTick(gameTickNum));
        for (var spellNum = 0; spellNum < this._spells.length; spellNum++) {
            if (this._spells[spellNum].State() == SpellState.WAIT_DELETE) {
                this._spells.splice(spellNum--, 1);
            }
        }

        return super.OnEveryTick(gameTickNum);
    }

    public OnCauseDamage(sender: any, args: any) {
        this._spells.forEach(spell => spell.OnCauseDamage(args.VictimUnit, args.Damage, args.EffectiveDamage, args.HurtType));
    }

    public OnTakeDamage(sender: any, args: any) {
        this._spells.forEach(spell => spell.OnTakeDamage(args.AttackerUnit, args.Damage, args.HurtType));
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

        this.unit.CommandsMind.HideCommand(UnitCommand.Attack);
        this.unit.CommandsMind.HideCommand(UnitCommand.MoveToPoint);
        this.unit.CommandsMind.HideCommand(UnitCommand.Cancel);

        this._SetWorker();

        this._causeDamageHandler.disconnect();
        this._takeDamageHandler.disconnect();
        var that = this;
        this._causeDamageHandler = this.unit.EventsMind.CauseDamage.connect((sender, args) => that.OnCauseDamage(sender, args));
        this._takeDamageHandler  = this.unit.EventsMind.TakeDamage.connect((sender, args) => that.OnTakeDamage(sender, args));

        this._spells.forEach(spell => spell.OnReplacedCaster(this));
    }
}
