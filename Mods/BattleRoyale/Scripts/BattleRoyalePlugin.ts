import { log, LogLevel } from "library/common/logging";
import { generateCellInSpiral, generateRandomCellInRect } from "library/common/position-tools";
import { isReplayMode } from "library/game-logic/game-tools";
import { Settlement, UnitDirection, UnitHurtType } from "library/game-logic/horde-types";
import { spawnUnits } from "library/game-logic/unit-spawn";
import HordePluginBase from "plugins/base-plugin";
import { Factory_Slavyane } from "./Configs/Factory_Slavyane";
import { BuildingTemplate, IFactory } from "./Configs/IFactory";
import { GameField } from "./Core/GameField";
import { createHordeColor } from "library/common/primitives";
import { broadcastMessage } from "library/common/messages";
import { ScriptData_Building } from "./Core/ScriptData_Building";
import { PlayerSettlement } from "./Core/PlayerSettlement";
import { GameSettlement } from "./Core/GameSettlement";
import { GeometryCircle } from "./Core/GeometryCircle";
import { Cell } from "./Core/Cell";
import { Hero_FireArcher } from "./Units/Hero_FireArcher";
import { Hero_Rider } from "./Units/Hero_Rider";
import { Hero_Crusader } from "./Units/Hero_Crusader";
import { IUnit } from "./Units/IUnit";
import { Priest } from "./Units/Priest";
import { Hero_Hunter } from "./Units/Hero_Hunter";
import { IHero } from "./Units/IHero";
import { Hero_Scorpion } from "./Units/Hero_Scorpion";
import { Hero_Totemist } from "./Units/Hero_Totemist";

const PeopleIncomeLevel = HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;
type PeopleIncomeLevel = HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;

enum GameState {
    INIT = 0,
    PLACE = 1,
    SELECT = 2,
    RUN = 3,
    END
}

export class BattleRoyalePlugin extends HordePluginBase {
    _playerSettlements:    Array<PlayerSettlement>;
    _neutralSettlement:    GameSettlement;
    _enemySettlement:      GameSettlement;
    _gameField:            GameField;
    _gameState:            GameState;
    _buildingsTemplate:    Array<BuildingTemplate>;
    _heroesTemplate:       Array<typeof IHero>;

    _playerUidToSettlement: Map<number, number>;

    _units:                Array<IUnit>;

    public constructor() {
        super("Королевская битва");

        this.log.logLevel = LogLevel.Debug;
        this._gameState     = GameState.INIT;

        this._playerSettlements = new Array<PlayerSettlement>();
        this._buildingsTemplate = new Array<BuildingTemplate>();

        this._units = new Array<IUnit>();
        this._playerUidToSettlement = new Map<number, number>();
    }

    public onFirstRun() {
        
    }

    public onEveryTick(gameTickNum: number) {
        if (this._gameState == GameState.RUN) {
            this._Run(gameTickNum);
        } else if (this._gameState == GameState.INIT && gameTickNum > 10) {
            this._Init(gameTickNum);
            this._gameState = GameState.PLACE;
        } else if (this._gameState == GameState.PLACE && gameTickNum > 200) {
            this._Place(gameTickNum);
            this._gameState = GameState.SELECT;
        } else if (this._gameState == GameState.SELECT && gameTickNum > 210) {
            this._Select(gameTickNum);
            this._gameState = GameState.RUN;
        }
    }

