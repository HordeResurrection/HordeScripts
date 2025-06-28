import { ACommandArgs, ScriptUnitWorkerGetOrder, Unit, UnitCommand } from "library/game-logic/horde-types";
import { ISpell } from "./ISpell";
import { GlobalVars } from "../GlobalData";
import { IReviveUnit } from "../Types/IReviveUnit";
import { createGameMessageWithNoSound } from "library/common/messages";
import { createHordeColor } from "library/common/primitives";
import { log } from "library/common/logging";
import { printObjectItems } from "library/common/introspection";

export class IUnitCaster extends IReviveUnit {
    private static _OpUnitIdToUnitCasterObject : Map<number, IUnitCaster> = new Map<number, IUnitCaster>();
    private static _GetOrderWorkerSet : boolean = false;
    private static _baseGetOrderWorker : HordeClassLibrary.UnitComponents.Workers.Interfaces.Special.AUnitWorkerGetOrder;

    private static _SpellsMaxCount : number = 5;

    public static InitConfig() {
        // удаляем конфиг, чтобы был скопирован обработчик из базового конфига
        if (HordeContentApi.HasUnitConfig(this.CfgUid)) {
            HordeContentApi.RemoveConfig(HordeContentApi.GetUnitConfig(this.CfgUid));
        }

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
    private _causeDamageHandler : any;
    private _takeDamageHandler : any;

    constructor(hordeUnit: Unit, teamNum: number) {
        super(hordeUnit, teamNum);

        this._spells = new Array<ISpell>();
        IUnitCaster._OpUnitIdToUnitCasterObject.set(this.unit.Id, this);

        this.unit.CommandsMind.HideCommand(UnitCommand.Attack);
        this.unit.CommandsMind.HideCommand(UnitCommand.MoveToPoint);
        this.unit.CommandsMind.HideCommand(UnitCommand.Cancel);

        var that = this;
        this._causeDamageHandler = this.unit.EventsMind.CauseDamage.connect((sender, args) => that.OnCauseDamage(sender, args));
        this._takeDamageHandler  = this.unit.EventsMind.TakeDamage.connect((sender, args) => that.OnTakeDamage(sender, args));
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

        this._causeDamageHandler.disconnect();
        this._takeDamageHandler.disconnect();
        var that = this;
        this._causeDamageHandler = this.unit.EventsMind.CauseDamage.connect((sender, args) => that.OnCauseDamage(sender, args));
        this._takeDamageHandler  = this.unit.EventsMind.TakeDamage.connect((sender, args) => that.OnTakeDamage(sender, args));

        IUnitCaster._OpUnitIdToUnitCasterObject.set(this.unit.Id, this);
        this._spells.forEach(spell => spell.OnReplacedCaster(this));
    }
}
