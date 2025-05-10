import { COMPONENT_TYPE } from "../Components/IComponent";
import { UnitProducedEvent } from "../Components/UnitProducedEvent";
import { OpCfgUidToEntity } from "../Configs/IConfig";
import { Entity } from "../Entity";
import { World } from "../World";

export function UnitProducedSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (!entity.components.has(COMPONENT_TYPE.UNIT_PRODUCED_EVENT)) {
                continue;
            }

            var unitProducedEvent = entity.components.get(COMPONENT_TYPE.UNIT_PRODUCED_EVENT) as UnitProducedEvent;

            // дожидаемся полной постройки юнита
            if (unitProducedEvent.producedUnit.EffectsMind.BuildingInProgress) {
                continue;
            }

            // проверяем, что у нового юнита есть сущность
            if (OpCfgUidToEntity.has(unitProducedEvent.producedUnit.Cfg.Uid)) {
                world.RegisterUnitEntity(unitProducedEvent.producedUnit);
            }

            // удаляем событие
            entity.components.delete(COMPONENT_TYPE.UNIT_PRODUCED_EVENT);
        }
    }
}