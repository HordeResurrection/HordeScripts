import { createPoint } from "library/common/primitives";
import { BattleController, GeometryCanvas, GeometryVisualEffect, Stride_Color, Stride_Vector2, UnitCommandConfig } from "library/game-logic/horde-types";
import { Cell } from "../../Core/Cell";
import { IHero } from "../IHero";
import { spawnGeometry } from "library/game-logic/decoration-spawn";
import { createGameMessageWithNoSound } from "library/common/messages";

export enum SpellState {
    DROPPED = 0,
    PICKUP, 
    ACTIVATED,
    END
}

export class ISpell {
    protected static CfgPrefix : string = "#BattleRoyale_";
    protected static CfgUid    : string = "Hero_CustomCommand";

    protected _name            : string = "Способность";
    protected _description     : string = "";

    private static ProcessingTick : number = 0;
    private static ProcessingTickModule : number = 25;
    private   _processingTick : number;

    private _visualEffect : GeometryVisualEffect | null;

    protected _state      : SpellState;
    protected _targetCell : Cell;
    protected _hero       : IHero | null;
    protected _cell       : Cell;
    protected _activatedGameTick : number;

    constructor(cell: Cell) {
        this._state             = SpellState.DROPPED;
        this._hero              = null;
        this._cell              = cell;
        this._visualEffect      = null;

        this._processingTick    = ISpell.ProcessingTick++ % ISpell.ProcessingTickModule;
    }

    public static GetHordeConfig () : UnitCommandConfig {
        var customCommandCfgUid = this.CfgPrefix + this.CfgUid;
        var customCommand : UnitCommandConfig;
        if (HordeContentApi.HasUnitCommand(customCommandCfgUid)) {
            customCommand = HordeContentApi.GetUnitCommand(customCommandCfgUid);
        } else {
            customCommand = HordeContentApi.CloneConfig(HordeContentApi.GetUnitCommand("#UnitCommandConfig_Capture"), customCommandCfgUid) as UnitCommandConfig;
            // Настройка
            ScriptUtils.SetValue(customCommand, "Name", "Активный навык");
            ScriptUtils.SetValue(customCommand, "Tip", "Применить полученный активный навык");  // Это будет отображаться при наведении курсора
            //ScriptUtils.SetValue(customCommand, "UnitCommand", CUSTOM_COMMAND_ID);
            ScriptUtils.SetValue(customCommand, "Hotkey", "Q");
            ScriptUtils.SetValue(customCommand, "ShowButton", true);
            ScriptUtils.SetValue(customCommand, "PreferredPosition", createPoint(1, 1));
            ScriptUtils.SetValue(customCommand, "AutomaticMode", null);
            // Установка анимации выполняетс чуть другим способом:
            ScriptUtils.GetValue(customCommand, "AnimationsCatalogRef").SetConfig(HordeContentApi.GetAnimationCatalog("#AnimCatalog_Command_View"));
        }

        return customCommand;
    }

    public IsEnd() : boolean {
        return this._state == SpellState.END;
    }

    public Activate(targetCell: Cell) {
        this._state             = SpellState.ACTIVATED;
        this._activatedGameTick = BattleController.GameTimer.GameFramesCounter;
        this._targetCell        = targetCell;
    }

    public OnEveryTick(gameTickNum: number): boolean {
        if (gameTickNum % ISpell.ProcessingTickModule != this._processingTick) {
            return false;
        }

        if (this._state == SpellState.DROPPED) {
            // создаем визуальный эффект

            if (!this._visualEffect) {
                // Объект для низкоуровневого формирования геометрии
                let geometryCanvas = new GeometryCanvas();
                
                const width  = 32;
                const height = 32;
        
                var points = host.newArr(Stride_Vector2, 5)  as Stride_Vector2[];;
                points[0] = new Stride_Vector2(Math.round(-0.6*width),  Math.round(-0.6*height));
                points[1] = new Stride_Vector2(Math.round( 0.6*width),  Math.round(-0.6*height));
                points[2] = new Stride_Vector2(Math.round( 0.6*width),  Math.round( 0.6*height));
                points[3] = new Stride_Vector2(Math.round(-0.6*width),  Math.round( 0.6*height));
                points[4] = new Stride_Vector2(Math.round(-0.6*width),  Math.round(-0.6*height));
        
                geometryCanvas.DrawPolyLine(points,
                    new Stride_Color(255, 255, 255, 255),
                    3.0, false);
        
                let ticksToLive = GeometryVisualEffect.InfiniteTTL;
                this._visualEffect = spawnGeometry(ActiveScena, geometryCanvas.GetBuffers(), this._cell.Scale(32).Add(new Cell(16, 16)).ToHordePoint(), ticksToLive);
            }

            // ищем обладателя способности

            var upperHordeUnit = ActiveScena.UnitsMap.GetUpperUnit(this._cell.ToHordePoint());
            if (upperHordeUnit) {
                var hero = IHero.OpUnitIdToHeroObject.get(upperHordeUnit.Id);
                if (hero) {
                    this._hero = hero;
                    this._hero.PickUpSpell(this);

                    // оповещение о способности
                    this._hero.hordeUnit.Owner.Messages.AddMessage(createGameMessageWithNoSound("Вам доступна способность: " + this._name + "\n" + this._description));

                    // удалить визуальный эффект
                    this._visualEffect?.Free();
                    this._visualEffect = null;

                    this._state = SpellState.PICKUP;
                }
            }
        }

        return true;
    }
}
