import { createPoint, HordeColor, Point2D } from "library/common/primitives";
import { ACommandArgs, BattleController, BulletConfig, DrawLayer, GeometryCanvas, GeometryVisualEffect, Stride_Color, Stride_Vector2, StringVisualEffect, UnitCommand, UnitCommandConfig } from "library/game-logic/horde-types";
import { Cell } from "../../Core/Cell";
import { IHero } from "../IHero";
import { spawnGeometry, spawnString } from "library/game-logic/decoration-spawn";
import { createGameMessageWithNoSound } from "library/common/messages";
import { BuildingTemplate } from "../../Units/IFactory";
import { GameSettlement } from "../../Core/GameSettlement";
import { printObjectItems } from "library/common/introspection";
import { GameField } from "../../Core/GameField";

export enum SpellState {
    DROPPED = 0,
    PICKUP, 
    ACTIVATED,
    RELOAD,
    END
}

export class ISpell {
    // ссылки на глобальные объекты, которые используют все скиллы
    public static BuildingsTemplate: Array<BuildingTemplate>;
    public static NeutralSettlement: GameSettlement;
    public static EnemySettlement: GameSettlement;
    public static GameField: GameField;

    protected static _CfgPrefix             : string = "#BattleRoyale_";
    protected static _CfgUid                : string = "Hero_CustomCommand";
    protected static _UnitCommand           : UnitCommand = UnitCommand.HoldPosition;
    protected static _UnitCommandBaseCfg    : string = "#UnitCommandConfig_HoldPosition";
    protected static _AnimationsCatalogRef  : string = "#AnimCatalog_Command_View";
    protected static _EffectStrideColor     : Stride_Color = new Stride_Color(255, 255, 255, 255);
    protected static _EffectHordeColor      : HordeColor = new HordeColor(255, 255, 255, 255);
    protected static _Name                  : string = "Способность";
    protected static _Description           : string = "";

    private  _commandConfig         : UnitCommandConfig;
    private  _state                 : SpellState;
    private  _reloadTick            : number;
    private static _ProcessingTick : number = 0;
    private static _ProcessingTickModule : number = 25;
    private        _processingTick : number;
    private _textEffect             : StringVisualEffect | null;
    private _visualEffect           : GeometryVisualEffect | null;

    protected _hero                 : IHero | null;
    protected _heroUnitId           : number;
    protected _cell                 : Cell;
    protected _activateArgs         : ACommandArgs;
    protected _activatedGameTick    : number;
    protected _reloadPeriod         : number;
    protected _charges              : number;

    constructor(cell: Cell) {
        this._state             = SpellState.DROPPED;
        this._hero              = null;
        this._cell              = cell;
        this._textEffect        = null;
        this._visualEffect      = null;

        this._processingTick    = ISpell._ProcessingTick++ % ISpell._ProcessingTickModule;
        this._commandConfig     = this._MakeCommandConfig();
        // стандартные настройки для скиллов на карте
        this._charges           = 1;
        this._reloadPeriod      = 50;
    }

    public static GetName() : string {
        return this._Name;
    }

    public static GetDescription() : string {
        return this._Description;
    }

    public GetUnitCommand() : UnitCommand {
        return this.constructor['_UnitCommand'];
    }

    public GetCommandConfig() : UnitCommandConfig {
        return this._commandConfig;
    }

    public IsEnd() : boolean {
        return this._state == SpellState.END;
    }

    public Activate(activateArgs: ACommandArgs) : boolean {
        if (this._state == SpellState.PICKUP) {
            this._state             = SpellState.ACTIVATED;
            this._activatedGameTick = BattleController.GameTimer.GameFramesCounter;
            this._activateArgs      = activateArgs;

            // убираем видимость
            //this._hero?.hordeUnit.CommandsMind.HideCommand(this.GetUnitCommand());

            this._textEffect             = spawnString(ActiveScena, this.constructor['_Name'],
                Cell.ConvertHordePoint(this._hero?.hordeUnit.Cell as Point2D)
                .Scale(32).Add(new Cell(-2.5*this.constructor['_Name'].length, 0)).Round().ToHordePoint(), 150);
            this._textEffect.Height    = 18;
            this._textEffect.Color     = this.constructor['_EffectHordeColor'];
            this._textEffect.DrawLayer = DrawLayer.Birds;

            return true;
        } else {
            return false;
        }
    }

    public OnEveryTick(gameTickNum: number): boolean {
        if (gameTickNum % ISpell._ProcessingTickModule != this._processingTick) {
            return false;
        }

        // если владельца нет, то заканчиваем
        if (this._state != SpellState.ACTIVATED
            && this._hero
            && (this._hero.hordeUnit.Id != this._heroUnitId || this._hero.hordeUnit.IsDead)) {
            this._state = SpellState.END;
        }

        switch (this._state) {
            case SpellState.DROPPED:
                if (!this._OnEveryTickDropped(gameTickNum)) {
                    this._state = SpellState.PICKUP;
                }
                break;
            case SpellState.PICKUP:
                if (!this._OnEveryTickPickup(gameTickNum)) {
                    this._state = SpellState.ACTIVATED;
                }
                break;
            case SpellState.ACTIVATED:
                if (!this._OnEveryTickActivated(gameTickNum)) {
                    this._charges--;
                    if (this._charges == 0 || this._hero?.IsDead) {
                        this._state = SpellState.END;
                    } else {
                        this._reloadTick = gameTickNum + this._reloadPeriod;
                        this._state = SpellState.RELOAD;
                    }
                }
                break;
            case SpellState.RELOAD:
                if (!this._OnEveryTickReload(gameTickNum)) {
                    this._state = SpellState.PICKUP;
                }
                break;
            case SpellState.END:
                break;
        }

        return true;
    }

