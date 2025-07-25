import { ACommandArgs, BattleController, DrawLayer, Stride_Color, StringVisualEffect, Unit, UnitCommand, UnitCommandConfig, UnitConfig, UnitHurtType } from "library/game-logic/horde-types";
import { HordeColor, ResourcesAmount } from "library/common/primitives";
import { spawnString } from "library/game-logic/decoration-spawn";
import { IUnitCaster } from "./IUnitCaster";
import { Cell } from "../Types/Geometry";
import { GlobalVars } from "../GlobalData";
import { formatStringStrict } from "../Utils";
import { log } from "library/common/logging";

export enum SpellState {
    READY,
    ACTIVATED,
    ACTIVATED_DELAY,
    WAIT_CHARGE,
    WAIT_DELETE
}

export class ISpell {
    protected static _ProcessingModule : number = 25;
    protected static _ProcessingTack   : number = 0;

    protected static _MaxLevel                      : number = 0;
    protected static _NamePrefix                    : string = "Способность";
    protected static _DescriptionTemplate           : string = "Описание.";
    protected static _DescriptionParamsPerLevel     : Array<Array<any>> = [[]];

    protected static _ButtonUidPrefix               : string = "#BattleRoyale_";
    protected static _ButtonUid                     : string = "Spell_CustomCommand";
    protected static _ButtonCommandTypeBySlot       : Array<UnitCommand> = [UnitCommand.OneClick_Custom_0, UnitCommand.OneClick_Custom_1, UnitCommand.OneClick_Custom_2, UnitCommand.OneClick_Custom_3, UnitCommand.OneClick_Custom_4];
    protected static _ButtonCommandBaseUid          : string = "#UnitCommandConfig_HoldPosition";
    protected static _ButtonAnimationsCatalogUid    : string = "#AnimCatalog_Command_View";
    protected static _ButtonPositionBySlot          : Array<Cell> = [new Cell(0, 0), new Cell(0, 1), new Cell(1, 0), new Cell(1, 1), new Cell(2, 1)];
    protected static _ButtonHotkeyBySlot            : Array<string> = ["Q", "W", "E", "R", "T"];
    protected static _SpellCost                     : ResourcesAmount = new ResourcesAmount(500, 0, 0, 0);
    protected static _SpellPreferredProductListPosition : Cell = new Cell(0, 0);

    protected static _EffectStrideColor             : Stride_Color = new Stride_Color(255, 255, 255, 255);
    protected static _EffectHordeColor              : HordeColor = new HordeColor(255, 255, 255, 255);

    protected static _ChargesReloadTime             : number = 50*60;
    protected static _ActivateDelay                 : number = 50;
    protected static _ChargesCountPerLevel          : Array<number> = [ 1 ];

    /** флаг, что расходник */
    protected static _IsConsumables                 : boolean = false;

    protected static _IsPassive : boolean = false;

    public static GetName(level: number) : string {
        if (level == -1) {
            return this._NamePrefix;
        } else {
            return this._NamePrefix + " " + (level + 1);
        }
    }

    public static IsConsumables() {
        return this._IsConsumables;
    }

    private static _IsDescriptionInit = false;
    public static GetDescription(in_level: number) : string {
        if (!this._IsDescriptionInit) {
            this._IsDescriptionInit = true;

            if (this._ChargesCountPerLevel.length == 0) {
                // пассивка
            } else if (this._ChargesCountPerLevel.length == 1) {
                // не зависит от уровня
                this._DescriptionTemplate += " Зарядов " + this._ChargesCountPerLevel[0] + ", перезарядка каждого "
                    + (this._ChargesReloadTime / 50) + " сек.";
            } else {
                this._DescriptionTemplate += " Зарядов {" + this._DescriptionParamsPerLevel.length + "}, перезарядка каждого "
                    + (this._ChargesReloadTime / 50) + " сек.";
                this._DescriptionParamsPerLevel.push(this._ChargesCountPerLevel);
            }
        }

        var description : string = "";
        if (in_level == -1) {
            var nParams = this._DescriptionParamsPerLevel.length;
            var params  = new Array<any>(nParams);
            for (var i = 0; i < nParams; i++) {
                params[i] = "";
                for (var level = 0; level <= this._MaxLevel; level++) {
                    params[i] += this._DescriptionParamsPerLevel[i][level];
                    if (level != this._MaxLevel) {
                        params[i] += "/";
                    }
                }
            }
            description += formatStringStrict(this._DescriptionTemplate, params);
        } else {
            var nParams = this._DescriptionParamsPerLevel.length;
            var params  = new Array<any>(nParams);
            for (var i = 0; i < nParams; i++) {
                params[i] = this._DescriptionParamsPerLevel[i][in_level];
            }
            description += formatStringStrict(this._DescriptionTemplate, params);
        }
        
        return description;
    }

