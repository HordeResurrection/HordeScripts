import { generateCellInSpiral } from "library/common/position-tools";
import { UnitDirection } from "library/game-logic/horde-types";
import { OpCfgUidToCfg } from "../Configs/IConfig";
import { spawnUnits } from "../Utils";
import { World } from "../World";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { ReviveComponent } from "../Components/ReviveComponent";
import { UnitComponent } from "../Components/UnitComponent";
import { Entity } from "../Entity";

export function ReviveSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        // обрабатываем сущности с ReviveComponent и UnitComponent
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (entity.components.has(COMPONENT_TYPE.REVIVE_COMPONENT) && entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                var reviveComponent = entity.components.get(COMPONENT_TYPE.REVIVE_COMPONENT) as ReviveComponent;

                // проверяем, что юнит умер
                if (unitComponent.unit && !unitComponent.unit.IsDead) {
                    continue;
                }

                // юнит ждет воскрешения
                if (reviveComponent.waitingToRevive) {
                    // проверяем, что пришло время воксрешать
                    if (reviveComponent.tick < gameTickNum) {
                        reviveComponent.waitingToRevive = false;
                        var generator      = generateCellInSpiral(reviveComponent.cell.X, reviveComponent.cell.Y);
                        unitComponent.unit = spawnUnits(world.settlements[settlementId], OpCfgUidToCfg[unitComponent.cfgUid], 1, UnitDirection.Down, generator)[0];
                    }
                }
                // регистрируем смерть и запускаем обратный отсчет до воскрешения
                else {
                    reviveComponent.waitingToRevive = true;
                    reviveComponent.tick = gameTickNum + reviveComponent.reviveTicks;
                }
            }
        }
    }
}
