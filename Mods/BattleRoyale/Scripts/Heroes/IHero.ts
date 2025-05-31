import { ACommandArgs, GeometryCanvas, GeometryVisualEffect, ScriptUnitWorkerGetOrder, Stride_Color, Stride_Vector2, TileType, Unit, UnitCommand, UnitConfig, UnitFlags } from "library/game-logic/horde-types";
import { IUnit } from "../Units/IUnit";
import { IConfig } from "../Units/IConfig";
import { spawnGeometry } from "library/game-logic/decoration-spawn";
import { Formation2 } from "../Core/Formation2";
import { BuildingTemplate } from "../Units/IFactory";
import { Cell } from "../Core/Cell";
import { ISpell } from "./Spells/ISpell";
import { Spell_Teleportation } from "./Spells/Spell_Teleportation";
import { log } from "library/common/logging";

export class IHero extends IUnit {
    public static OpUnitIdToHeroObject : Map<number, IHero> = new Map<number, IHero>();
    /// скилл героя
    public static SpellType : typeof ISpell = Spell_Teleportation;
    protected static SpellReload : number = 50 * 60;

    private static _GetOrderWorkerSet : boolean = false;
    private static _baseGetOrderWorker : HordeClassLibrary.UnitComponents.Workers.Interfaces.Special.AUnitWorkerGetOrder;

    private _spell : ISpell | null;
    private _spellReloadTick : number;

    // настройки формации - начальный радиус
    protected static _formationStartRadius : number = 3;
    // настройки формации - плотность орбит
    protected static _formationDestiny : number = 1 / 3;
    
    // формация
    protected _formation : Formation2;

    constructor(hordeUnit: Unit) {
        super(hordeUnit);

        this._frame = null;
        this._spell  = null;

        // регистрируем героя
        IHero.OpUnitIdToHeroObject.set(hordeUnit.Id, this);
        
        // создаем класс формации
        this._formation = new Formation2(
            Cell.ConvertHordePoint(this.hordeUnit.Cell),
            this.constructor['_formationStartRadius'],
            this.constructor['_formationDestiny']);

        this._spellReloadTick = 0;
    }

    public static GetHordeConfig () : UnitConfig {
        super.GetHordeConfig();

        // добавляем кастомный обработчик команд
        if (!this._GetOrderWorkerSet) {
            this._GetOrderWorkerSet = true;

            const workerName = `${this.CfgPrefix}_Hero_GetOrderWorker`
            // Обертка для метода из плагина, чтобы работал "this"
            const workerWrapper = (u: Unit, cmdArgs: ACommandArgs) => this._GetOrderWorker.call(this, u, cmdArgs);
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
        super._InitHordeConfig();

        // формируем описание характеристик

        ScriptUtils.SetValue(this.Cfg, "Description",  this.Cfg.Description +
            (this.Cfg.Description == "" ? "" : "\n") +
            "  здоровье " + this.Cfg.MaxHealth + "\n" +
            "  броня " + this.Cfg.Shield + "\n" +
            (
                this.Cfg.MainArmament
                ? "  атака " + this.Cfg.MainArmament.ShotParams.Damage + "\n" +
                "  радиус атаки " + this.Cfg.MainArmament.Range + "\n"
                : ""
            ) +
            "  скорость бега " + this.Cfg.Speeds.Item.get(TileType.Grass) + " (в лесу " + this.Cfg.Speeds.Item.get(TileType.Forest) + ")" + "\n"
            + (this.Cfg.Flags.HasFlag(UnitFlags.FireResistant) || this.Cfg.Flags.HasFlag(UnitFlags.MagicResistant)
                ? "  иммунитет к " + (this.Cfg.Flags.HasFlag(UnitFlags.FireResistant) ? "огню " : "") + 
                    (this.Cfg.Flags.HasFlag(UnitFlags.MagicResistant) ? "магии " : "") + "\n"
                : "")
            + "  радиус видимости " + this.Cfg.Sight + " (в лесу " + this.Cfg.ForestVision + ")\n"
            + "\nОбладает способностью: " + this.SpellType.GetName() + "\n"
            + this.SpellType.GetDescription()
            );
    }
    
    private static _GetOrderWorker(unit: Unit, commandArgs: ACommandArgs): boolean {
        var heroObj = IHero.OpUnitIdToHeroObject.get(unit.Id);
        if (heroObj) {
            if (!heroObj.OnOrder(commandArgs)) {
                return true;
            }
        }

        // запуск обычного обработчика получения приказа
        return this._baseGetOrderWorker.GetOrder(unit, commandArgs);
    }

    public IsDead() : boolean {
        return this.hordeUnit.IsDead;
    }

    public OnDestroyBuilding(buildingTemplate: BuildingTemplate, rarity: number, spawnUnitConfig: IConfig, spawnCount: number) : [IConfig, number] {
        return [spawnUnitConfig, spawnCount];
    }

    public AddUnitToFormation(unit: IUnit) {
        this._formation.AddUnits([ unit ]);
    }

    public OnEveryTick(gameTickNum: number): boolean {
        this._spell?.OnEveryTick(gameTickNum);
        this._formation.OnEveryTick(gameTickNum);
        this._UpdateFrame();

        if (!super.OnEveryTick(gameTickNum)) {
            return false;
        }

        // логика перезарядки способности
        if (this._spell) {
            if (this._spell.IsEnd()) {
                this.hordeUnit.CommandsMind.RemoveAddedCommand(this._spell.GetUnitCommand());
                this._spellReloadTick = gameTickNum + this.constructor['SpellReload'];
                this._spell = null;
            }
        } else if (this._spellReloadTick < gameTickNum) {
            var spell : ISpell = new this.constructor['SpellType'](Cell.ConvertHordePoint(this.hordeUnit.Cell));
            spell.TryAttachToHero(this);
        }

        this._formation.SetCenter(Cell.ConvertHordePoint(this.hordeUnit.Cell));

        return true;
    }

    public OnOrder(commandArgs: ACommandArgs) {
        // сохраняем последнего атакованного юнита
        if (commandArgs.CommandType == UnitCommand.Attack) {
            var targetHordeUnit = ActiveScena.UnitsMap.GetUpperUnit(commandArgs.TargetCell);
            if (targetHordeUnit) {
                this._formation.SetAttackTarget(new IUnit(targetHordeUnit));
            } else {
                this._formation.SmartAttackCell(Cell.ConvertHordePoint(commandArgs.TargetCell));
            }
        }
        else if (commandArgs.CommandType == UnitCommand.Cancel) {
            this._formation.SmartMoveToTargetCommand();
        }
        // кастомная команда
        else if (this._spell && commandArgs.CommandType == this._spell.GetUnitCommand()) {
            this._spell.Activate(commandArgs);
            return false;
        }

        return true;
    }

    public PickUpSpell(spell: ISpell) : boolean {
        if (!this._spell) {
            this._spell = spell;
            this.hordeUnit.CommandsMind.AddCommand(this._spell.GetUnitCommand(), spell.GetCommandConfig());
            return true;
        } else {
            return false;
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
