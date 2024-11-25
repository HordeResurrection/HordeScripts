import { generateCellInSpiral } from "library/common/position-tools";
import { UnitDirection } from "library/game-logic/horde-types";
import { OpCfgUidToCfg } from "../Configs/IConfig";
import { spawnUnits, UnitDisallowCommands } from "../Utils";
import { World } from "../World";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { SpawnBuildingComponent } from "../Components/SpawnBuildingComponent";
import { SpawnEvent } from "../Components/SpawnEvent";
import { UnitComponent } from "../Components/UnitComponent";
import { Entity } from "../Entity";

export function SpawnSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                if (entity.components.has(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT)) {
                    var unitComponent          = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                    // проверка, что юнит жив
                    if (!unitComponent.unit || unitComponent.unit.IsDead) {
                        continue;
                    }

                    var spawnBuildingComponent = entity.components.get(COMPONENT_TYPE.SPAWN_BUILDING_COMPONENT) as SpawnBuildingComponent;

                    // проверяем, что здание что-то строит
                    if (unitComponent.unit.OrdersMind.ActiveAct.GetType().Name == "ActProduce") {
                        var buildingCfg = unitComponent.unit.OrdersMind.ActiveOrder.ProductUnitConfig;
                        // проверяем, если здание хочет сбросить таймер спавна
                        if (buildingCfg.Uid == SpawnBuildingComponent.resetSpawnCfgUid) {
                            // отменяем постройку
                            unitComponent.unit.OrdersMind.CancelOrdersSafe(true);
                            // сбрасываем спавн
                            spawnBuildingComponent.spawnTact = gameTickNum + spawnBuildingComponent.spawnPeriodTact;
                        }
                    }
                    // проверяем, что зданию нужно задать таймер спавна
                    if (spawnBuildingComponent.spawnTact < 0) {
                        spawnBuildingComponent.spawnTact = gameTickNum + spawnBuildingComponent.spawnPeriodTact;
                    }
                    // проверяем, что пора спавнить юнитов
                    else if (spawnBuildingComponent.spawnTact < gameTickNum) {
                        spawnBuildingComponent.spawnTact += spawnBuildingComponent.spawnPeriodTact;
                        
                        var emergePoint = OpCfgUidToCfg[unitComponent.cfgUid].BuildingConfig.EmergePoint;

                        // спавним юнитов
                        var generator     = generateCellInSpiral(unitComponent.unit.Cell.X + emergePoint.X, unitComponent.unit.Cell.Y + emergePoint.Y);
                        var spawnedUnits  = spawnUnits(world.settlements[settlementId], OpCfgUidToCfg[spawnBuildingComponent.spawnUnitConfigUid], spawnBuildingComponent.spawnCount, UnitDirection.Down, generator);
                        for (var spawnedUnit of spawnedUnits) {
                            UnitDisallowCommands(spawnedUnit);
                            world.RegisterUnitEntity(spawnedUnit);
                        }
                    }
                } else if (entity.components.has(COMPONENT_TYPE.SPAWN_EVENT)) {
                    var unitComponent          = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                    // проверка, что юнит жив
                    if (!unitComponent.unit || unitComponent.unit.IsDead) {
                        continue;
                    }

                    var spawnEvent = entity.components.get(COMPONENT_TYPE.SPAWN_EVENT) as SpawnEvent;

                    // проверяем, что пора спавнить юнитов
                    if (spawnEvent.spawnTact < gameTickNum) {
                        // спавним юнитов
                        var generator     = generateCellInSpiral(unitComponent.unit.Cell.X, unitComponent.unit.Cell.Y);
                        var spawnedUnits  = spawnUnits(world.settlements[settlementId], OpCfgUidToCfg[spawnEvent.spawnUnitConfigUid], spawnEvent.spawnCount, UnitDirection.Down, generator);
                        for (var spawnedUnit of spawnedUnits) {
                            UnitDisallowCommands(spawnedUnit);
                            var spawnedEntity = world.RegisterUnitEntity(spawnedUnit);
                            spawnedEntity.components.delete(COMPONENT_TYPE.SPAWN_EVENT);
                        }

                        // удаляем событие
                        entity.components.delete(COMPONENT_TYPE.SPAWN_EVENT);
                    }
                }
            }
        }
    }
}
