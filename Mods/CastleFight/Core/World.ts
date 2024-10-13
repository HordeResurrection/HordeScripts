import { log } from "library/common/logging";
import { createPoint } from "library/common/primitives";
import { isReplayMode } from "library/game-logic/game-tools";
import { UnitCommand, UnitDirection } from "library/game-logic/horde-types";
import { spawnUnit } from "library/game-logic/unit-spawn";
import { world } from "./CastleFightPlugin";
import { Entity, COMPONENT_TYPE, UnitComponent, ReviveComponent, IncomeEvent, SettlementComponent, IncomeLimitedPeriodicalComponent, UnitProducedEvent } from "./Components/ESC_components";
import { Cell as Cell, getCurrentTime } from "./Utils";
import { OpCfgUidToCfg, OpCfgUidToEntity } from "./Configs/IConfig";
import { Config_Worker } from "./Configs/Config_Worker";
import { Config_Castle } from "./Configs/Config_Castle";
import { UsedConfigs } from "./Configs/Configs";
import { IAttackPathChoiser } from "./AttackPathChoisers";
import { IScena } from "./Scenas";

const PeopleIncomeLevelT = HCL.HordeClassLibrary.World.Settlements.Modules.Misc.PeopleIncomeLevel;
const DeleteUnitParameters = HCL.HordeClassLibrary.World.Objects.Units.DeleteUnitParameters;

export enum GameState {
    INIT = 0,
    PLAY,
    CLEAR,
    END
};

export class World {
    /** выбранная сцена */
    scena : typeof IScena;

    /** ссылки на поселения, если не в игре, то будет null */
    settlements: Array<any>;
    /** для каждого поселения хранит список сущностей */
    settlements_entities: Array<Array<Entity>>;
    /** для каждого поселения хранится ссылка на главного замка */
    settlements_castleUnit: Array<any>;
    /** таблица войны */
    settlements_settlements_warFlag: Array<Array<boolean>>;

    /** текущее состояние игры */
    state: GameState;

    /** для каждой системы хранит функцию */
    systems_func: Array<(world: World, gameTickNum: number)=>void>;
    /** для каждой системы хранит имя */
    systems_name: Array<string>;
    /** для каждой системы хранит время выполнения */
    systems_executionTime: Array<number>;

    /** реальная сцена */
    realScena: any;

    /** для каждого поселения хранит обработчик построенных юнитов */
    unitProducedCallbacks: Array<any>;

    /** параметры */
    castle_health_coeff: number;
    spawn_count_coeff: number;
    
    public constructor ( )
    {
        this.state      = GameState.INIT;

        this.systems_func          = new Array<any>();
        this.systems_name          = new Array<string>();
        this.systems_executionTime = new Array<number>();

        this.castle_health_coeff = 1;
        this.spawn_count_coeff = 1;
    }

    public Init() {
        this.realScena                = ActiveScena.GetRealScena();

        this.settlements              = new Array<any>(this.scena.settlementsCount);
        this.settlements_entities     = new Array<Array<Entity>>(this.scena.settlementsCount);
        this.settlements_castleUnit   = new Array<any>(this.scena.settlementsCount);
        this.settlements_settlements_warFlag = new Array<Array<boolean>>(this.scena.settlementsCount);

        this.unitProducedCallbacks = new Array<any>(this.scena.settlementsCount);

        for (var i = 0; i < this.scena.settlementsCount; i++) {
            this.settlements[i] = null;
            this.settlements_entities[i] = new Array<Entity>();
            this.unitProducedCallbacks[i] = null;
            this.settlements_settlements_warFlag[i] = new Array<boolean>(this.scena.settlementsCount);
        }

        this._InitConfigs();
        this._InitSettlements();
        this._PlaceCastle();
    }

    private _InitConfigs() {
        for (var i = 0; i < UsedConfigs.length; i++) {
            UsedConfigs[i].InitConfig();
        }
        for (var i = 0; i < UsedConfigs.length; i++) {
            UsedConfigs[i].InitEntity();
        }
        for (var i = 0; i < UsedConfigs.length; i++) {
            UsedConfigs[i].Entity.InitConfig(OpCfgUidToCfg[UsedConfigs[i].CfgUid]);
        }
    }