    _nextSpawnBuilding: number = 0;
    private _Run(gameTickNum: number) {
        this._playerSettlements.forEach((playerSettlement) => playerSettlement.OnEveryTick(gameTickNum));
        this._gameField.OnEveryTick(gameTickNum);

        for (var unitNum = 0; unitNum < this._units.length; unitNum++) {
            if (this._units[unitNum].OnEveryTick(gameTickNum)) {
                if (this._units[unitNum].hordeUnit.IsDead) {
                    this._units.splice(unitNum--, 1);
                }
            }
        }

        var settlementNum = gameTickNum % 50;
        if (settlementNum < this._playerSettlements.length) {
            if (!this._playerSettlements[settlementNum].isDefeat){
                //  присуждаем  поражение
                if (this._playerSettlements[settlementNum].heroUnit.IsDead()){
                    this._playerSettlements[settlementNum].isDefeat = true;
                    this._playerSettlements[settlementNum].hordeSettlement.Existence.ForceTotalDefeat();
                    this._playerSettlements.forEach((otSettlement, otSettlementNum)=>{
                        if (otSettlementNum ==  settlementNum   ||
                            this._playerSettlements[otSettlementNum].isDefeat)  {
                            return;
                        }

                        this._playerSettlements[settlementNum].hordeSettlement.Diplomacy.DeclareAlliance(otSettlement.hordeSettlement);
                        otSettlement.hordeSettlement.Diplomacy.DeclareAlliance(this._playerSettlements[settlementNum].hordeSettlement);
                    });
                    // удаляем юнитов
                    let enumerator = this._playerSettlements[settlementNum].hordeSettlement.Units.GetEnumerator();
                    while(enumerator.MoveNext()) {
                        var unit = enumerator.Current;
                        if (!unit) continue;
                        
                        unit.Delete();
                    }
                    enumerator.Dispose();
                }
                //  присуждаем    победу
                else{
                    var settlementsInGame = this._playerSettlements.filter((playerSettlement)=>playerSettlement.isDefeat==false).length;
                    if(settlementsInGame==1){
                        this._playerSettlements[settlementNum].hordeSettlement.Existence.ForceVictory();
                        this._gameState=GameState.END;
                    }
                }
            }
        }

        // спавн строений
        if (this._nextSpawnBuilding < gameTickNum && this._gameField.CurrentCircle()) {
            this._nextSpawnBuilding = gameTickNum + 10*50;

            var rnd                 = ActiveScena.GetRealScena().Context.Randomizer;
            var buildingTemplateNum = rnd.RandomNumber(0, this._buildingsTemplate.length - 1);
            var rarityStart         = 10;
            var rarityValue         = rnd.RandomNumber(0, rarityStart*(Math.pow(2, this._buildingsTemplate[buildingTemplateNum].buildings.length) - 1) / (2 - 1));
            var rarityNum           = this._buildingsTemplate[buildingTemplateNum].buildings.length - 1;
            while (rarityValue > rarityStart) {
                rarityValue -= rarityStart;
                rarityNum--;
                rarityStart*=2;
            }
            var circle              = this._gameField.CurrentCircle() as GeometryCircle;
            var circleCenter        = circle.center.Scale(1/32);
            var circleRadius        = circle.radius / 32;
            var generator           = generateRandomCellInRect(
                Math.round(circleCenter.X - circleRadius),
                Math.round(circleCenter.Y - circleRadius),
                Math.round(circleCenter.X + circleRadius),
                Math.round(circleCenter.Y + circleRadius));
            var units               = spawnUnits(
                this._enemySettlement.hordeSettlement,
                this._buildingsTemplate[buildingTemplateNum].buildings[rarityNum].hordeConfig,
                1,
                UnitDirection.RightDown,
                generator);
            units.forEach((unit) => {
                unit.ScriptData.Building = new ScriptData_Building();
                (unit.ScriptData.Building as ScriptData_Building).templateNum = buildingTemplateNum;
            });
        }

        // наносим  урон    юнитам  вне круга
        var settlementNum = gameTickNum % 25;
        var currentCircle = this._gameField.CurrentCircle();
        if  (currentCircle && settlementNum < this._playerSettlements.length)  {
            let enumerator = this._playerSettlements[settlementNum].hordeSettlement.Units.GetEnumerator();
            while(enumerator.MoveNext()) {
                var unit = enumerator.Current;
                if (!unit) continue;

                var unitCell = new Cell(unit.Position.X, unit.Position.Y);
                if (unitCell.Minus(currentCircle.center).Length_L2() > currentCircle.radius) {
                    unit.BattleMind.TakeDamage(unit.Cfg.Shield + 1, UnitHurtType.Mele);
                }
            }
            enumerator.Dispose();
        }
    }

