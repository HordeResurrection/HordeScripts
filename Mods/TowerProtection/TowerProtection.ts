import { broadcastMessage, createGameMessageWithNoSound } from "library/common/messages";
import { createPoint, createHordeColor, createResourcesAmount } from "library/common/primitives";
import { isReplayMode } from "library/game-logic/game-tools";
import { UnitDirection, UnitHurtType } from "library/game-logic/horde-types";
import HordePluginBase from "plugins/base-plugin";
import { GameState, GlobalVars, PeopleIncomeLevelT, ReplaceUnitParameters } from "./GlobalData";
import { AttackPlansClass } from "./Realizations/AttackPlans";
import { Player_TOWER_CHOISE_DIFFICULT, Player_TOWER_CHOISE_ATTACKPLAN, PlayerTowersClass } from "./Realizations/Player_units";
import { RectangleRingSpawner } from "./Realizations/Spawners";
import { TeimurUnitsClass, TeimurLegendaryUnitsClass } from "./Realizations/Teimur_units";
import { Cell, Rectangle } from "./Types/Geometry";
import { ITeimurUnit } from "./Types/ITeimurUnit";
import { IUnit } from "./Types/IUnit";
import { Team } from "./Types/Team";
import { spawnUnit } from "./Utils";
import { Buff_AddShield, Buff_Improvements, Buff_PeriodAttack_Arrow, Buff_PeriodAttack_Arrow_2, Buff_PeriodAttack_Catapult, Buff_PeriodAttack_Ikon, Buff_PeriodHealing, Buff_PeriodIncomeGold, BuffsClass } from "./Realizations/Buffs";
import { IBuff } from "./Types/IBuff";
import { printObjectItems } from "library/common/introspection";


// попробовать сделать бафф стена, она убивает всех юнитов вокруг башни и ставит туда забор

// можно добавить улучшение на спавн защитников, чем выше прокачано, тем их больше, а не просто апп статов, или, к примеру, после 5 или 10 уровня каждый апп - +1 защиткик
// просто этого одного защитника быстро сносят, а так будет толк идти в ветку защитников, тем более, если они сами еще будут качаться, то они зачистят карту от юнитов. можно вообще сделать ветку суммонов, вороны там голуби, но конечно надо смотреть на сколько игра это потянет

// кто-то мог занять место башни, поэтому пытаться заспавнить еще
// игрок вышел, а рестарт не работает
// вместо осталось до победы писать 3 макс баффа 

// - писать сколько кадров продержался
// бафф - защита раз в сколько-то сек

//📌 Предложение 2: нужно сократить время раунда. Весь азарт режима в первой части, а концовка лагучая и скучная. Продержался 75к тактов - молодец, флаг тебе в руки. Не мучай ни себя, ни ком
//📌 идея: для некоторых апгрейдов показывать сколько шагов осталось
// сделать чтобы в конце игры выводило количество побед последнего игрока

// почему-то удаление конфигов ломает систему опыта!!

export class TowerProtection extends HordePluginBase {
    hostPlayerTeamNum : number;

    // таймеры
    timers: Array<number>;
    // номер команды для оповещения
    notifiedTeamNumber: number;

    public constructor() {
        super("Башенная защита");

        GlobalVars.SetGameState(GameState.PreInit);
    }

    public onFirstRun() {
    }

    public onEveryTick(gameTickNum: number) {
        GlobalVars.gameTickNum = gameTickNum;

        switch (GlobalVars.GetGameState()) {
            case GameState.PreInit:
                this.PreInit(gameTickNum);
                break;
            case GameState.Init:
                this.Init(gameTickNum);
                break;
            case GameState.ChoiseDifficult:
                this.ChoiseDifficult(gameTickNum);
                break;
            case GameState.ChoiseWave:
                this.ChoiseWave(gameTickNum);
                break;
            case GameState.Run:
                this.Run(gameTickNum);
                break;
            case GameState.End:
                this.End(gameTickNum);
                break;
        }
    }

