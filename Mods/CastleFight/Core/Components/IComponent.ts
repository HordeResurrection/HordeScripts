export enum COMPONENT_TYPE {
    UNIT_COMPONENT = 0,
    SPAWN_BUILDING_COMPONENT,
    ATTACKING_ALONG_PATH_COMPONENT,
    SETTLEMENT_COMPONENT,
    REVIVE_COMPONENT,
    UPGRADABLE_BUILDING_COMPONENT,
    BUFFABLE_COMPONENT,
    BUFF_COMPONENT,

    HERO_COMPONENT,
    HERO_ALTAR_COMPONENT,

    INCOME_INCREASE_COMPONENT,
    INCOME_LIMITED_PERIODICAL_COMPONENT,
    /**
     * событие разового дохода
     */ 
    INCOME_EVENT,
    INCOME_INCREASE_EVENT,
    UNIT_PRODUCED_EVENT,
    SPAWN_EVENT,

    SIZE
}; 

export class IComponent {
    /** ид компонента */
    id: COMPONENT_TYPE;

    public constructor(id:COMPONENT_TYPE) {
        this.id = id;
    }

    public Clone() : IComponent {
        return new IComponent(this.id);
    }

    /** настройка конфига под сущность */
    public InitConfig(cfg : any) {}
};
