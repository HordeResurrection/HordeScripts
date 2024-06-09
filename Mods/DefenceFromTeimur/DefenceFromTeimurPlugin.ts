import { isReplayMode } from "library/game-logic/game-tools";
import HordePluginBase from "plugins/base-plugin";
import { AttackPlansClass } from "./Realizations/AttackPlans";
import { Cell, Rectangle } from "./Types/Geometry";
import { Team } from "./Types/Team";
import { createHordeColor, createPoint } from "library/common/primitives";
import { UnitDirection } from "library/game-logic/horde-types";
import { spawnUnit } from "library/game-logic/unit-spawn";
import { PlayerUnitsClass, Player_CASTLE_CHOISE_ATTACKPLAN, Player_CASTLE_CHOISE_DIFFICULT, Player_GOALCASTLE } from "./Realizations/Player_units";
import { TeimurUnitsClass, TeimurLegendaryUnitsClass } from "./Realizations/Teimur_units";
import { broadcastMessage } from "library/common/messages";
import { GameState, GlobalVars } from "./GlobalData";
import { IUnit } from "./Types/IUnit";
import { IncomePlansClass } from "./Realizations/IncomePlans";
import { RectangleSpawner, RingSpawner } from "./Realizations/Spawners";

const DeleteUnitParameters = HCL.HordeClassLibrary.World.Objects.Units.DeleteUnitParameters;
const ReplaceUnitParameters = HCL.HordeClassLibrary.World.Objects.Units.ReplaceUnitParameters;
const PeopleIncomeLevelT = HCL.HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;

// \TODO
// + легендарные юниты могли захватывать здания
// - сделать голубятню дороже
// - 2 раза поражение защитал, один раз при уничтожении замка, а второй при
// - сделать однородные волны, и их можно рандомить, чтобы волна контрилась
// на полукруге чуть выше
// - легендарный инж чет плохо строит башни
// + легендарный всадник бъет!, а не должен

export class DefenceFromTeimurPlugin extends HordePluginBase {
    hostPlayerTeamNum : number;

    public constructor() {
        super("Оборона от Теймура");

        this.hostPlayerTeamNum = -1;

        GlobalVars.units = new Array<IUnit>();

        GlobalVars.ScriptUtils = ScriptUtils;
        GlobalVars.ActiveScena = ActiveScena;
        GlobalVars.HordeContentApi = HordeContentApi;
        GlobalVars.HordeEngine = HordeEngine;
        GlobalVars.Players     = Players;
        GlobalVars.scenaWidth  = GlobalVars.ActiveScena.GetRealScena().Size.Width;
        GlobalVars.scenaHeight = GlobalVars.ActiveScena.GetRealScena().Size.Height;
        GlobalVars.unitsMap    = GlobalVars.ActiveScena.GetRealScena().UnitsMap;
    }

    public onFirstRun() {
        var scenaName = GlobalVars.ActiveScena.GetRealScena().ScenaName;

        if (scenaName == "Оборона от Теймура - узкий проход (1-5)") {
            GlobalVars.teams = new Array<Team>(1);
            GlobalVars.teams[0] = new Team();
            GlobalVars.teams[0].teimurSettlementId = 4;
            GlobalVars.teams[0].castleCell        = new Cell(88, 123);
            GlobalVars.teams[0].allSettlementsIdx = [0, 1, 2, 3, 5];
            GlobalVars.teams[0].spawner           = new RectangleSpawner(new Rectangle(0, 0, 182, 22), 0);
        } else if (scenaName == "Оборона от Теймура - полукруг (1-5)") {
            GlobalVars.teams = new Array<Team>(1);
            GlobalVars.teams[0] = new Team();
            GlobalVars.teams[0].teimurSettlementId = 4;
            GlobalVars.teams[0].castleCell        = new Cell(98, 95);
            GlobalVars.teams[0].allSettlementsIdx = [0, 1, 2, 3, 5];
            GlobalVars.teams[0].spawner           = new RingSpawner(new Cell(99, 99), 80, 100, 0, Math.PI, 0);
        } else if (scenaName == "Оборона от Теймура - легион (2x2)") {
            GlobalVars.teams = new Array<Team>(2);
            GlobalVars.teams[0] = new Team();
            GlobalVars.teams[0].teimurSettlementId = 6;
            GlobalVars.teams[0].castleCell        = new Cell(138, 18);
            GlobalVars.teams[0].allSettlementsIdx = [0, 1, 2];
            GlobalVars.teams[0].spawner           = new RectangleSpawner(new Rectangle(0, 0, 38, 42), 0);

            GlobalVars.teams[1] = new Team();
            GlobalVars.teams[1].teimurSettlementId = 7;
            GlobalVars.teams[1].castleCell        = new Cell(138, 82);
            GlobalVars.teams[1].allSettlementsIdx = [3, 4, 5];
            GlobalVars.teams[1].spawner           = new RectangleSpawner(new Rectangle(0, 61, 38, 42), 1);
        }

        GlobalVars.gameState = GameState.PreInit;
    }