    public static GetCommandConfig(slotNum: number, level: number) : UnitCommandConfig {
        var customCommandCfgUid = this._ButtonUidPrefix + this._ButtonUid + "_" + slotNum + "_" + level;
        var customCommand : UnitCommandConfig;
        if (HordeContentApi.HasUnitCommand(customCommandCfgUid)) {
            customCommand = HordeContentApi.GetUnitCommand(customCommandCfgUid);
        } else {
            customCommand = HordeContentApi.CloneConfig(
                HordeContentApi.GetUnitCommand(this._ButtonCommandBaseUid), customCommandCfgUid) as UnitCommandConfig;
            // Настройка
            ScriptUtils.SetValue(customCommand, "Name", this.GetName(level));
            ScriptUtils.SetValue(customCommand, "Tip", this.GetDescription(level));  // Это будет отображаться при наведении курсора
            ScriptUtils.SetValue(customCommand, "UnitCommand", this._ButtonCommandTypeBySlot[slotNum]);
            ScriptUtils.SetValue(customCommand, "Hotkey", this._ButtonHotkeyBySlot[slotNum]);
            ScriptUtils.SetValue(customCommand, "ShowButton", true);
            ScriptUtils.SetValue(customCommand, "PreferredPosition", this._ButtonPositionBySlot[slotNum]);
            ScriptUtils.SetValue(customCommand, "AutomaticMode", null);
            // Установка анимации выполняетс чуть другим способом:
            ScriptUtils.GetValue(customCommand, "AnimationsCatalogRef")
                .SetConfig(HordeContentApi.GetAnimationCatalog(this._ButtonAnimationsCatalogUid));
        }

        return customCommand;
    }

    public static GetUnitConfig() {
        var unitConfigCfgUid = this._ButtonUidPrefix + this._ButtonUid + "_UnitCfg";
        var unitConfig : UnitConfig;
        if (HordeContentApi.HasUnitConfig(unitConfigCfgUid)) {
            unitConfig = HordeContentApi.GetUnitConfig(unitConfigCfgUid);
        } else {
            unitConfig = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig("#UnitConfig_Barbarian_Swordmen"), unitConfigCfgUid) as UnitConfig;
            ScriptUtils.SetValue(unitConfig, "Name", this.GetName(-1));
            ScriptUtils.SetValue(unitConfig, "Description", this.GetDescription(-1));
            ScriptUtils.GetValue(unitConfig, "PortraitCatalogRef").SetConfig(HordeContentApi.GetAnimationCatalog(this._ButtonAnimationsCatalogUid));
            ScriptUtils.SetValue(unitConfig.CostResources, "Gold",   this._SpellCost.Gold);
            ScriptUtils.SetValue(unitConfig.CostResources, "Metal",  this._SpellCost.Metal);
            ScriptUtils.SetValue(unitConfig.CostResources, "Lumber", this._SpellCost.Lumber);
            ScriptUtils.SetValue(unitConfig.CostResources, "People", this._SpellCost.People);
            ScriptUtils.SetValue(unitConfig, "PreferredProductListPosition", this._SpellPreferredProductListPosition.ToHordePoint());
        }