    private _Init(gameTickNum: number) {
        var scenaSettlements = ActiveScena.GetRealScena().Settlements;

        // конфиги героев

        this._heroesTemplate = [
            Hero_Crusader,
            Hero_Rider,
            Hero_FireArcher,
            Hero_Hunter,
            Hero_Scorpion,
            Hero_Totemist
        ];

        // инициализируем строения и юнитов

        var factories : Array<typeof IFactory> = [
            Factory_Slavyane
        ];
        //var allBuildingsTemplate = new Array<BuildingTemplate>();
        factories.forEach((factory) => {
            //allBuildingsTemplate = allBuildingsTemplate.concat(factory.GetBuildings());
            this._buildingsTemplate = this._buildingsTemplate.concat(factory.GetBuildings());
        });

        // убираем дружественный огонь у некоторых снарядов (не работает)
        // {
        //     var bulletCfg = HordeContentApi.GetBulletConfig("#BulletConfig_Fire");
        //     ScriptUtils.SetValue(bulletCfg, "CanDamageAllied", false);
        // }

        // создаем игровое поле
        this._gameField = new GameField(60*50, 100);

        // удаляем всех юнитов на карте
        // таким образом для игры подходит любая карта

        ForEach(scenaSettlements, (settlement : Settlement) => {
            let enumerator = settlement.Units.GetEnumerator();
            while(enumerator.MoveNext()) {
                var unit = enumerator.Current;
                if (unit) unit.Delete();
            }
            enumerator.Dispose();

            // отбираем ресурсы
            settlement.Resources.TakeResources(settlement.Resources.GetCopy());

            // включаем кастомные условия поражения
            var existenceRule        = settlement.RulesOverseer.GetExistenceRule();
            var principalInstruction = ScriptUtils.GetValue(existenceRule, "PrincipalInstruction");
            ScriptUtils.SetValue(principalInstruction, "AlmostDefeatCondition", HordeClassLibrary.World.Settlements.Existence.AlmostDefeatCondition.Custom);
            ScriptUtils.SetValue(principalInstruction, "TotalDefeatCondition", HordeClassLibrary.World.Settlements.Existence.TotalDefeatCondition.Custom);
            ScriptUtils.SetValue(principalInstruction, "VictoryCondition", HordeClassLibrary.World.Settlements.Existence.VictoryCondition.Custom);

            // Отключить прирост населения
            let censusModel = ScriptUtils.GetValue(settlement.Census, "Model");
            censusModel.PeopleIncomeLevels.Clear();
            censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevel(0, 0, -1));
            censusModel.LastPeopleIncomeLevel = 0;
            // Установить период сбора налогов и выплаты жалования (чтобы отключить сбор, необходимо установить 0)
            censusModel.TaxAndSalaryUpdatePeriod = 0;
        });

        // поселение - нейтрал

        this._neutralSettlement = new GameSettlement(scenaSettlements.Item.get('7'));

        // поселение - враг

