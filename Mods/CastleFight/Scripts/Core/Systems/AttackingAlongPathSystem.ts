import { UnitCommand, UnitSpecification } from "library/game-logic/horde-types";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { Cell, distance_Chebyshev, UnitGiveOrderToCell, UnitGiveOrderToNearEmptyCell } from "../Utils";
import { World } from "../World";
import { OpCfgUidToCfg } from "../Configs/IConfig";
import { Config_Castle } from "../Configs/Config_Castle";
import { AttackingAlongPathComponent } from "../Components/AttackingAlongPathComponent";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { UnitComponent } from "../Components/UnitComponent";
import { Entity } from "../Entity";

class CellOfEnemyAttackingCastle {
    cell: Cell;
    distanceToCastle: number;

    constructor(cell: Cell, distanceToCastle: number) {
        this.cell             = cell;
        this.distanceToCastle = distanceToCastle;
    }
};

/** радиус реагирования на врага, который атакует наш замок */
const deffenceReactionRadius = 30;
/** радиус реагирования на текущую точку пути атаки, если <= то отправляем в следующую точку */
const pathNodeReactionRadius = 5;
/** для каждого поселения хранит позиции врагов, атакующие замок */
var settlements_sortedCellsOfEnemiesAttackingCastle : Array<Array<CellOfEnemyAttackingCastle>>;
/** текущий номер позиции */
var settlements_currCellNum : Array<number>;

export function AttackingAlongPathSystem_stage1(world: World, gameTickNum: number) {
    // подготавливаем массив

    if (settlements_sortedCellsOfEnemiesAttackingCastle == null) {
        settlements_sortedCellsOfEnemiesAttackingCastle = new Array<Array<CellOfEnemyAttackingCastle>>(world.scena.settlementsCount);
        for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
            settlements_sortedCellsOfEnemiesAttackingCastle[settlementId] = new Array<CellOfEnemyAttackingCastle>();
        }
    } else {
        for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
            settlements_sortedCellsOfEnemiesAttackingCastle[settlementId].splice(0);
        }
    }

    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (!entity.components.has(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT) ||
                !entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                continue;
            }

            var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            //var unitCell  = new Cell(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y);

            // проверяем, что враг вблизи замка врага
            // var enemyCastleNearby = false;
            // for (var other_settlementId = 0; other_settlementId < world.settlementsCount; other_settlementId++) {
            //     if (other_settlementId == settlementId) {
            //         continue;
            //     }
            //     if (!world.IsSettlementInGame(other_settlementId)) {
            //         continue;
            //     }
            //     if (!world.settlements_settlements_warFlag[settlementId][other_settlementId]) {
            //         continue;
            //     }
            //     if (distance_Chebyshev(unitCell.X, unitCell.Y, world.settlements_castle_cell[other_settlementId].X, world.settlements_castle_cell[other_settlementId].Y) < deffenceReactionRadius) {
            //         enemyCastleNearby = true;
            //         break;
            //     }
            // }
            // if (!enemyCastleNearby) {
            //     continue;
            // }

            // проверяем, что юнит кого-то бьет
            if (!unitComponent.unit.OrdersMind.ActiveOrder.Target) {
                continue;
            }

            var targetCastleUnit = unitComponent.unit.OrdersMind.ActiveOrder.Target;
            // проверяем, что это чей-то замок
            if (targetCastleUnit.Cfg.Uid != Config_Castle.CfgUid) {
                continue;
            }
            // проверяем, что замок в радиусе атаки
            var distanceToCastle = distance_Chebyshev(
                unitComponent.unit.Cell.X,
                unitComponent.unit.Cell.Y,
                targetCastleUnit.Cell.X,
                targetCastleUnit.Cell.Y);
            if (distanceToCastle > 1.5*OpCfgUidToCfg[unitComponent.cfgUid].OrderDistance) {
                continue;
            }

            // заносим в список
            settlements_sortedCellsOfEnemiesAttackingCastle[targetCastleUnit.Owner.Uid]
                .push(new CellOfEnemyAttackingCastle(new Cell(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y), distanceToCastle));
        }
    }

    // сортируем по расстоянию до замка

    // for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
    //     if (!world.IsSettlementInGame(settlementId)) {
    //         continue;
    //     }
    //     settlements_sortedCellsOfEnemiesAttackingCastle[targetCastleUnit.Owner.Uid].sort(
    //         (a, b) => a.distanceToCastle - b.distanceToCastle
    //     );
    // }

    // отладочная информация

    // for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
    //     if (!world.IsSettlementInGame(settlementId)) {
    //         continue;
    //     }
    //     if (settlements_sortedCellsOfEnemiesAttackingCastle[settlementId].length == 0) {
    //         continue;
    //     }
    //     log.info(settlementId, " = ", settlements_sortedCellsOfEnemiesAttackingCastle[settlementId].length);
    //     for (var i = 0; i < settlements_sortedCellsOfEnemiesAttackingCastle[settlementId].length; i++) {
    //         log.info("\ti = ", i,
    //         " distance = ", settlements_sortedCellsOfEnemiesAttackingCastle[settlementId][i].distanceToCastle,
    //         " pos = ", settlements_sortedCellsOfEnemiesAttackingCastle[settlementId][i].cell.X, " ", settlements_sortedCellsOfEnemiesAttackingCastle[settlementId][i].cell.Y);
    //     }
    // }
}