    private _InitSettlements () {
        for (var playerId = 0; playerId < Players.length; playerId++) {
            var realPlayer    = Players[playerId].GetRealPlayer();
            var settlement    = realPlayer.GetRealSettlement();
            var settlementId  = settlement.Uid;

            if (isReplayMode() && !realPlayer.IsReplay) {
                continue;
            }

            // проверяем, что это игрок
            if (settlementId >= this.scena.settlementsCount) {
                continue;
            }

            // если поселение неинициализировано, то инициализируем
            if (this.settlements[settlementId] == null) {
                this.settlements[settlementId] = settlement;

                // создаем сущность для поселения
                {
                    // полное количество дерева на игрока
                    var totalLumberPerPlayer = 4800;
                    // время за которое будет выдано все дерево
                    var totalLumberTime      = 50*60*20;

                    // полное количество золото которое должно быть выдано к определенному моменту времени
                    var goldPerPlayer   = 3600;
                    // время к которому должно быть выдано столько золота
                    var goldTime        = totalLumberTime * 1.5;

                    var entity = new Entity();
                    entity.components.set(COMPONENT_TYPE.SETTLEMENT_COMPONENT, new SettlementComponent(0, 100, 0, goldTime / goldPerPlayer * 100, 0));
                    entity.components.set(COMPONENT_TYPE.INCOME_EVENT, new IncomeEvent(0, 0, 5000 - totalLumberPerPlayer, 1));
                    entity.components.set(COMPONENT_TYPE.INCOME_LIMITED_PERIODICAL_COMPONENT,
                        new IncomeLimitedPeriodicalComponent(0, 0, totalLumberPerPlayer, 0, 0, 100, totalLumberTime / totalLumberPerPlayer * 100, 0))
                    this.settlements_entities[settlementId].push(entity);
                }

                // Отключить прирост населения
                let censusModel = ScriptUtils.GetValue(settlement.Census, "Model");
                censusModel.PeopleIncomeLevels.Clear();
                censusModel.PeopleIncomeLevels.Add(new PeopleIncomeLevelT(0, 0, -1));
                censusModel.LastPeopleIncomeLevel = 0;
                // Установить период сбора налогов и выплаты жалования (чтобы отключить сбор, необходимо установить 0)
                censusModel.TaxAndSalaryUpdatePeriod = 0;

                var that = this;
                // добавляем обработчик создания юнитов
                this.unitProducedCallbacks[settlementId] =
                    this.settlements[settlementId].Units.UnitProduced.connect(function (sender, UnitProducedEventArgs) {
                        try {
                            // создаем событие - постройку юнита
                            var event_entity = new Entity();
                            event_entity.components.set(COMPONENT_TYPE.UNIT_PRODUCED_EVENT, new UnitProducedEvent(UnitProducedEventArgs.ProducerUnit, UnitProducedEventArgs.Unit));
                            that.settlements_entities[UnitProducedEventArgs.ProducerUnit.Owner.Uid].push(event_entity);
                        } catch (ex) {
                            log.exception(ex);
                        }
                    });

                // удаляем лишних юнитов на карте
                var units = this.settlements[settlementId].Units;
                var enumerator = units.GetEnumerator();
                while(enumerator.MoveNext()) {
                    enumerator.Current.Delete();
                }
                enumerator.Dispose();
            }

            // создаем сущность для рабочего для каждого игрока
            for (var workerNum = 0; workerNum < this.scena.settlements_workers_reviveCells[settlementId].length; workerNum++) 
            {
                var baseEntity                  = Config_Worker.Entity;
                var entity                      = baseEntity.Clone();
                var reviveComponent             = entity.components.get(COMPONENT_TYPE.REVIVE_COMPONENT) as ReviveComponent;
                reviveComponent.cell            = this.scena.settlements_workers_reviveCells[settlementId][workerNum];
                reviveComponent.waitingToRevive = true;
                this.settlements_entities[settlementId].push(entity);
            }
        }

        // заполняем таблицу альянсов
        for (var settlementId = 0; settlementId < this.scena.settlementsCount; settlementId++) {
            if (this.settlements[settlementId] == null) {
                continue;
            }
            for (var other_settlementId = 0; other_settlementId < this.scena.settlementsCount; other_settlementId++) {
                if (other_settlementId == settlementId) {
                    this.settlements_settlements_warFlag[settlementId][other_settlementId] = false;
                } else {
                    this.settlements_settlements_warFlag[settlementId][other_settlementId]
                        = this.settlements[settlementId].Diplomacy.IsWarStatus(this.settlements[other_settlementId]);
                }
            }
        }
    }