    private PreInit(gameTickNum: number) {
        this.hostPlayerTeamNum     = -1;
        this.notifiedTeamNumber    = -1;

        GlobalVars.units           = new Array<IUnit>();
        GlobalVars.buffs           = new Array<IBuff>();

        GlobalVars.gameStateChangedTickNum = 0;
        GlobalVars.ScriptUtils     = ScriptUtils;
        GlobalVars.ActiveScena     = ActiveScena;
        GlobalVars.HordeContentApi = HordeContentApi;
        GlobalVars.HordeEngine     = HordeEngine;
        GlobalVars.Players         = Players;
        GlobalVars.scenaWidth      = GlobalVars.ActiveScena.GetRealScena().Size.Width;
        GlobalVars.scenaHeight     = GlobalVars.ActiveScena.GetRealScena().Size.Height;
        GlobalVars.unitsMap        = GlobalVars.ActiveScena.GetRealScena().UnitsMap;
        GlobalVars.configs         = new Array<any>();
        GlobalVars.HCL             = HCL;

        // профилировка
        this.timers = new Array<number>(20);
        for (var i = 0; i < 20; i++) {
            this.timers[i] = 0;
        }

        // переходим к следующему состоянию
        GlobalVars.SetGameState(GameState.Init);

        // проверяем, что за карта
        var scenaName = GlobalVars.ActiveScena.GetRealScena().ScenaName;
        if (scenaName == "Башенная защита - стандарт") {
            GlobalVars.teams = new Array<Team>(6);
            for (var i = 0; i < 2; i++) {
                for (var j = 0; j < 3; j++) {
                    const teamNum = 3*i + j;
                    const shiftX  = 6*8*j;
                    const shiftY  = 6*8*i;
                    this.log.info("i = ", i, " j = ", j, " teamNum = ", teamNum, " shiftX = ", shiftX, " shiftY = ", shiftY);
                    GlobalVars.teams[teamNum]                    = new Team();
                    GlobalVars.teams[teamNum].teimurSettlementId = 6;
                    GlobalVars.teams[teamNum].towerCell          = new Cell(shiftX + 23, shiftY + 23);
                    GlobalVars.teams[teamNum].settlementIdx      = teamNum;
                    GlobalVars.teams[teamNum].spawner            = new RectangleRingSpawner(
                        new Rectangle(shiftX + 2, shiftY + 2, 44, 44),
                        new Rectangle(shiftX + 8, shiftY + 8, 32, 32),
                        teamNum
                    );
                }
            }
        } else {
            GlobalVars.SetGameState(GameState.End);
        }
    }

    private Init(gameTickNum: number) {
        GlobalVars.rnd = GlobalVars.ActiveScena.GetRealScena().Context.Randomizer;
        
        //////////////////////////////////////////
        // инициализируем игроков в командах
        //////////////////////////////////////////

        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            GlobalVars.teams[teamNum].incomeGold   = 0;
            GlobalVars.teams[teamNum].incomeMetal  = 0;
            GlobalVars.teams[teamNum].incomeLumber = 0;
            GlobalVars.teams[teamNum].incomePeople = 0;
            GlobalVars.teams[teamNum].nickname     = "";
            GlobalVars.teams[teamNum].settlement       = GlobalVars.ActiveScena.GetRealScena().Settlements.GetByUid('' + GlobalVars.teams[teamNum].settlementIdx);
            GlobalVars.teams[teamNum].teimurSettlement = GlobalVars.ActiveScena.GetRealScena().Settlements.GetByUid('' + GlobalVars.teams[teamNum].teimurSettlementId);
            GlobalVars.teams[teamNum].color            = GlobalVars.teams[teamNum].settlement.SettlementColor;
        }