    public onEveryTick(gameTickNum: number) {
        switch (GlobalVars.gameState) {
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
        GlobalVars.configs = new Array<any>();
        GlobalVars.gameState = GameState.Init;
    }

    private Init(gameTickNum: number) {
        GlobalVars.rnd = GlobalVars.ActiveScena.GetRealScena().Context.Randomizer;
        
        //////////////////////////////////////////
        // инициализируем игроков в командах
        //////////////////////////////////////////

        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            GlobalVars.teams[teamNum].settlementsIdx = new Array<number>();
            GlobalVars.teams[teamNum].settlements    = new Array<any>();
            GlobalVars.teams[teamNum].teimurSettlement = GlobalVars.ActiveScena.GetRealScena().Settlements.GetByUid('' + GlobalVars.teams[teamNum].teimurSettlementId);
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
                for (var _settlementId of GlobalVars.teams[_teamNum].allSettlementsIdx) {
                    if (_settlementId == settlementId) {
                        teamNum = _teamNum;
                        break;
                    }
                }
                if (teamNum != -1) {
                    break;
                }
            }
            this.log.info("\t found team ", teamNum);
            if (teamNum == -1) {
                continue;
            }

            // запоминаем хоста
            if (this.hostPlayerTeamNum == -1) {
                this.hostPlayerTeamNum = teamNum;
            }

            // проверяем дубликаты
            if (GlobalVars.teams[teamNum].settlementsIdx.indexOf(settlementId) != -1) {
                continue;
            }

            GlobalVars.teams[teamNum].settlementsIdx.push(settlementId);
            GlobalVars.teams[teamNum].settlements.push(settlement);

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

        GlobalVars.difficult = 0;
        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            GlobalVars.difficult = Math.max(GlobalVars.difficult, GlobalVars.teams[teamNum].settlementsIdx.length);
        }
        this.log.info("current difficult = ", GlobalVars.difficult);

        //////////////////////////////////////////
        // ставим начальные замки замки
        //////////////////////////////////////////

        Player_CASTLE_CHOISE_DIFFICULT.InitConfig();

        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            if (GlobalVars.teams[teamNum].settlementsIdx.length == 0) {
                continue;
            }