export function AttackingAlongPathSystem_stage2(world: World, gameTickNum: number) {
    var   unitsMap               = world.realScena.UnitsMap;

    // подготавливаем массивы

    if (!settlements_currCellNum) {
        settlements_currCellNum = new Array<number>(world.scena.settlementsCount);
    } else {
        for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
            settlements_currCellNum[settlementId] = 0;
        }
    }

    // отдаем приказы

    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        var castleUnit_settlementId = world.settlements_castleUnit[settlementId].Owner.Uid;

        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (!entity.components.has(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT) ||
                !entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                continue;
            }

            var unitComponent               = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            var attackingAlongPathComponent = entity.components.get(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT) as AttackingAlongPathComponent;

            if (!unitComponent.unit || unitComponent.unit.IsDead) {
                continue;
            }

            var isAttackPathNull = !attackingAlongPathComponent.attackPath;
            var unitCell         = new Cell(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y);

            // если юнит вообще не знает куда идти, то выбираем путь атаки
            
            if (isAttackPathNull) {
                attackingAlongPathComponent.selectedAttackPathNum = world.scena.settlements_attackPathChoiser[settlementId].choiseAttackPath(unitComponent.unit, world);
                attackingAlongPathComponent.attackPath            = Array.from(world.scena.settlements_attack_paths[settlementId][attackingAlongPathComponent.selectedAttackPathNum]);
                attackingAlongPathComponent.currentPathPointNum   = 0;
            }
            
            // юнит дошел то точки

            if (distance_Chebyshev(unitCell.X, unitCell.Y,
                attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].X,
                attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].Y) <= pathNodeReactionRadius) {
                
                // проверка, что в ячейке нету вражеского замка
                var unitInCell = unitsMap.GetUpperUnit(attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].X, attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].Y);
                if (unitInCell &&
                    unitInCell.Cfg.Uid == Config_Castle.CfgUid &&
                    unitInCell.Owner.Uid < world.scena.settlementsCount &&
                    world.settlements_settlements_warFlag[settlementId][unitInCell.Owner.Uid]) {
                    continue;
                }

                attackingAlongPathComponent.currentPathPointNum++;

                // проверяем, что точка последняя
                if (attackingAlongPathComponent.currentPathPointNum == attackingAlongPathComponent.attackPath.length) {
                    var prevSelectedAttackPathNum = attackingAlongPathComponent.selectedAttackPathNum;

                    // выбираем новый путь

                    attackingAlongPathComponent.selectedAttackPathNum = world.scena.settlements_attackPathChoiser[settlementId].choiseAttackPath(unitComponent.unit, world);
                    attackingAlongPathComponent.attackPath            = Array.from(world.scena.settlements_attack_paths[settlementId][attackingAlongPathComponent.selectedAttackPathNum]);
                    attackingAlongPathComponent.currentPathPointNum   = 0;

                    // чтобы юниты не слонялись по карте, то юнитов отсылаем назад по предыдущему пути + замок
                    
                        // добавляем путь до замка

                    attackingAlongPathComponent.attackPath.unshift(
                        new Cell(world.settlements_castleUnit[settlementId].Cell.X, world.settlements_castleUnit[settlementId].Cell.Y));

                        // добавляем вначало путь обратно

                    var prevAttackPath = world.scena.settlements_attack_paths[settlementId][prevSelectedAttackPathNum];
                    for (var j = 0; j < prevAttackPath.length; j++) {
                        attackingAlongPathComponent.attackPath.unshift(prevAttackPath[j]);
                    }
                }

                UnitGiveOrderToNearEmptyCell(unitComponent.unit,
                    attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                    UnitCommand.Attack,
                    AssignOrderMode.Replace);
                
                continue;
            }

            // защита замка

            if (settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId].length > 0) {
                if (distance_Chebyshev(
                    unitCell.X,
                    unitCell.Y,
                    world.settlements_castleUnit[settlementId].Cell.X,
                    world.settlements_castleUnit[settlementId].Cell.Y) < deffenceReactionRadius) {
                    /** вектор атаки */
                    var attackVector = new Cell(
                        attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].X - unitComponent.unit.Cell.X,
                        attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum].Y - unitComponent.unit.Cell.Y);
                    var vectorInvLength = 1.0 / Math.sqrt(attackVector.X*attackVector.X + attackVector.Y*attackVector.Y);
                    attackVector.X *= vectorInvLength;
                    attackVector.Y *= vectorInvLength;
                    /** тип атаки юнита 0 - дальник, 1 ближник, 2 - всадник */
                    var unitAttackType = 
                        OpCfgUidToCfg[unitComponent.cfgUid].MainArmament.Range > 1 ? 0
                        : OpCfgUidToCfg[unitComponent.cfgUid].Specification.HasFlag(UnitSpecification.Rider) ? 1
                        : 2;

                    // ищем врага, атакующего наш замок

                    var goalPos_num      = -1;
                    var goalPos_distance = 10000;

                        // ближайший враг

                    // дальники атакуют ближних к себе
                    if (unitAttackType == 0) {
                        for (var posNum = 0; posNum < settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId].length; posNum++) {
                            var enemyX = settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][posNum].cell.X;
                            var enemyY = settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][posNum].cell.Y;
                            
                            var vectorToEnemy = new Cell(enemyX - unitCell.X, enemyY - unitCell.Y);
                            vectorInvLength = 1.0 / Math.sqrt(vectorToEnemy.X*vectorToEnemy.X + vectorToEnemy.Y*vectorToEnemy.Y);
                            vectorToEnemy.X *= vectorInvLength;
                            vectorToEnemy.Y *= vectorInvLength;
        
                            // проверяем, что враг на пути атаки
                            // < 0    - 2*90  градусов
                            // < -0.5 - 2*120 градусов
        
                            if (attackVector.X*vectorToEnemy.X + attackVector.Y*vectorToEnemy.Y < 0) {
                                continue;
                            }
        
                            /** расстояние до цели */
                            var distanceToEnemy = distance_Chebyshev(
                                unitCell.X,
                                unitCell.Y,
                                enemyX,
                                enemyY);

                            if (goalPos_num == -1 || distanceToEnemy < goalPos_distance) {
                                goalPos_num      = posNum;
                                goalPos_distance = distanceToEnemy;
                            }
                        }
                    }
                    // всадники атакуют дальних относительно замка
                    else if (unitAttackType == 1) {
                        for (var posNum = settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId].length - 1; posNum >= 0; posNum--) {
                            var enemyX = settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][posNum].cell.X;
                            var enemyY = settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][posNum].cell.Y;
                            
                            var vectorToEnemy = new Cell(enemyX - unitCell.X, enemyY - unitCell.Y);
                            vectorInvLength = 1.0 / Math.sqrt(vectorToEnemy.X*vectorToEnemy.X + vectorToEnemy.Y*vectorToEnemy.Y);
                            vectorToEnemy.X *= vectorInvLength;
                            vectorToEnemy.Y *= vectorInvLength;
        
                            // проверяем, что враг на пути атаки
                            // < 0    - 2*90  градусов
                            // < -0.5 - 2*120 градусов
        
                            if (attackVector.X*vectorToEnemy.X + attackVector.Y*vectorToEnemy.Y < 0) {
                                continue;
                            }

                            goalPos_num      = posNum;
                            goalPos_distance = settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][posNum].distanceToCastle;
                            break;
                        }
                    }
                    // ближники атакуют ближних относительно замка
                    else {
                        for (var posNum = 0; posNum < settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId].length; posNum++) {
                            var enemyX = settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][posNum].cell.X;
                            var enemyY = settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][posNum].cell.Y;
                            
                            var vectorToEnemy = new Cell(enemyX - unitCell.X, enemyY - unitCell.Y);
                            vectorInvLength = 1.0 / Math.sqrt(vectorToEnemy.X*vectorToEnemy.X + vectorToEnemy.Y*vectorToEnemy.Y);
                            vectorToEnemy.X *= vectorInvLength;
                            vectorToEnemy.Y *= vectorInvLength;
        
                            // проверяем, что враг на пути атаки
                            // < 0    - 2*90  градусов
                            // < -0.5 - 2*120 градусов
        
                            if (attackVector.X*vectorToEnemy.X + attackVector.Y*vectorToEnemy.Y < 0) {
                                continue;
                            }
        
                            goalPos_num      = posNum;
                            goalPos_distance = settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][posNum].distanceToCastle;
                            break;
                        }
                    }

                    // нашелся юнит по пути атаки идем его атаковать
                    if (goalPos_num != -1) {
                        // дальников в свободную точку отправляем
                        if (unitAttackType == 0) {
                            UnitGiveOrderToNearEmptyCell(unitComponent.unit,
                                settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][goalPos_num].cell,
                                UnitCommand.Attack,
                                AssignOrderMode.Replace);
                        }
                        // ближников, всадники напрявляем прям за головой
                        else {
                            UnitGiveOrderToCell(unitComponent.unit,
                                settlements_sortedCellsOfEnemiesAttackingCastle[castleUnit_settlementId][goalPos_num].cell,
                                UnitCommand.Attack,
                                AssignOrderMode.Replace);
                        }
                    }
                    // если юнит только появился
                    else if (isAttackPathNull) {
                        // сначала идем на базу
                        UnitGiveOrderToNearEmptyCell(unitComponent.unit,
                            world.scena.settlements_castle_cell[settlementId],
                            UnitCommand.Attack,
                            AssignOrderMode.Replace);
                        // потом на следующую точку
                        UnitGiveOrderToNearEmptyCell(unitComponent.unit,
                            attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                            UnitCommand.Attack,
                            AssignOrderMode.Queue);
                    } else if (unitComponent.unit.OrdersMind.IsIdle()) {
                        // идем на следующую точку
                        UnitGiveOrderToNearEmptyCell(unitComponent.unit,
                            attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                            UnitCommand.Attack,
                            AssignOrderMode.Queue);
                    }
                } else if (isAttackPathNull) {
                    // сначала идем на базу
                    UnitGiveOrderToNearEmptyCell(unitComponent.unit,
                        world.scena.settlements_castle_cell[settlementId],
                        UnitCommand.Attack,
                        AssignOrderMode.Replace);
                    // потом на следующую точку
                    UnitGiveOrderToNearEmptyCell(unitComponent.unit,
                        attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                        UnitCommand.Attack,
                        AssignOrderMode.Queue);
                } else if (unitComponent.unit.OrdersMind.IsIdle()) {
                    // идем на следующую точку
                    UnitGiveOrderToNearEmptyCell(unitComponent.unit,
                        attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                        UnitCommand.Attack,
                        AssignOrderMode.Queue);
                }
            } else if (unitComponent.unit.OrdersMind.IsIdle()) {
                // идем на следующую точку
                UnitGiveOrderToNearEmptyCell(unitComponent.unit,
                    attackingAlongPathComponent.attackPath[attackingAlongPathComponent.currentPathPointNum],
                    UnitCommand.Attack,
                    AssignOrderMode.Queue);
            }
        }
    }
}