        for (var player of GlobalVars.Players) {
            var realPlayer   = player.GetRealPlayer();
            var settlement   = realPlayer.GetRealSettlement();
            var settlementId = settlement.Uid;

            this.log.info("player of settlementId ", settlementId);

            if (GlobalVars.teams.find((team) => { return team.teimurSettlementId == settlementId;}) ||
                (isReplayMode() && !realPlayer.IsReplay)) {
                continue;
            }
            
            // ищем команду в которой данное поселение
            var teamNum = -1;
            for (var _teamNum = 0; _teamNum < GlobalVars.teams.length; _teamNum++) {
                if (GlobalVars.teams[_teamNum].settlementIdx == settlementId) {
                    teamNum = _teamNum;
                    break;
                }
            }
            this.log.info("\t found team ", teamNum);
            if (teamNum == -1) {
                continue;
            }

            GlobalVars.teams[teamNum].inGame = true;
            if (GlobalVars.teams[teamNum].nickname.length > 0) {
                GlobalVars.teams[teamNum].nickname += ","
            }
            GlobalVars.teams[teamNum].nickname += realPlayer.Nickname;

            // запоминаем хоста (он самый первый игрок)
            if (this.hostPlayerTeamNum == -1) {
                this.hostPlayerTeamNum = teamNum;
            }

            // убираем налоги
            var censusModel = GlobalVars.ScriptUtils.GetValue(settlement.Census, "Model");
            // Установить период сбора налогов и выплаты жалования (чтобы отключить сбор, необходимо установить 0)
            censusModel.TaxAndSalaryUpdatePeriod = 0;

            // Отключить прирост населения
            censusModel.PeopleIncomeLevels.Clear();
            censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevelT(0, 0, -1));
            censusModel.LastPeopleIncomeLevel = 0;
        }

        // вычисляем сложность

        GlobalVars.difficult = 1;
        this.log.info("current difficult = ", GlobalVars.difficult);

        //////////////////////////////////////////
        // ставим начальную башню для хоста
        //////////////////////////////////////////

        Player_TOWER_CHOISE_DIFFICULT.InitConfig();

        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            if (!GlobalVars.teams[teamNum].inGame) {
                continue;
            }

            this.log.info("teamNum = ", teamNum, " nickName = ", GlobalVars.teams[teamNum].nickname);

            var towerUnit = GlobalVars.unitsMap.GetUpperUnit(GlobalVars.teams[teamNum].towerCell.X, GlobalVars.teams[teamNum].towerCell.Y);
            if (towerUnit) {
                GlobalVars.teams[teamNum].tower = new IUnit(towerUnit, teamNum);
            } else {
                GlobalVars.teams[teamNum].tower = new IUnit(spawnUnit(
                    GlobalVars.teams[teamNum].settlement,
                    GlobalVars.HordeContentApi.GetUnitConfig(Player_TOWER_CHOISE_DIFFICULT.BaseCfgUid),
                    UnitDirection.Down,
                    createPoint(GlobalVars.teams[teamNum].towerCell.X, GlobalVars.teams[teamNum].towerCell.Y)
                ), teamNum);
            }
        }

        //////////////////////////////////////////
        // размещаем замок для выбора сложности
        //////////////////////////////////////////

        let replaceParams                 = new ReplaceUnitParameters();
        replaceParams.OldUnit             = GlobalVars.teams[this.hostPlayerTeamNum].tower.unit;
        replaceParams.NewUnitConfig       = GlobalVars.configs[Player_TOWER_CHOISE_DIFFICULT.CfgUid];
        replaceParams.Cell                = null;  // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
        replaceParams.PreserveHealthLevel = false; // Нужно ли передать уровень здоровья? (в процентном соотношении)
        replaceParams.PreserveOrders      = false; // Нужно ли передать приказы?
        replaceParams.Silent              = true;  // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
        GlobalVars.teams[this.hostPlayerTeamNum].tower = new Player_TOWER_CHOISE_DIFFICULT(GlobalVars.teams[this.hostPlayerTeamNum].tower.unit.Owner.Units.ReplaceUnit(replaceParams), this.hostPlayerTeamNum);

        // отбираем все деньги

        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            if (!GlobalVars.teams[teamNum].inGame) {
                continue;
            }

            GlobalVars.teams[teamNum].settlement.Resources.TakeResources(GlobalVars.teams[teamNum].settlement.Resources.GetCopy());
        }

        GlobalVars.SetGameState(GameState.ChoiseDifficult);
    }

    private ChoiseDifficult(gameTickNum: number) {
        // проверяем, что выбрана сложность

        // проверяем выбирается ли сложность
        if (!GlobalVars.teams[this.hostPlayerTeamNum].tower.unit.OrdersMind.ActiveOrder.ProductUnitConfig) {
            return;
        }

        // выбранная сложность
        GlobalVars.difficult = parseInt(GlobalVars.teams[this.hostPlayerTeamNum].tower.unit.OrdersMind.ActiveOrder.ProductUnitConfig.Shield);
        this.log.info("selected difficult = ", GlobalVars.difficult);
        broadcastMessage("Была выбрана сложность " + GlobalVars.difficult, createHordeColor(255, 140, 140, 140));

        // заменяем данный замок на замок выбора волны
        Player_TOWER_CHOISE_ATTACKPLAN.InitConfig();

        let replaceParams = new ReplaceUnitParameters();
        this.log.info("this.hostPlayerTeamNum = ", this.hostPlayerTeamNum);
        replaceParams.OldUnit = GlobalVars.teams[this.hostPlayerTeamNum].tower.unit;
        replaceParams.NewUnitConfig = GlobalVars.configs[Player_TOWER_CHOISE_ATTACKPLAN.CfgUid];
        replaceParams.Cell = null;                   // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
        replaceParams.PreserveHealthLevel = false;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
        replaceParams.PreserveOrders = false;        // Нужно ли передать приказы?
        replaceParams.Silent = true;                 // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
        GlobalVars.teams[this.hostPlayerTeamNum].tower = new Player_TOWER_CHOISE_ATTACKPLAN(GlobalVars.teams[this.hostPlayerTeamNum].tower.unit.Owner.Units.ReplaceUnit(replaceParams), this.hostPlayerTeamNum);

        // меняем состояние игры
        GlobalVars.SetGameState(GameState.ChoiseWave);
    }

    private ChoiseWave(gameTickNum: number) {
        var FPS = GlobalVars.HordeEngine.HordeResurrection.Engine.Logic.Battle.BattleController.GameTimer.CurrentFpsLimit;

        //////////////////////////////////////////
        // выбор волны
        //////////////////////////////////////////

        var choisedAttackPlanIdx = -1;

        // проверяем выбирается ли волна
        if (!GlobalVars.teams[this.hostPlayerTeamNum].tower.unit.OrdersMind.ActiveOrder.ProductUnitConfig) {
            return;
        }

        // выбранная волна
        choisedAttackPlanIdx = parseInt(GlobalVars.teams[this.hostPlayerTeamNum].tower.unit.OrdersMind.ActiveOrder.ProductUnitConfig.Shield);

        // проверяем, что выбран план атаки
        if (choisedAttackPlanIdx == -1) {
            return;
        }

        //////////////////////////////////////////
        // инициализация
        //////////////////////////////////////////

        // запоминаем тик начала игры
        GlobalVars.gameStateChangedTickNum = gameTickNum;
        GlobalVars.SetGameState(GameState.Run);

        // инициализируем конфиги

        var allUnitsClass = [
            ...TeimurUnitsClass,
            ...TeimurLegendaryUnitsClass,
            ...PlayerTowersClass
        ];
        for (var i = 0; i < allUnitsClass.length; i++) {
            allUnitsClass[i].InitConfig();
        }

        for (var i = 0; i < BuffsClass.length; i++) {
            BuffsClass[i].InitConfig();
        }

        // инициализируем план атаки

        GlobalVars.attackPlan = new AttackPlansClass[choisedAttackPlanIdx]();
        broadcastMessage("Был выбран план атаки " + choisedAttackPlanIdx, createHordeColor(255, 140, 140, 140));
        broadcastMessage(AttackPlansClass[choisedAttackPlanIdx].Description, createHordeColor(255, 140, 140, 140));
        {
            var secondsLeft = Math.round(GlobalVars.attackPlan.waves[0].gameTickNum) / FPS;
            var minutesLeft = Math.floor(secondsLeft / 60);
            secondsLeft    -= minutesLeft * 60;
            secondsLeft     = Math.round(secondsLeft);
            broadcastMessage("До начала волны " + (minutesLeft > 0 ? minutesLeft + " минут " : "") + secondsLeft + " секунд", createHordeColor(255, 255, 50, 10));
        }

        // считаем сколько будет врагов

        var unitsTotalCount = GlobalVars.attackPlan.GetUnitsCount();
        for (var unitCfg in unitsTotalCount) {
            this.log.info(unitCfg, " ", unitsTotalCount[unitCfg]);
        }

        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            if (!GlobalVars.teams[teamNum].inGame) {
                continue;
            }

            let replaceParams                 = new ReplaceUnitParameters();
            replaceParams.OldUnit             = GlobalVars.teams[teamNum].tower.unit;
            replaceParams.NewUnitConfig       = GlobalVars.configs[PlayerTowersClass[teamNum].CfgUid];
            replaceParams.Cell                = null;  // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
            replaceParams.PreserveHealthLevel = false; // Нужно ли передать уровень здоровья? (в процентном соотношении)
            replaceParams.PreserveOrders      = false; // Нужно ли передать приказы?
            replaceParams.Silent              = true;  // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
            GlobalVars.teams[teamNum].tower   = new PlayerTowersClass[teamNum](GlobalVars.teams[teamNum].tower.unit.Owner.Units.ReplaceUnit(replaceParams), teamNum);
            GlobalVars.units.push(GlobalVars.teams[teamNum].tower);
            GlobalVars.buffs.push(new Buff_Improvements(teamNum));
            GlobalVars.buffs.push(new Buff_PeriodIncomeGold(teamNum));
            GlobalVars.buffs.push(new Buff_PeriodIncomeGold(teamNum));
            GlobalVars.buffs.push(new Buff_PeriodIncomeGold(teamNum));
            GlobalVars.buffs.push(new Buff_PeriodIncomeGold(teamNum));
            GlobalVars.buffs.push(new Buff_PeriodIncomeGold(teamNum));
            GlobalVars.buffs.push(new Buff_PeriodHealing(teamNum));
            GlobalVars.teams[teamNum].incomeGold = 1000;
        }

        // подписываемся на событие о замене юнита (поддержка LevelSystem)

        let scenaSettlements = GlobalVars.ActiveScena.GetRealScena().Settlements;
        for (var settlementNum = 0; settlementNum < scenaSettlements.Count; settlementNum++) {
            var settlementUnits = scenaSettlements.Item.get(settlementNum + '').Units;

            settlementUnits.UnitReplaced.connect(
                function (sender, args) {
                    // если производится заменя юнита, который в списке юнитов, то нужно переинициализировать его
                    if (!args.OldUnit.ScriptData.ExperienceSystem) {
                        return;
                    }
                    for (var unitNum = 0; unitNum < GlobalVars.units.length; unitNum++) {
                        if (args.OldUnit.Id == GlobalVars.units[unitNum].unit.Id) {
                            GlobalVars.units[unitNum].needDeleted = true;
                            GlobalVars.units.push(GlobalVars.units[unitNum].constructor(args.NewUnit, GlobalVars.units[unitNum].teamNum));

                            // если конфига нету в системе, то инициализируем его
                            if (!GlobalVars.configs[args.NewUnit.Cfg.Uid]) {
                                var prev_BaseCfgUid     = ITeimurUnit.BaseCfgUid;
                                var prev_CfgUid         = ITeimurUnit.CfgUid;
                                ITeimurUnit.BaseCfgUid  = args.NewUnit.Cfg.Uid;
                                ITeimurUnit.CfgUid      = args.NewUnit.Cfg.Uid;
                                ITeimurUnit.InitConfig();
                                ITeimurUnit.BaseCfgUid  = prev_BaseCfgUid;
                                ITeimurUnit.CfgUid      = prev_CfgUid;
                            }
                            break;
                        }
                    }
            });
        }
    }

    private Run(gameTickNum: number) {
        // смещаем номер такта, чтобы время считалось относительно начала игры
        gameTickNum -= GlobalVars.gameStateChangedTickNum;

        var FPS = GlobalVars.HordeEngine.HordeResurrection.Engine.Logic.Battle.BattleController.GameTimer.CurrentFpsLimit;

        // присуждаем поражение если башня уничтожена

        var timerNum = 0;

        // проверяем не конец игры ли

        var time     = new Date().getTime();
        if (GlobalVars.attackPlan.waves.length <= GlobalVars.attackPlan.waveNum) {
            GlobalVars.SetGameState(GameState.End);

            // замок с максимальных ХП побеждает
            var victory_teamNum = -1;
            var victory_castleHP = 0;
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (!GlobalVars.teams[teamNum].inGame ||
                    GlobalVars.teams[teamNum].tower.unit.IsDead) {
                    continue;
                }

                if (victory_teamNum == -1 || (victory_castleHP < GlobalVars.teams[teamNum].tower.unit.Health)) {
                    victory_teamNum  = teamNum;
                    victory_castleHP = GlobalVars.teams[teamNum].tower.unit.Health;
                }
            }
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (teamNum == victory_teamNum) {
                    GlobalVars.teams[teamNum].settlement.Existence.ForceVictory();
                } else {
                    GlobalVars.teams[teamNum].settlement.Existence.ForceTotalDefeat();
                }
            }
            return;
        } else if (gameTickNum % 50 == 0) {
            // присуждаем поражение, если замок уничтожен
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (!GlobalVars.teams[teamNum].inGame) {
                    continue;
                }

                if (GlobalVars.teams[teamNum].tower.unit.IsDead && GlobalVars.teams[teamNum].tower.unit.ScriptData.DefenceFromTeimur_IsDefeat == undefined) {
                    broadcastMessage(GlobalVars.teams[teamNum].nickname + " проиграл, он продержался " + gameTickNum + " тактов!", GlobalVars.teams[teamNum].settlement.SettlementColor);
                    GlobalVars.teams[teamNum].tower.unit.ScriptData.DefenceFromTeimur_IsDefeat = true;
                    GlobalVars.teams[teamNum].settlement.Existence.ForceTotalDefeat();

                    // убиваем юнитов, которые атаковали эту команду игроков

                    for (var unitNum = 0; unitNum < GlobalVars.units.length; unitNum++) {
                        if (GlobalVars.units[unitNum].teamNum == teamNum) {
                            GlobalVars.units[unitNum].unit.BattleMind.InstantDeath(null, UnitHurtType.Mele);
                        }
                    }

                    // уничтожаем баффы

                    for (var buffNum = 0; buffNum < GlobalVars.buffs.length; buffNum++) {
                        if (GlobalVars.buffs[buffNum].teamNum == teamNum) {
                            GlobalVars.buffs[buffNum].needDeleted = true;
                        }
                    }
                }
            }

            // проверяем не уничтожены ли все замки
            var allCastlesDead = true;
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (!GlobalVars.teams[teamNum].inGame) {
                    continue;
                }

                if (!GlobalVars.teams[teamNum].tower.unit.IsDead) {
                    allCastlesDead = false;
                    break;
                }
            }
            if (allCastlesDead) {
                // выводим статистику
                var str = "[PROFILE]\n";
                for (var i = 0; i < this.timers.length; i++) {
                    if (this.timers[i] == 0) break;
                    str += "timer[" + i + "] = " + this.timers[i] + "\n";
                }
                this.log.info(str);

                GlobalVars.SetGameState(GameState.End);
            }
        }
        this.timers[timerNum++] += new Date().getTime() - time;

        // оповещаем сколько осталось и о игроке

        if (gameTickNum % (30 * FPS) == 0 && GlobalVars.GetGameState() != GameState.End) {
            this.notifiedTeamNumber++;
            while (!GlobalVars.teams[this.notifiedTeamNumber].inGame  ||
                GlobalVars.teams[this.notifiedTeamNumber].tower.unit.IsDead) {
                this.notifiedTeamNumber = (this.notifiedTeamNumber + 1) % GlobalVars.teams.length;
            }

            // ищем 3 максимальный баффа
            var sortedBuffsIdx : Array<number> = Array.from(Array(Buff_Improvements.TowersBuffsCount[this.notifiedTeamNumber].length).keys());
            sortedBuffsIdx.sort((a : number, b : number) => {
                return Buff_Improvements.TowersBuffsCount[this.notifiedTeamNumber][b] - Buff_Improvements.TowersBuffsCount[this.notifiedTeamNumber][a];
            });

            var secondsLeft     = Math.round(GlobalVars.attackPlan.waves[GlobalVars.attackPlan.waves.length - 1].gameTickNum - gameTickNum) / FPS;
            var minutesLeft     = Math.floor(secondsLeft / 60);
            secondsLeft        -= minutesLeft * 60;
            secondsLeft         = Math.round(secondsLeft);
            let msgStr : string = "Осталось продержаться " + (minutesLeft > 0 ? minutesLeft + " минут " : "") + secondsLeft + " секунд\n";
            msgStr             += "Самые мощные баффы игрока " + GlobalVars.teams[this.notifiedTeamNumber].nickname + ":\n";
            for (var i = 0; i < 3; i++) {
                var buffIdx = sortedBuffsIdx[i];
                msgStr += "\t" + GlobalVars.configs[Buff_Improvements.ImprovementsBuffsClass[buffIdx].CfgUid].Name + " : " + Buff_Improvements.TowersBuffsCount[this.notifiedTeamNumber][buffIdx] + "\n"
            }

            var msg = createGameMessageWithNoSound(msgStr, GlobalVars.teams[this.notifiedTeamNumber].color);
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (!GlobalVars.teams[teamNum].inGame) {
                    continue;
                }
                GlobalVars.teams[teamNum].settlement.Messages.AddMessage(msg);
            }
        }

        // спавнер

        time     = new Date().getTime();
        if (gameTickNum % 50 == 1) {
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (!GlobalVars.teams[teamNum].inGame ||
                    GlobalVars.teams[teamNum].tower.unit.IsDead) {
                    continue;
                }
                GlobalVars.teams[teamNum].spawner.OnEveryTick(gameTickNum);
            }
        }
        this.timers[timerNum++] += new Date().getTime() - time;

        // инком

        time     = new Date().getTime();
        if (gameTickNum % 100 == 2) {
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (!GlobalVars.teams[teamNum].inGame ||
                    GlobalVars.teams[teamNum].tower.unit.IsDead) {
                    continue;
                }

                // проверка, что есть инком
                if (GlobalVars.teams[teamNum].incomeGold   == 0 &&
                    GlobalVars.teams[teamNum].incomeMetal  == 0 &&
                    GlobalVars.teams[teamNum].incomeLumber == 0 &&
                    GlobalVars.teams[teamNum].incomePeople == 0) {
                    continue;
                }

                // даем ресурсы
                GlobalVars.teams[teamNum].settlement.Resources.AddResources(
                    createResourcesAmount(
                        GlobalVars.teams[teamNum].incomeGold,
                        GlobalVars.teams[teamNum].incomeMetal,
                        GlobalVars.teams[teamNum].incomeLumber,
                        GlobalVars.teams[teamNum].incomePeople));

                // зануляем ресы
                GlobalVars.teams[teamNum].incomeGold   = 0;
                GlobalVars.teams[teamNum].incomeMetal  = 0;
                GlobalVars.teams[teamNum].incomeLumber = 0;
                GlobalVars.teams[teamNum].incomePeople = 0;
            }
        }
        this.timers[timerNum++] += new Date().getTime() - time;

        // обработка юнитов (65 %)

        time     = new Date().getTime();
        for (var unitNum = 0; unitNum < GlobalVars.units.length; unitNum++) {
            // юнит умер, удаляем из списка
            if (GlobalVars.units[unitNum].unit.IsDead) {
                GlobalVars.units[unitNum].OnDead(gameTickNum);
                GlobalVars.units.splice(unitNum--, 1);
            }
            // юнит сам запросил, что его нужно удалить из списка
            else if (GlobalVars.units[unitNum].needDeleted) {
                GlobalVars.units.splice(unitNum--, 1);
            }
            // настало время для обработки юнита
            else if (gameTickNum % GlobalVars.units[unitNum].processingTickModule == GlobalVars.units[unitNum].processingTick) {
                GlobalVars.units[unitNum].OnEveryTick(gameTickNum);
            }
        }
        this.timers[timerNum++] += new Date().getTime() - time;

        // обработка баффов (30 %)

        time     = new Date().getTime();
        for (var buffNum = 0; buffNum < GlobalVars.buffs.length; buffNum++) {
            // бафф сам запросил, что его нужно удалить из списка
            if (GlobalVars.buffs[buffNum].needDeleted) {
                GlobalVars.buffs[buffNum].OnDead(gameTickNum);
                GlobalVars.buffs.splice(buffNum--, 1);
            }
            // настало время для обработки бафф
            else if (gameTickNum % GlobalVars.buffs[buffNum].processingTickModule == GlobalVars.buffs[buffNum].processingTick) {
                GlobalVars.buffs[buffNum].OnEveryTick(gameTickNum);
            }
        }
        this.timers[timerNum++] += new Date().getTime() - time;

        // если закончилась игра, то

        if (GlobalVars.GetGameState() == GameState.End) {
            broadcastMessage("Игра начнется через 10 секунд!", createHordeColor(255, 140, 140, 140));
        }
    }

    private End(gameTickNum: number) {
        if (GlobalVars.gameStateChangedTickNum + 10*50 < gameTickNum) {
            GlobalVars.SetGameState(GameState.PreInit);
            // тут нужно TotalDefead превратить в что-то другое
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (!GlobalVars.teams[teamNum].inGame) {
                    continue;
                }
                GlobalVars.ScriptUtils.SetValue(GlobalVars.teams[teamNum].settlement.Existence, "Status", GlobalVars.HCL.HordeClassLibrary.World.Settlements.Existence.ExistenceStatus.CombatNow);
            }
        }
    }
}
