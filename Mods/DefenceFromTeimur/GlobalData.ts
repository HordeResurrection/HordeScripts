import { IUnit } from "./Types/IUnit";
import { Team } from "./Types/Team";
import { IIncomePlan } from "./Types/IIncomePlan";
import { IAttackPlan } from "./Types/IAttackPlan";

export enum GameState { PreInit, Init, ChoiseDifficult, ChoiseWave, Run, End };

export class GlobalVars {
    public static gameState : GameState;
    /** массив конфигов */
    public static configs: any;
    /** команды */
    public static teams: Array<Team>;
    /** сложность игры */
    public static difficult: number;
    /** план атаки */
    public static attackPlan: IAttackPlan;
    /** план инкома */
    public static incomePlan: IIncomePlan;
    /** все заскриптованные юниты в игре */
    public static units: Array<IUnit>;
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
}
