import { IComponent, COMPONENT_TYPE } from "./IComponent";

/** тип баффа */
export enum BUFF_TYPE {
    EMPTY = 0,
    ATTACK,
    ACCURACY,
    HEALTH,
    DEFFENSE,
    CLONING,

    SIZE
};

/** тип оптимальной цели */
export enum BuffOptTargetType {
    Melle = 0,
    Range,
    All
};


/** Компонент с информацией о текущем бафе, его наличие означает, что юнита можно баффать */
export class BuffableComponent extends IComponent {
    /** тип наложенного баффа на юнита */
    buffType: BUFF_TYPE;
    /** баффнутый Cfg */
    buffCfg: any;
    /** маска доступных баффов */
    buffMask: Array<boolean>;

    /** оптимальная цель баффа */
    public static BuffsOptTarget = [
        BuffOptTargetType.All,
        BuffOptTargetType.Melle,
        BuffOptTargetType.Range,
        BuffOptTargetType.All,
        BuffOptTargetType.All,
        BuffOptTargetType.All
    ];

    /** суффик в имени конфига для баффнутого юнита */
    public static BuffCfgUidSuffix = [
        "",
        "_buffAttack",
        "_buffAccuracy",
        "_buffHealth",
        "_buffDeffense",
        "_buffCloning",
        ""
    ];

    public constructor(buffMask?: Array<boolean>, buffType?: BUFF_TYPE, buffCfg?: any) {
        super(COMPONENT_TYPE.BUFFABLE_COMPONENT);

        if (buffType) {
            this.buffType = buffType;
        } else {
            this.buffType = BUFF_TYPE.EMPTY;
        }
        if (buffCfg) {
            this.buffCfg = buffCfg;
        } else {
            this.buffCfg = null;
        }
        if (buffMask) {
            this.buffMask = buffMask;
        } else {
            this.buffMask = new Array<boolean>(BUFF_TYPE.SIZE);
            for (var i = 0; i < BUFF_TYPE.SIZE; i++) {
                this.buffMask[i] = true;
            }
        }
    }

    public Clone() : BuffableComponent {
        return new BuffableComponent(this.buffMask, this.buffType, this.buffCfg);
    }
};