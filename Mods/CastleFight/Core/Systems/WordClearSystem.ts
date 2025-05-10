import { BuffableComponent, BUFF_TYPE } from "../Components/BuffableComponent";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { UnitComponent } from "../Components/UnitComponent";
import { OpCfgUidToCfg } from "../Configs/IConfig";
import { World, GameState } from "../World";

export function WordClearSystem(world: World, gameTickNum: number) {
    // если сейчас идет очистка мира, то удаляем кастомные конфиги
    if (world.state == GameState.CLEAR) {
        for (var cfgId in OpCfgUidToCfg) {
            HordeContentApi.RemoveConfig(OpCfgUidToCfg[cfgId]);
            delete OpCfgUidToCfg[cfgId];
        }
    }

    var killUnitsCount = 0;

    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
        if (!world.settlements[settlementId]) {
            continue;
        }

        // если юнит убит, то удаляем сущность
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i];

            var needDelete : boolean = false;

            if (entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT) &&
                !entity.components.has(COMPONENT_TYPE.REVIVE_COMPONENT)) {
                var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            
                // проверка, что юнит мертвый, тогда нужно удалить
                needDelete = !unitComponent.unit || unitComponent.unit.IsDead;
            } else if (entity.components.size == 0) {
                needDelete = true;
            }

            if (needDelete) {
                // если юнит был баффнут, то нужно удалить клонированный конфиг
                if (entity.components.has(COMPONENT_TYPE.BUFFABLE_COMPONENT)) {
                    var buffableComponent = entity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;
                    if (buffableComponent.buffType != BUFF_TYPE.EMPTY && buffableComponent.buffCfg) {
                        HordeContentApi.RemoveConfig(buffableComponent.buffCfg);
                    }
                }

                world.settlements_entities[settlementId].splice(i--, 1);
            }
        }

        // если замок уничтожен или очистка игры, то удаляем всех юнитов
        if (world.state == GameState.CLEAR ||
            (world.settlements_castleUnit[settlementId] &&
             world.settlements_castleUnit[settlementId].IsDead)) {
            // уничтожаем замок если жив

            if (!world.settlements_castleUnit[settlementId].IsDead) {
                world.settlements_castleUnit[settlementId].Delete()
                killUnitsCount++;
            }

            // убиваем всех юнитов, чтобы их почистила система очистки

            var unitsEnumerator = world.settlements[settlementId].Units.GetEnumerator();
            while (unitsEnumerator.MoveNext()) {
                var unit = unitsEnumerator.Current;

                if (unit.IsDead) {
                    continue;
                }

                unit.Delete();
                killUnitsCount++;
            }
            unitsEnumerator.Dispose();
        }
    }

    // если сейчас идет очистка и ни один юнит не убит, то объявляем конец игры
    if (killUnitsCount == 0 && world.state == GameState.CLEAR) {
        world.state = GameState.END;
    }
}