    public TryAttachToHero(hero : IHero) : boolean {
        if (hero.PickUpSpell(this)) {
            this._hero       = hero;
            this._heroUnitId = hero.hordeUnit.Id;
            return true;
        } else {
            return false;
        }
    }

    protected _MakeCommandConfig() : UnitCommandConfig {
        var customCommandCfgUid = this.constructor['_CfgPrefix'] + this.constructor['_CfgUid'];
        var customCommand : UnitCommandConfig;
        if (HordeContentApi.HasUnitCommand(customCommandCfgUid)) {
            customCommand = HordeContentApi.GetUnitCommand(customCommandCfgUid);
        } else {
            customCommand = HordeContentApi.CloneConfig(
                HordeContentApi.GetUnitCommand(this.constructor['_UnitCommandBaseCfg']), customCommandCfgUid) as UnitCommandConfig;
            // Настройка
            ScriptUtils.SetValue(customCommand, "Name", this.constructor['_Name']);
            ScriptUtils.SetValue(customCommand, "Tip", this.constructor['_Description']);  // Это будет отображаться при наведении курсора
            //ScriptUtils.SetValue(customCommand, "UnitCommand", CUSTOM_COMMAND_ID);
            ScriptUtils.SetValue(customCommand, "Hotkey", "Q");
            ScriptUtils.SetValue(customCommand, "ShowButton", true);
            ScriptUtils.SetValue(customCommand, "PreferredPosition", createPoint(1, 1));
            ScriptUtils.SetValue(customCommand, "AutomaticMode", null);
            // Установка анимации выполняетс чуть другим способом:
            ScriptUtils.GetValue(customCommand, "AnimationsCatalogRef")
                .SetConfig(HordeContentApi.GetAnimationCatalog(this.constructor['_AnimationsCatalogRef']));
        }

        return customCommand;
    }

    protected _OnEveryTickDropped(gameTickNum: number) {
        var isDropped = true;

        // создаем визуальный эффект

        if (!this._visualEffect) {
            this._MakeVisualEffect();
        }

        // обладатель пришел извне

        if (this._hero) {
            isDropped = false;
        } else {
            // обладатель стоит на клетке

            var upperHordeUnit = ActiveScena.UnitsMap.GetUpperUnit(this._cell.ToHordePoint());
            if (upperHordeUnit) {
                var hero = IHero.OpUnitIdToHeroObject.get(upperHordeUnit.Id);
                if (hero && !this.TryAttachToHero(hero)) {
                    // оповещение о способности
                    hero.hordeUnit.Owner.Messages.AddMessage(
                        createGameMessageWithNoSound(
                            "Вам доступна способность: " + this.constructor['_Name'] + "\n" + this.constructor['_Description']));
                    isDropped = false;
                }
            }
        }

        // удалить визуальный эффект
        if (!isDropped) {
            this._FreeVisualEffect();
        }

        return isDropped;
    }

    protected _OnEveryTickPickup(gameTickNum: number) {
        return true;
    }

    protected _OnEveryTickActivated(gameTickNum: number) {
        return true;
    }

    protected _OnEveryTickReload(gameTickNum: number) {
        return gameTickNum < this._reloadTick;
    }

    private _MakeVisualEffect() {
        let geometryCanvas = new GeometryCanvas();
        const width  = 32;
        const height = 32;
        var points = host.newArr(Stride_Vector2, 5)  as Stride_Vector2[];;
        points[0] = new Stride_Vector2(Math.round(-0.6*width),  Math.round(-0.6*height));
        points[1] = new Stride_Vector2(Math.round( 0.6*width),  Math.round(-0.6*height));
        points[2] = new Stride_Vector2(Math.round( 0.6*width),  Math.round( 0.6*height));
        points[3] = new Stride_Vector2(Math.round(-0.6*width),  Math.round( 0.6*height));
        points[4] = new Stride_Vector2(Math.round(-0.6*width),  Math.round(-0.6*height));

        geometryCanvas.DrawPolyLine(points, this.constructor['_EffectStrideColor'], 2.0, false);

        let ticksToLive = GeometryVisualEffect.InfiniteTTL;
        this._visualEffect = spawnGeometry(ActiveScena, geometryCanvas.GetBuffers(), this._cell.Scale(32).Add(new Cell(16, 16)).ToHordePoint(), ticksToLive);

        this._textEffect           = spawnString(ActiveScena, this.constructor['_Name'],
            this._cell.Scale(32).Add(new Cell(-2.5*this.constructor['_Name'].length, -20)).Round().ToHordePoint(), ticksToLive);
        this._textEffect.Height    = 18;
        this._textEffect.Color     = this.constructor['_EffectHordeColor'];
        this._textEffect.DrawLayer = DrawLayer.Birds;
    }

    private _FreeVisualEffect() {
        this._visualEffect?.Free();
        this._visualEffect = null;
        
        this._textEffect?.Free();
        this._textEffect = null;
    }
}