        this._enemySettlement = new GameSettlement(scenaSettlements.Item.get('6'));
        var that = this;
        // спавним юнитов после уничтожения постройки
        this._enemySettlement.hordeSettlement.Units.UnitsListChanged.connect(
            function (sender, args) {
                if (!args.IsAdded && args.Unit.ScriptData.Building) {
                    var building : ScriptData_Building = args.Unit.ScriptData.Building;

                    var playerSettlement = that._playerSettlements.find((playerSettlement) => playerSettlement.settlementUid == building.lastAttackSettlementUid);

                    if (!playerSettlement) return;

                    var rarityNum = 0;
                    for (;rarityNum < that._buildingsTemplate[building.templateNum].buildings.length; rarityNum++) {
                        if (that._buildingsTemplate[building.templateNum].buildings[rarityNum].hordeConfig.Uid ==
                            args.Unit.Cfg.Uid
                        ) {
                            break;
                        }
                    }

                    var generator = generateCellInSpiral(args.Unit.Cell.X, args.Unit.Cell.Y);
                    // вызываем событие у героя, возможно он что-то переделает
                    var spawnInfo = playerSettlement.heroUnit.OnDestroyBuilding(
                        that._buildingsTemplate[building.templateNum],
                        rarityNum,
                        that._buildingsTemplate[building.templateNum].units[rarityNum],
                        that._buildingsTemplate[building.templateNum].spawnCount
                    );
                    spawnUnits(
                        playerSettlement.hordeSettlement,
                        spawnInfo[0].hordeConfig,
                        spawnInfo[1],
                        UnitDirection.RightDown,
                        generator);
                }
            }
        );
    }

    private _Place(gameTickNum: number) {
        var scenaSettlements = ActiveScena.GetRealScena().Settlements;

        // спавним несколько начальных строений относительно размера карты

        //let scenaWidth  = this._ActiveScena.GetRealScena().Size.Width;
        //let scenaHeight = this._ActiveScena.GetRealScena().Size.Height;
        var rnd         = ActiveScena.GetRealScena().Context.Randomizer;
        //var generator   = generateRandomCellInRect(0, 0, scenaWidth, scenaHeight);
        var generator   = this._gameField.GeneratorRandomCell();

        var spawnBuildingsCount = Math.sqrt(this._gameField.Area() / 15);//3*Math.pow(this._gameField.Area(), 0.25);
        for (var i = 0; i < spawnBuildingsCount; i++) {
            var buildingTemplateNum = rnd.RandomNumber(0, this._buildingsTemplate.length - 1);
            var rarityStart         = 10;
            var rarityValue         = rnd.RandomNumber(0, rarityStart*(Math.pow(2, this._buildingsTemplate[buildingTemplateNum].buildings.length) - 1) / (2 - 1));
            var rarityNum           = this._buildingsTemplate[buildingTemplateNum].buildings.length - 1;
            while (rarityValue > rarityStart) {
                rarityValue -= rarityStart;
                rarityNum--;
                rarityStart*=2;
            }
            var units       = spawnUnits(this._enemySettlement.hordeSettlement,
                this._buildingsTemplate[buildingTemplateNum].buildings[rarityNum].hordeConfig,
                1,
                UnitDirection.RightDown,
                generator);
            units.forEach((unit) => {
                unit.ScriptData.Building = new ScriptData_Building();
                (unit.ScriptData.Building as ScriptData_Building).templateNum = buildingTemplateNum;
            });
        }

        // поселения игроков

        var playerSettlementsUid : Array<number> = new Array<number>();
        for (var player of Players) {
            var realPlayer   = player.GetRealPlayer();
            var settlement   = realPlayer.GetRealSettlement();

            if (isReplayMode() && !realPlayer.IsReplay) {
                continue;
            }
            if (playerSettlementsUid.find((settlementUid) => { return (settlementUid == Number.parseInt(settlement.Uid)); })) {
                continue;
            }
            this.log.info("Замечено поселение ", settlement.Uid);
            playerSettlementsUid.push(Number.parseInt(settlement.Uid));
        }
        playerSettlementsUid.sort();
        var playerHordeSettlements = playerSettlementsUid.map((settlementUid) => scenaSettlements.Item.get(settlementUid + ''));

        // настраиваем дипломатию на карте

        for (var playerSettlementNum = 0; playerSettlementNum < playerHordeSettlements.length; playerSettlementNum++) {
            for (var otherPlayerSettlementNum = playerSettlementNum + 1; otherPlayerSettlementNum < playerHordeSettlements.length; otherPlayerSettlementNum++) {
                playerHordeSettlements[playerSettlementNum].Diplomacy.DeclareWar(playerHordeSettlements[otherPlayerSettlementNum]);
                playerHordeSettlements[otherPlayerSettlementNum].Diplomacy.DeclareWar(playerHordeSettlements[playerSettlementNum]);
            }
            playerHordeSettlements[playerSettlementNum].Diplomacy.DeclareWar(this._enemySettlement.hordeSettlement);
            this._enemySettlement.hordeSettlement.Diplomacy.DeclareWar(playerHordeSettlements[playerSettlementNum]);

            playerHordeSettlements[playerSettlementNum].Diplomacy.DeclarePeace(this._neutralSettlement.hordeSettlement);
            this._neutralSettlement.hordeSettlement.Diplomacy.DeclarePeace(playerHordeSettlements[playerSettlementNum]);
        }
        this._neutralSettlement.hordeSettlement.Diplomacy.DeclarePeace(this._enemySettlement.hordeSettlement);
        this._enemySettlement.hordeSettlement.Diplomacy.DeclarePeace(this._neutralSettlement.hordeSettlement);

        // создаем героя в случайном месте карты и послеения

        var playerSettlements_hordeHeroUnit = new Array<IHero>();
        playerHordeSettlements.forEach(hordeSettlement => {
            var heroConfig = this._heroesTemplate[rnd.RandomNumber(0, this._heroesTemplate.length - 1)];
            var units = spawnUnits(hordeSettlement, heroConfig.GetHordeConfig(), 1, UnitDirection.RightDown, generator);
            playerSettlements_hordeHeroUnit.push(new heroConfig(units[0]));
        });

        // создаем поселения игроков

        var that = this;

        this._playerSettlements = new Array<PlayerSettlement>();
        for (var playerSettlementNum = 0; playerSettlementNum < playerHordeSettlements.length; playerSettlementNum++) {
            this._playerSettlements.push(
                new PlayerSettlement(
                    playerHordeSettlements[playerSettlementNum],
                    playerSettlements_hordeHeroUnit[playerSettlementNum]));
            this._playerUidToSettlement.set(Number.parseInt(this._playerSettlements[playerSettlementNum].hordeSettlement.Uid), playerSettlementNum);

            // записываем какое поселение последним атаковало постройку
            this._playerSettlements[playerSettlementNum].hordeSettlement.Units.UnitCauseDamage.connect(
                function (sender, args) {
                    if (args.VictimUnit.ScriptData.Building) {
                        var building : ScriptData_Building = args.VictimUnit.ScriptData.Building;
                        building.lastAttackSettlementUid = args.TriggeredUnit.Owner.Uid;
                    }
                }
            );
            
            // настраиваем добавление в формацию
            this._playerSettlements[playerSettlementNum].hordeSettlement.Units.UnitSpawned.connect(
                function (sender, args) {
                    // анализируем юнита

                    var unit = new IUnit(args.Unit);
                    var settlementNum = that._playerUidToSettlement.get(Number.parseInt(unit.hordeUnit.Owner.Uid)) as number;
                    that._playerSettlements[settlementNum].formation.AddUnits([unit]);
                    that._playerSettlements[settlementNum].heroUnit.OnAddToFormation(unit);
            });
        }

        // спавним знахарей на карте

        var priestCount = Math.max(1, Math.round(Math.sqrt(this._gameField.Area()) / 30));
        var priestHordeUnits = spawnUnits(this._neutralSettlement.hordeSettlement, Priest.GetHordeConfig(), priestCount, UnitDirection.RightDown, generator);
        for (var hordeUnit of priestHordeUnits) {
            this._units.push(new Priest(hordeUnit, this._gameField, this._enemySettlement, this._playerSettlements));
        }
    }

    private _Select(gameTickNum: number) {
        // выделяем героя игроками

        // for (var player of this._Players) {
        //     var realPlayer   = player.GetRealPlayer();
        //     var settlement   = realPlayer.GetRealSettlement();

        //     if (isReplayMode() && !realPlayer.IsReplay && !this._opSettlementUidToNum.has(settlement.Uid)) {
        //         continue;
        //     }

        //     var settlementNum = this._opSettlementUidToNum.get(settlement.Uid) as number;
        //     var playerVirtualInput = new PlayerVirtualInput(realPlayer);
        //     playerVirtualInput.selectUnitsById([this._settlementsHeroUnit[settlementNum].Id], VirtualSelectUnitsMode.Select);
        // }

        broadcastMessage("Выделяй своего героя и вперед! (ctrl+A -> space)", createHordeColor(255, 255, 55, 55));
    }
};