    private _PlaceCastle() {
        var unitsMap        = this.realScena.UnitsMap;

        for (var settlementId = 0; settlementId < this.scena.settlementsCount; settlementId++) {
            // проверяем, что поселение в игре
            if (!this.settlements[settlementId]) {
                continue;
            }

            var castleUnit = unitsMap.GetUpperUnit(this.scena.settlements_castle_cell[settlementId].X, this.scena.settlements_castle_cell[settlementId].Y);
            if (castleUnit) {
                this.settlements_castleUnit[settlementId] = castleUnit;                    
            } else {
                this.settlements_castleUnit[settlementId] = spawnUnit(
                    this.settlements[settlementId],
                    OpCfgUidToCfg[Config_Castle.CfgUid],
                    createPoint(this.scena.settlements_castle_cell[settlementId].X, this.scena.settlements_castle_cell[settlementId].Y),
                    UnitDirection.Down
                );
            }
        }
    }

    public IsSettlementInGame (settlementId: number) {
        return this.settlements[settlementId] &&
            this.settlements_castleUnit[settlementId] &&
            !this.settlements_castleUnit[settlementId].IsDead;
    }

    /** загеристрировать систему */
    public RegisterSystem(system_func: (world: World, gameTickNum: number)=>void, system_name: string) {
        this.systems_func.push(system_func);
        this.systems_name.push(system_name);
        this.systems_executionTime.push(0.0);
    }

    /** запустить следующую систему */
    public RunSystems(gameTickNum: number) {
        var systemId = gameTickNum % Math.max(50, this.systems_func.length);
        if (this.systems_func.length <= systemId) {
            return;
        }

        var time : number = getCurrentTime();

        this.systems_func[systemId](this, gameTickNum);
        
        time = getCurrentTime() - time;
        this.systems_executionTime[systemId] += time;
    }

    /** вывести статистику времени выполнения */
    public PrintTimeStat() {
        var statStr : string = "";
        for (var settlementId = 0; settlementId < this.scena.settlementsCount; settlementId++) {
            statStr += "settlement " + settlementId + ", entities " + this.settlements_entities[settlementId].length + "\n";
        }
        for (var systemId = 0; systemId < this.systems_func.length; systemId++) {
            statStr += systemId + " " + this.systems_name[systemId] + " : " + this.systems_executionTime[systemId] + " milliseconds\n";
        }
        log.info(statStr);
    }

    /**
     * зарегистрировать в мире сущность для юнита, также идет автозаполнение компонентов в зависимости от поселения
     * @param unit юнит для которого нужно зарегистрировать сущность
     * @param baseEntity базовая сущность, на основе которого будет создана новая (если нет, то берется по умолчанию)
     * @returns вернет ссылку на сущность юнита
     */
    public RegisterUnitEntity(unit: any, baseEntity?: Entity) {
        var settlementId = unit.Owner.Uid;

        // создаем сущность
        var newEntity : Entity;

        if (baseEntity == undefined) {
            baseEntity = OpCfgUidToEntity.get(unit.Cfg.Uid) as Entity;
        }
        newEntity = baseEntity.Clone();

        // настройка
        if (newEntity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
            var newEntity_unitComponent = newEntity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            newEntity_unitComponent.unit = unit;
        }

        // если это здание, то запрещаем самоуничтожение
        if (unit.Cfg.IsBuilding) {
            var commandsMind       = unit.CommandsMind;
            var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");
            disallowedCommands.Add(UnitCommand.DestroySelf, 1);
        }
        
        // регистрируем сущность
        world.settlements_entities[settlementId].push(newEntity);

        return newEntity;
    }
};
