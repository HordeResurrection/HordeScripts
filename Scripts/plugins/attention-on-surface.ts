import HordePluginBase from "./base-plugin";
import { BattleController, Scena, VisualEffectConfig, VisualEffectFogOfWarMode, WorldConstants } from "library/game-logic/horde-types";
import * as primitives from "library/common/primitives";
import * as decorations from "library/game-logic/decoration-spawn";

type AttentionEventArgs = HordeResurrection.Engine.Logic.Battle.BattleController.AttentionEventArgs;


/**
 * Плагин, который создаёт декорацию-метку в том месте на карте, где был зафиксирован Attention-клик (alt-клик)
 */
export class AttentionOnSurfacePlugin extends HordePluginBase {
    private realScena: Scena;
    private smokeDecorationCfg: VisualEffectConfig;


    public constructor() {
        super("Attention on Surface");
        this.smokeDecorationCfg = HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_AttentionMark");
        this.realScena = ActiveScena.GetRealScena();
    }


    public onFirstRun() {
        this._setupAttentionClicksHandler();
        this._setupAttentionReceiverHandler();
    }

    /**
     * Настройка обработки alt-кликов (исходящий Attention).
     */
    private _setupAttentionClicksHandler() {
        if (this.globalStorage.attentionClickHandler) {
            this.globalStorage.attentionClickHandler.disconnect();
        }

        let that = this;
        let handler = BattleController.AttentionSent.connect((sender, args) => that._attentionHandler(sender, args!));
        this.globalStorage.attentionClickHandler = handler;
    }

    /**
     * Настройка обработки alt-сообщений (входящий Attention).
     */
    private _setupAttentionReceiverHandler() {
        if (this.globalStorage.attentionReceivedHandler) {
            this.globalStorage.attentionReceivedHandler.disconnect();
        }

        let that = this;
        let handler = BattleController.AttentionReceived.connect((sender, args) => that._attentionHandler(sender, args!));
        this.globalStorage.attentionReceivedHandler = handler;
    }

    /**
     * Обработчик Attention-событий.
     */
    private _attentionHandler(sender: any, args: AttentionEventArgs) {
        try {
            let info: AttentionClickInfo = {
                tick: BattleController.GameTimer.GameFramesCounter,
                player: args.InitiatorPlayer,
                cell: args.Cell
            };
            
            let activePlayer = HordeResurrection.Engine.Logic.Main.PlayersController.ActivePlayer;
            if (!args.RecepientSettlements.Contains(activePlayer.GetWorkUISettlement())) {
                return;
            }

            this._createDecoration(info);
        } catch (ex) {
            this.log.exception(ex);
        }
    }

    /**
     * Создание декораций для Attention-событий.
     */
    private _createDecoration(attentionInfo: AttentionClickInfo) {
        let position = new primitives.Point2D(
            attentionInfo.cell.X * WorldConstants.CellSize + WorldConstants.HalfCellSize,
            attentionInfo.cell.Y * WorldConstants.CellSize + WorldConstants.HalfCellSize);

        let decoration = decorations.spawnDecoration(this.realScena, this.smokeDecorationCfg, position);
        decoration.TintColor = attentionInfo.player.GetRealSettlement().SettlementColor;
        decoration.ScaleX = 2;
        decoration.ScaleY = 2;
        decoration.FogOfWarMode = VisualEffectFogOfWarMode.Ignore;
    }
}


/**
 * Данные Attention-клика.
 */
type AttentionClickInfo = {
    tick: number,
    player: any,
    cell: any
}
