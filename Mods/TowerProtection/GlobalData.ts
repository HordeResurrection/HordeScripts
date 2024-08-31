import { IUnit } from "./Types/IUnit";
import { Team } from "./Types/Team";
import { IAttackPlan } from "./Types/IAttackPlan";
import { IBuff } from "./Types/IBuff";

export enum GameState { PreInit, Init, ChoiseDifficult, ChoiseWave, Run, End };

export const CFGPrefix : string = "TowerProtection";

export const DeleteUnitParameters  = HCL.HordeClassLibrary.World.Objects.Units.DeleteUnitParameters;
export const ReplaceUnitParameters = HCL.HordeClassLibrary.World.Objects.Units.ReplaceUnitParameters;
export const PeopleIncomeLevelT    = HCL.HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;
export const UnitQueryFlag         = HCL.HordeClassLibrary.UnitComponents.Enumerations.UnitQueryFlag;

export class GlobalVars {
    /** текущий игровой тик */
    public static gameTickNum: number;
    public static gameState: GameState;
    /** массив конфигов */
    public static configs: any;
    /** команды */
    public static teams: Array<Team>;
    /** сложность игры */
    public static difficult: number;
    /** план атаки */
    public static attackPlan: IAttackPlan;
    /** все заскриптованные юниты в игре */
    public static units: Array<IUnit>;
    /** все заскриптованные баффы в игре */
    public static buffs: Array<IBuff>;
    /** время старта игры */
    public static startGameTickNum: number;
    /** рандомайзер */
    public static rnd: any;
    /** ScriptUtils */
    public static ScriptUtils: any;
    /** ActiveScena */
    public static ActiveScena: any;
    /** HordeContentApi */
    public static HordeContentApi: any;
    /** HordeEngine */
    public static HordeEngine: any;
    /** Players */
    public static Players: any;
    public static scenaWidth : number;
    public static scenaHeight : number;
    /** юниты на карте */
    public static unitsMap : any;
    public static HCL : any;
}