        return unitConfig;
    }

    public static GetUid() : string {
        return this._ButtonUidPrefix + this._ButtonUid;
    }

    public level : number;

    protected _caster                 : IUnitCaster;
    protected _state                  : SpellState;
    protected _charges                : number;
    //protected _reload                 : number;
    
    protected _activatedTick          : number;
    protected _activatedArgs          : ACommandArgs;
    protected _activatedEffect        : StringVisualEffect;
    
    //protected _reloadTick             : number;
    
    protected _chargesReloadTicks     : Array<number>;
    private   _processingTack         : number;
    private   _slotNum                : number;

    constructor(caster: IUnitCaster, ...spellArgs: any[]) {
        this._processingTack = this.constructor["_ProcessingTack"]++ % this.constructor["_ProcessingModule"];
        this._caster               = caster;
        this._state                = SpellState.READY;
        
        var ChargesCountPerLevel : Array<number> = this.constructor["_ChargesCountPerLevel"];
        this.level                 = 0;
        this._charges              = ChargesCountPerLevel.length == 0 ? 0 : ChargesCountPerLevel[this.level];
        this._chargesReloadTicks   = new Array<number>();

        // ищем свободный слот
        var casterSpells = this._caster.Spells();
        if (this.constructor["_IsPassive"]) {
            for (this._slotNum = 4; this._slotNum >= 0; this._slotNum--) {
                if (casterSpells.findIndex(spell => spell._slotNum == this._slotNum) == -1) {
                    break;
                }
            }
        } else {
            for (this._slotNum = 0; this._slotNum < 5; this._slotNum++) {
                if (casterSpells.findIndex(spell => spell._slotNum == this._slotNum) == -1) {
                    break;
                }
            }
        }

        this._caster.unit.CommandsMind.AddCommand(this.GetUnitCommand(), this.GetCommandConfig());
    }

    public OnReplacedCaster(caster: IUnitCaster) {
        this._caster = caster;

        // if (this._state != SpellState.WAIT_CHARGE
        //     && this._state != SpellState.WAIT_DELETE
        //     && !this.constructor["_IsConsumables"]) {
        if (this._charges > 0 || (this.constructor["_ChargesCountPerLevel"].length == 0)) {
            log.info("добавляем команду ", this.GetCommandConfig().Uid, " для юнита ", caster.unit.Name);
            this._caster.unit.CommandsMind.AddCommand(this.GetUnitCommand(), this.GetCommandConfig());
        }
    }

    public GetUnitCommand() : UnitCommand {
        
        return this.constructor["_ButtonCommandTypeBySlot"][this._slotNum];
    }

    public GetCommandConfig() : UnitCommandConfig {
        
        return this.constructor["GetCommandConfig"](this._slotNum, this.level);
    }

    public GetUid() : string {
        
        return this.constructor["GetUid"]();
    }

    public Activate(activateArgs: ACommandArgs) : boolean {
        if (this._state == SpellState.READY) {
            this._state             = SpellState.ACTIVATED;
            this._activatedTick     = BattleController.GameTimer.GameFramesCounter - GlobalVars.startGameTickNum;
            this._activatedArgs     = activateArgs;

            // эффект
            this._activatedEffect   = spawnString(ActiveScena, this.constructor['GetName'](this.level),
                Cell.ConvertHordePoint(this._caster.unit.Cell)
                .Scale(32).Add(new Cell(-2.5*this.constructor['GetName'](this.level).length, 0)).Round().ToHordePoint(), 150);
            this._activatedEffect.Height    = 18;
            this._activatedEffect.Color     = this.constructor['_EffectHordeColor'];
            this._activatedEffect.DrawLayer = DrawLayer.Birds;

            // запускаем перезарядку заряда если не расходник
            this._charges--;
            if (!this.constructor["_IsConsumables"]) {
                this._chargesReloadTicks.push(this._activatedTick + this.constructor['_ChargesReloadTime']);
            }

            return true;
        } else {
            return false;
        }
    }

    public OnEveryTick(gameTickNum: number): boolean {
        
        if (gameTickNum % this.constructor["_ProcessingModule"] != this._processingTack) {
            return false;
        }

        // перезарядка зарядов
        if (this._chargesReloadTicks.length != 0 && this._chargesReloadTicks[0] <= gameTickNum) {
            this._charges++;
            log.info("заряд перезаредился");
            this._chargesReloadTicks.splice(0, 1);
        }
        
        switch (this._state) {
            case SpellState.READY:
                if (!this._OnEveryTickReady(gameTickNum)) {
                    this._state = SpellState.ACTIVATED;
                }
                break;
            case SpellState.ACTIVATED:
                if (!this._OnEveryTickActivated(gameTickNum)) {
                    if (this._charges == 0) {
                        if (this.constructor["_IsConsumables"]) {
                            this._state = SpellState.WAIT_DELETE;
                        } else {
                            this._state = SpellState.WAIT_CHARGE;
                            this._caster.unit.CommandsMind.RemoveAddedCommand(this.GetUnitCommand());
                        }
                    } else {
                        this._state = SpellState.ACTIVATED_DELAY;
                    }
                }
                break;
            case SpellState.ACTIVATED_DELAY:
                if (!this._OnEveryTickActivatedDelay(gameTickNum)) {
                    this._state = SpellState.READY;
                }
                break;
            case SpellState.WAIT_CHARGE:
                if (!this._OnEveryTickWaitReload(gameTickNum)) {
                    this._state   = SpellState.READY;
                    this._caster.unit.CommandsMind.AddCommand(this.GetUnitCommand(), this.GetCommandConfig());
                }
                break;
        }

        return true;
    }

    public State() : SpellState {
        return this._state;
    }

    public LevelUp() : boolean {
        if (this.level == this.constructor["_MaxLevel"]) return false;
        this.level++;

        // увеличиваем число зарядов
        var ChargesCountPerLevel : Array<number> = this.constructor["_ChargesCountPerLevel"];
        if (ChargesCountPerLevel.length == 0) {
        } else if (ChargesCountPerLevel.length == 1) {
        } else {
            var chargeReloadTick = BattleController.GameTimer.GameFramesCounter - GlobalVars.startGameTickNum + this.constructor['_ChargesReloadTime'];
            for (var i = 0; i < ChargesCountPerLevel[this.level] - ChargesCountPerLevel[this.level - 1]; i++) {
                log.info("заряд пошел на перезарядку в ", chargeReloadTick);
                this._chargesReloadTicks.push(chargeReloadTick);
            }
        }

        // обновляем состояние кнопки команды
        if (this._state != SpellState.WAIT_CHARGE) {
            this._caster.unit.CommandsMind.RemoveAddedCommand(this.GetUnitCommand());
            this._caster.unit.CommandsMind.AddCommand(this.GetUnitCommand(), this.GetCommandConfig());
        }

        return true;
    }

    public OnCauseDamage(VictimUnit: Unit, Damage: number, EffectiveDamage: number, HurtType: UnitHurtType) {
    }

    public OnTakeDamage(AttackerUnit: Unit, EffectiveDamage: number, HurtType: UnitHurtType) {
    }

    protected _SpendCharge() {
        var chargeReloadTick = BattleController.GameTimer.GameFramesCounter
            - GlobalVars.startGameTickNum
            + this.constructor['_ChargesReloadTime'];
        this._charges--;
        this._chargesReloadTicks.push(chargeReloadTick);

        if (this._charges == 0) {
            this._caster.unit.CommandsMind.RemoveAddedCommand(this.GetUnitCommand());
            this._state = SpellState.WAIT_CHARGE;
        }
    }

    protected _OnEveryTickReady(gameTickNum: number) : boolean {
        return true;
    }

    protected _OnEveryTickActivated(gameTickNum: number) : boolean {
        return false;
    }

    protected _OnEveryTickActivatedDelay(gameTickNum: number) : boolean {
        return gameTickNum < this._activatedTick + this.constructor["_ActivateDelay"];
    }

    protected _OnEveryTickWaitReload(gameTickNum: number) : boolean {
        return this._charges == 0;
    }
}