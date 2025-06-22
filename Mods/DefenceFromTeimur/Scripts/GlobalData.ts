import { IUnit } from "./Types/IUnit";
import { Team } from "./Types/Team";
import { IIncomePlan } from "./Types/IIncomePlan";
import { IAttackPlan } from "./Types/IAttackPlan";
import { DiplomacyStatus, Player } from "library/game-logic/horde-types";

export enum GameState { PreInit, Init, ChoiseDifficult, ChoiseGameMode, ChoiseWave, Run, End };

export class GlobalVars {
    public static gameState : GameState;
    /** массив конфигов */
    public static configs: any;
    /** команды */
    public static teams: Array<Team>;
    /** таблица мира */
    public static diplomacyTable : Array<Array<DiplomacyStatus>>;
    /** сложность игры */
    public static difficult: number;
    /** режим игры */
    public static gameMode: number;
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
    /** Players */
    public static Players: Player[];
    public static scenaWidth : number;
    public static scenaHeight : number;
    /** юниты на карте */
    public static unitsMap : any;
    public static plugin : any;
}