            var castleUnit = GlobalVars.unitsMap.GetUpperUnit(GlobalVars.teams[teamNum].castleCell.X, GlobalVars.teams[teamNum].castleCell.Y);
            if (castleUnit) {
                GlobalVars.teams[teamNum].castle = new IUnit(castleUnit, teamNum);
            } else {
                GlobalVars.teams[teamNum].castle = new IUnit(spawnUnit(
                    GlobalVars.teams[teamNum].settlements[0],
                    //GlobalVars.configs[Player_CASTLE_CHOISE_DIFFICULT.BaseCfgUid],
                    GlobalVars.HordeContentApi.GetUnitConfig(Player_CASTLE_CHOISE_DIFFICULT.BaseCfgUid),
                    createPoint(GlobalVars.teams[teamNum].castleCell.X, GlobalVars.teams[teamNum].castleCell.Y),
                    UnitDirection.Down
                ), teamNum);
            }
        }

        //////////////////////////////////////////
        // размещаем замок для выбора сложности
        //////////////////////////////////////////

        let replaceParams                 = new ReplaceUnitParameters();
        replaceParams.OldUnit             = GlobalVars.teams[this.hostPlayerTeamNum].castle.unit;
        replaceParams.NewUnitConfig       = GlobalVars.configs[Player_CASTLE_CHOISE_DIFFICULT.CfgUid];
        replaceParams.Cell                = null;  // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
        replaceParams.PreserveHealthLevel = false; // Нужно ли передать уровень здоровья? (в процентном соотношении)
        replaceParams.PreserveOrders      = false; // Нужно ли передать приказы?
        replaceParams.Silent              = true;  // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
        GlobalVars.teams[this.hostPlayerTeamNum].castle = new Player_CASTLE_CHOISE_DIFFICULT(GlobalVars.teams[this.hostPlayerTeamNum].castle.unit.Owner.Units.ReplaceUnit(replaceParams), this.hostPlayerTeamNum);

        // for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
        //     if (GlobalVars.teams[teamNum].settlementsIdx.length == 0) {
        //         continue;
        //     }

        //     GlobalVars.teams[teamNum].castle = new Player_CASTLE_CHOISE_DIFFICULT(spawnUnit(
        //         GlobalVars.teams[teamNum].settlements[0],
        //         GlobalVars.configs[Player_CASTLE_CHOISE_DIFFICULT.CfgUid],
        //         createPoint(GlobalVars.teams[teamNum].castleCell.X, GlobalVars.teams[teamNum].castleCell.Y),
        //         UnitDirection.Down
        //     ), teamNum);

        //     break;
        // }

        // отбираем все деньги

        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            if (GlobalVars.teams[teamNum].settlementsIdx.length == 0) {
                continue;
            }

            for (var settlement of GlobalVars.teams[teamNum].settlements)
                settlement.Resources.TakeResources(settlement.Resources.GetCopy());
        } 

        GlobalVars.gameState = GameState.ChoiseDifficult;
    }

    private ChoiseDifficult(gameTickNum: number) {
        // проверяем, что выбрана сложность

        // проверяем выбирается ли сложность
        if (!GlobalVars.teams[this.hostPlayerTeamNum].castle.unit.OrdersMind.ActiveOrder.ProductUnitConfig) {
            return;
        }

        // выбранная сложность
        GlobalVars.difficult = parseInt(GlobalVars.teams[this.hostPlayerTeamNum].castle.unit.OrdersMind.ActiveOrder.ProductUnitConfig.Shield);
        this.log.info("selected difficult = ", GlobalVars.difficult);
        broadcastMessage("Была выбрана сложность " + GlobalVars.difficult, createHordeColor(255, 100, 100, 100));

        // заменяем данный замок на замок выбора волны
        Player_CASTLE_CHOISE_ATTACKPLAN.InitConfig();

        let replaceParams = new ReplaceUnitParameters();
        replaceParams.OldUnit = GlobalVars.teams[this.hostPlayerTeamNum].castle.unit;
        replaceParams.NewUnitConfig = GlobalVars.configs[Player_CASTLE_CHOISE_ATTACKPLAN.CfgUid];
        replaceParams.Cell = null;                   // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
        replaceParams.PreserveHealthLevel = false;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
        replaceParams.PreserveOrders = false;        // Нужно ли передать приказы?
        replaceParams.Silent = true;                 // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
        GlobalVars.teams[this.hostPlayerTeamNum].castle = new Player_CASTLE_CHOISE_ATTACKPLAN(GlobalVars.teams[this.hostPlayerTeamNum].castle.unit.Owner.Units.ReplaceUnit(replaceParams), this.hostPlayerTeamNum);

        // меняем состояние игры
        GlobalVars.gameState = GameState.ChoiseWave;

        // for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
        //     if (GlobalVars.teams[teamNum].settlementsIdx.length == 0) {
        //         continue;
        //     }

        //     // проверяем выбирается ли сложность
        //     if (!GlobalVars.teams[teamNum].castle.unit.OrdersMind.ActiveOrder.ProductUnitConfig) {
        //         return;
        //     }

        //     // выбранная сложность
        //     GlobalVars.difficult = parseInt(GlobalVars.teams[teamNum].castle.unit.OrdersMind.ActiveOrder.ProductUnitConfig.Shield);
        //     this.log.info("selected difficult = ", GlobalVars.difficult);
        //     broadcastMessage("Была выбрана сложность " + GlobalVars.difficult, createHordeColor(255, 100, 100, 100));

        //     // заменяем данный замок на замок выбора волны
        //     Player_CASTLE_CHOISE_ATTACKPLAN.InitConfig();

        //     let replaceParams = new ReplaceUnitParameters();
        //     replaceParams.OldUnit = GlobalVars.teams[teamNum].castle.unit;
        //     replaceParams.NewUnitConfig = GlobalVars.configs[Player_CASTLE_CHOISE_ATTACKPLAN.CfgUid];
        //     replaceParams.Cell = null;                   // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
        //     replaceParams.PreserveHealthLevel = false;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
        //     replaceParams.PreserveOrders = false;        // Нужно ли передать приказы?
        //     replaceParams.Silent = true;                 // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
        //     GlobalVars.teams[teamNum].castle = new Player_CASTLE_CHOISE_ATTACKPLAN(GlobalVars.teams[teamNum].castle.unit.Owner.Units.ReplaceUnit(replaceParams), teamNum);

        //     // меняем состояние игры
        //     GlobalVars.gameState = GameState.ChoiseWave;

        //     break;
        // }
    }

    private ChoiseWave(gameTickNum: number) {
        //////////////////////////////////////////
        // выбор волны
        //////////////////////////////////////////

        var choisedAttackPlanIdx = -1;

        // проверяем выбирается ли волна
        if (!GlobalVars.teams[this.hostPlayerTeamNum].castle.unit.OrdersMind.ActiveOrder.ProductUnitConfig) {
            return;
        }

        // выбранная волна
        choisedAttackPlanIdx = parseInt(GlobalVars.teams[this.hostPlayerTeamNum].castle.unit.OrdersMind.ActiveOrder.ProductUnitConfig.Shield);

        // проверяем, что выбран план атаки
        if (choisedAttackPlanIdx == -1) {
            return;
        }

        //////////////////////////////////////////
        // инициализация
        //////////////////////////////////////////

        // инициализируем конфиги

        var allUnitsClass = [
            ...TeimurUnitsClass,
            ...TeimurLegendaryUnitsClass,
            ...PlayerUnitsClass
        ];
        for (var i = 0; i < allUnitsClass.length; i++) {
            allUnitsClass[i].InitConfig();
        }

        // инициализируем план атаки

        GlobalVars.attackPlan = new AttackPlansClass[choisedAttackPlanIdx]();
        broadcastMessage("Был выбран план атаки " + choisedAttackPlanIdx, createHordeColor(255, 100, 100, 100));
        broadcastMessage(AttackPlansClass[choisedAttackPlanIdx].Description, createHordeColor(255, 255, 50, 10));

        // инициализируем план инкома

        GlobalVars.incomePlan = new AttackPlansClass[choisedAttackPlanIdx].IncomePlanClass();
        broadcastMessage(AttackPlansClass[choisedAttackPlanIdx].IncomePlanClass.Description, createHordeColor(255, 255, 50, 10));

        // считаем сколько будет врагов

        var unitsTotalCount = GlobalVars.attackPlan.GetUnitsCount();
        for (var unitCfg in unitsTotalCount) {
            this.log.info(unitCfg, " ", unitsTotalCount[unitCfg]);
        }

        // создаем замки
        Player_GOALCASTLE.InitConfig();

        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            // проверяем, что команда в игре
            if (GlobalVars.teams[teamNum].settlementsIdx.length == 0) {
                continue;
            }

            let replaceParams                 = new ReplaceUnitParameters();
            replaceParams.OldUnit             = GlobalVars.teams[teamNum].castle.unit;
            replaceParams.NewUnitConfig       = GlobalVars.configs[Player_GOALCASTLE.CfgUid];
            replaceParams.Cell                = null;  // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
            replaceParams.PreserveHealthLevel = false; // Нужно ли передать уровень здоровья? (в процентном соотношении)
            replaceParams.PreserveOrders      = false; // Нужно ли передать приказы?
            replaceParams.Silent              = true;  // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
            GlobalVars.teams[teamNum].castle = new Player_GOALCASTLE(GlobalVars.teams[teamNum].castle.unit.Owner.Units.ReplaceUnit(replaceParams), teamNum);
        }

        // даем стартовый капитал
        GlobalVars.incomePlan.OnStart();

        GlobalVars.startGameTickNum = gameTickNum;
        GlobalVars.gameState        = GameState.Run;
    }

    private Run(gameTickNum: number) {
        // смещаем номер такта, чтобы время считалось относительно начала игры
        gameTickNum -= GlobalVars.startGameTickNum;

        var FPS = GlobalVars.HordeEngine.HordeResurrection.Engine.Logic.Battle.BattleController.GameTimer.CurrentFpsLimit;

        // проверяем не конец игры ли

        if (GlobalVars.attackPlan.waves.length <= GlobalVars.attackPlan.waveNum) {
            GlobalVars.gameState = GameState.End;
            // замок с максимальных ХП побеждает
            var victory_teamNum = -1;
            var victory_castleHP = 0;
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (GlobalVars.teams[teamNum].settlementsIdx.length == 0 ||
                    GlobalVars.teams[teamNum].castle.unit.IsDead) {
                    continue;
                }

                if (victory_teamNum == -1 || (victory_castleHP < GlobalVars.teams[teamNum].castle.unit.Health)) {
                    victory_teamNum  = teamNum;
                    victory_castleHP = GlobalVars.teams[teamNum].castle.unit.Health;
                }
            }
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (teamNum == victory_teamNum) {
                    for (var settlement of GlobalVars.teams[teamNum].settlements) {
                        settlement.Existence.ForceVictory();
                    }
                } else {
                    for (var settlement of GlobalVars.teams[teamNum].settlements) {
                        settlement.Existence.ForceTotalDefeat();
                    }
                }
            }
            return;
        } else if (gameTickNum % 50 == 0) {
            // присуждаем поражение, если замок уничтожен
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (GlobalVars.teams[teamNum].settlementsIdx.length == 0) {
                    continue;
                }

                if (GlobalVars.teams[teamNum].castle.unit.IsDead && GlobalVars.teams[teamNum].castle.unit.ScriptData.DefenceFromTeimur_IsDefeat == undefined) {
                    GlobalVars.teams[teamNum].castle.unit.ScriptData.DefenceFromTeimur_IsDefeat = true;
                    for (var settlement of GlobalVars.teams[teamNum].settlements) {
                        settlement.Existence.ForceTotalDefeat();
                    }
                }
            }

            // проверяем не уничтожены ли все замки
            var allCastlesDead = true;
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (GlobalVars.teams[teamNum].settlementsIdx.length == 0) {
                    continue;
                }

                if (!GlobalVars.teams[teamNum].castle.unit.IsDead) {
                    allCastlesDead = false;
                    break;
                }
            }
            if (allCastlesDead) {
                GlobalVars.gameState = GameState.End;
                return;
            }
        }

        // оповещаем сколько осталось до конца
        
        if (gameTickNum % (30 * FPS) == 0) {
            var secondsLeft = Math.round(GlobalVars.attackPlan.waves[GlobalVars.attackPlan.waves.length - 1].gameTickNum - gameTickNum) / FPS;
            var minutesLeft = Math.floor(secondsLeft / 60);
            secondsLeft    -= minutesLeft * 60;
            secondsLeft     = Math.round(secondsLeft);
            broadcastMessage("Осталось продержаться " + (minutesLeft > 0 ? minutesLeft + " минут " : "") + secondsLeft + " секунд", createHordeColor(255, 100, 100, 100));
        }

        // спавним врагов

        if (GlobalVars.attackPlan.waves[GlobalVars.attackPlan.waveNum].gameTickNum < gameTickNum) {
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (GlobalVars.teams[teamNum].settlementsIdx.length == 0 ||
                    GlobalVars.teams[teamNum].castle.unit.IsDead) {
                    continue;
                }

                GlobalVars.teams[teamNum].spawner.SpawnWave(GlobalVars.attackPlan.waves[GlobalVars.attackPlan.waveNum]);
            }
            GlobalVars.attackPlan.waveNum++;
        }

        if (gameTickNum % 50 == 1) {
            for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
                if (GlobalVars.teams[teamNum].settlementsIdx.length == 0 ||
                    GlobalVars.teams[teamNum].castle.unit.IsDead) {
                    continue;
                }
                GlobalVars.teams[teamNum].spawner.OnEveryTick(gameTickNum);
            }
        }

        // обработка юнитов

        for (var unitNum = 0; unitNum < GlobalVars.units.length; unitNum++) {
            if (GlobalVars.units[unitNum].unit.IsDead) {
                GlobalVars.units[unitNum].OnDead(gameTickNum);
                GlobalVars.units.splice(unitNum--, 1);
                continue;
            }
            if (gameTickNum % 50 == GlobalVars.units[unitNum].processingTick) {
                GlobalVars.units[unitNum].OnEveryTick(gameTickNum);
            }
        }

        // инком

        if (gameTickNum % 50 == 2) {
            GlobalVars.incomePlan.OnEveryTick(gameTickNum);
        }
    }

    private End(gameTickNum: number) {
        // подводим итоги
    }
}
