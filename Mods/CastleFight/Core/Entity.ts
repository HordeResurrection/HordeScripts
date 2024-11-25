import { printObjectItems } from "library/common/introspection";
import { log } from "library/common/logging";
import { COMPONENT_TYPE, IComponent } from "./Components/IComponent";

export class Entity {
    /** компоненты */
    components: Map<COMPONENT_TYPE, IComponent>;

    public constructor() {
        this.components = new Map<COMPONENT_TYPE, IComponent>();
    }
    
    /** клонировать сущность */
    public Clone() : Entity {
        var entity = new Entity();
        for (var componentNum = 0; componentNum < COMPONENT_TYPE.SIZE; componentNum++) {
            var componentType : COMPONENT_TYPE = componentNum;
            var component = this.components.get(componentType);
            if (!component) {
                continue;
            }
            entity.components.set(componentType, component.Clone());
        }

        return entity;
    }

    public Print(depth: number) {
        if (depth < 0) {
            return;
        }
        for (var componentNum = 0; componentNum < COMPONENT_TYPE.SIZE; componentNum++) {
            var componentType : COMPONENT_TYPE = componentNum;
            if (!this.components.has(componentType)) {
                continue;
            }
            log.info("имеется компонент ", componentType.toString());
            if (depth > 0) {
                printObjectItems(this.components.get(componentType), depth - 1);
            }
        }
    }

    /** настройка конфига под сущность */
    public InitConfig(cfg : any) {
        for (var componentNum = 0; componentNum < COMPONENT_TYPE.SIZE; componentNum++) {
            var componentType : COMPONENT_TYPE = componentNum;
            if (!this.components.has(componentType)) {
                continue;
            }
            this.components.get(componentType)?.InitConfig(cfg);
        }
    }
};
