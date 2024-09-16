import { UnitProfession, UnitProducerProfessionParams } from "library/game-logic/unit-professions";
import { IUnit } from "../Types/IUnit";
import { CfgAddUnitProducer, ChebyshevDistance, CreateUnitConfig } from "../Utils";
import { AttackPlansClass } from "./AttackPlans";
import { CFGPrefix, GlobalVars, ReplaceUnitParameters } from "../GlobalData";
import { UnitCommand, UnitMapLayer } from "library/game-logic/horde-types";
import { createHordeColor, createPoint } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { iterateOverUnitsInBox } from "library/game-logic/unit-and-map";
import { log } from "library/common/logging";

export class Player_TOWER_BASE extends IUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Goal_Tower";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_Tower";

    private _armamentsMaxDistance   : number;
    private _armamentsTargetEndNum  : Array<number>;
    private _armamentsTargetNextNum : Array<number>;
    private _targetsUnitInfo        : Array<any>;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);

        this._armamentsMaxDistance   = 0;
        this._armamentsTargetEndNum  = new Array<number>();
        this._armamentsTargetNextNum = new Array<number>();
        this._targetsUnitInfo        = new Array<any>();

        this.processingTickModule   = 150;
        this.processingTick         = this.unit.PseudoTickCounter % this.processingTickModule;
    }

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        // ХП
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", 3000);
        // мин ХП
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MinHealth", 0);
        // Броня
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 0);
        // убираем захват
        if (GlobalVars.configs[this.CfgUid].ProfessionParams.ContainsKey(UnitProfession.Capturable)) {
            GlobalVars.configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Capturable);
        }
        // убираем починку
        //if (GlobalVars.configs[this.CfgUid].ProfessionParams.ContainsKey(UnitProfession.Reparable)) {
        //   GlobalVars.configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        //}
        // обнуляем флаги
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Flags", HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Tower").Flags);
        // запрещаем самоуничтожение
        GlobalVars.configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // запрещаем атаку
        GlobalVars.configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.Attack);
        // даем профессию найма
        CfgAddUnitProducer(GlobalVars.configs[this.CfgUid]);
        // очищаем список построек
        var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        produceList.Clear();
        // видимость и дальность атаки делаем = 13
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Sight", 13);
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "OrderDistance", 13);
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "Range", 13);
    }

    public Respawn() {
        let replaceParams                 = new ReplaceUnitParameters();
        replaceParams.OldUnit             = this.unit;
        replaceParams.NewUnitConfig       = GlobalVars.configs[this.unit.Cfg.Uid];
        replaceParams.Cell                = null;  // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
        replaceParams.PreserveHealthLevel = true; // Нужно ли передать уровень здоровья? (в процентном соотношении)
        replaceParams.PreserveOrders      = false; // Нужно ли передать приказы?
        replaceParams.Silent              = true;  // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
        var kills                         = this.unit.KillsCounter;
        this.unit                         = this.unit.Owner.Units.ReplaceUnit(replaceParams);
        this.unit.KillsCounter            = kills;
    }

    public GetTargetUnit(armamentDistance: number): any {
        // если запросили оружие, которое имеет дальность больше максимальной
        if (armamentDistance >= this._armamentsMaxDistance) {

            this._armamentsTargetEndNum.push(this._targetsUnitInfo.length);
            this._armamentsTargetNextNum.push(this._targetsUnitInfo.length - 1);
            this._armamentsMaxDistance++;
            while (armamentDistance >= this._armamentsMaxDistance) {
                this._armamentsTargetEndNum.push(this._targetsUnitInfo.length);
                this._armamentsTargetNextNum.push(this._targetsUnitInfo.length - 1);
                this._armamentsMaxDistance++;
            }
        }

        var targetUnit = null;
        if (this._targetsUnitInfo.length != 0 && this._armamentsTargetEndNum[armamentDistance] > 0) {
            targetUnit = this._targetsUnitInfo[this._armamentsTargetNextNum[armamentDistance]].unit;
            this._armamentsTargetNextNum[armamentDistance]--;
            if (this._armamentsTargetNextNum[armamentDistance] < 0) {
                this._armamentsTargetNextNum[armamentDistance] = this._armamentsTargetEndNum[armamentDistance] - 1;
            }
        }
        return targetUnit;
    }

    public OnEveryTick(gameTickNum: number): void {
        if (this._armamentsMaxDistance != 0) {
            this._targetsUnitInfo = [];

            // ищем ближайшие цели
            let unitsIter = iterateOverUnitsInBox(this.unit.Cell, this._armamentsMaxDistance);
            for (let u = unitsIter.next(); !u.done; u = unitsIter.next()) {
                var _unit = u.value;

                if (_unit.IsDead || _unit.Id == this.unit.Id || _unit.Owner.Uid == GlobalVars.teams[this.teamNum].settlementIdx) {
                    continue;
                }

                // +0.5,+0.5 это чтобы центр башни
                // итоговое расстояние уменьшаем на 1, чтобы расстояние от края башни считалось
                this._targetsUnitInfo.push({unit: _unit, distance: ChebyshevDistance(_unit.Cell.X, _unit.Cell.Y, this.unit.Cell.X + 0.5, this.unit.Cell.Y + 0.5) - 1});
            }

            // сортируем
            this._targetsUnitInfo.sort((a, b) => {
                return a.distance - b.distance;
            });

            // инициализируем массивы по выборам целей для орудий
            if (this._targetsUnitInfo.length != 0) {
                var armamentDistance = 0;

                // перевыделяем массивы текущих целей
                this._armamentsTargetNextNum = new Array<number>(this._armamentsMaxDistance);
                this._armamentsTargetEndNum  = new Array<number>(this._armamentsMaxDistance);

                // инициализируем массивы целей
                for (var targetNum = 0; targetNum < this._targetsUnitInfo.length; targetNum++) {
                    for (; armamentDistance < this._targetsUnitInfo[targetNum].distance && armamentDistance < this._armamentsMaxDistance; armamentDistance++) {
                        this._armamentsTargetEndNum[armamentDistance]  = targetNum;
                        this._armamentsTargetNextNum[armamentDistance] = targetNum - 1;
                    }
                }
                for (; armamentDistance < this._armamentsMaxDistance; armamentDistance++) {
                    this._armamentsTargetEndNum[armamentDistance]  = this._targetsUnitInfo.length;
                    this._armamentsTargetNextNum[armamentDistance] = this._targetsUnitInfo.length - 1;
                }
            }
        }
    }
}

export class Player_TOWER_0 extends Player_TOWER_BASE {
    static CfgUid      : string = Player_TOWER_BASE.CfgUid + "_0";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}

export class Player_TOWER_1 extends Player_TOWER_BASE {
    static CfgUid      : string = Player_TOWER_BASE.CfgUid + "_1";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}

export class Player_TOWER_2 extends Player_TOWER_BASE {
    static CfgUid      : string = Player_TOWER_BASE.CfgUid + "_2";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}

export class Player_TOWER_3 extends Player_TOWER_BASE {
    static CfgUid      : string = Player_TOWER_BASE.CfgUid + "_3";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}

export class Player_TOWER_4 extends Player_TOWER_BASE {
    static CfgUid      : string = Player_TOWER_BASE.CfgUid + "_4";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}

export class Player_TOWER_5 extends Player_TOWER_BASE {
    static CfgUid      : string = Player_TOWER_BASE.CfgUid + "_5";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}

export class Player_TOWER_CHOISE_DIFFICULT extends IUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Tower_CHOISE_DIFFICULT";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_Tower";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        // описание
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Выберите сложность");
        // ХП
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", 100000);
        // Броня
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 1000);
        // Урон
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament.ShotParams, "Damage", 1000);
        // Перезарядка
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "ReloadTime", 1);
        // убираем починку
        GlobalVars.configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        // запрещаем самоуничтожение
        GlobalVars.configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // даем профессию найма
        CfgAddUnitProducer(GlobalVars.configs[this.CfgUid]);
        // добавляем постройку волн
        {
            var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();

            var choise_BaseCfgUid = "#UnitConfig_Barbarian_Swordmen";
            var choise_CfgUid     = this.CfgUid + "_";
            for (var difficultIdx = 1; difficultIdx <= GlobalVars.difficult + 4; difficultIdx++) {
                var unitChoise_CfgUid = choise_CfgUid + difficultIdx;
                GlobalVars.configs[unitChoise_CfgUid] = CreateUnitConfig(choise_BaseCfgUid, unitChoise_CfgUid);

                // назначаем имя
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Name", "Выбрать сложность " + difficultIdx);
                // Броня
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Shield", difficultIdx);
                // описание
                if (difficultIdx < GlobalVars.difficult) {
                    GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", "Эта сложность меньше рекомендуемой");
                } else if (difficultIdx == GlobalVars.difficult) {
                    GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", "Рекомендуемая сложность");
                } else {
                    GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", "Эта сложность больше рекомендуемой");
                }
                // убираем цену
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Gold",   0);
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Metal",  0);
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Lumber", 0);
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "People", 0);
                // убираем требования
                GlobalVars.configs[unitChoise_CfgUid].TechConfig.Requirements.Clear();

                produceList.Add(GlobalVars.configs[unitChoise_CfgUid]);
            }
        }
    }
}

export class Player_TOWER_CHOISE_ATTACKPLAN extends IUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_TOWER_CHOISE_ATTACKPLAN";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_Tower";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        // описание
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Выберите волну");
        // ХП
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", 2000);
        // Броня
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 1000);
        // убираем починку
        GlobalVars.configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Reparable);
        // запрещаем самоуничтожение
        GlobalVars.configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.DestroySelf);
        // даем профессию найма
        CfgAddUnitProducer(GlobalVars.configs[this.CfgUid]);
        // добавляем постройку волн
        {
            var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();

            var choise_BaseCfgUid = "#UnitConfig_Barbarian_Swordmen";
            var choise_CfgUid     = this.CfgUid + "_";
            for (var planIdx = 0; planIdx < AttackPlansClass.length; planIdx++) {
                var unitChoise_CfgUid = choise_CfgUid + planIdx;
                GlobalVars.configs[unitChoise_CfgUid] = CreateUnitConfig(choise_BaseCfgUid, unitChoise_CfgUid);

                // назначаем имя
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Name", "Выбрать волну " + planIdx);
                // Броня
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Shield", planIdx);
                // описание
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid], "Description", AttackPlansClass[planIdx].Description);
                // убираем цену
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Gold",   0);
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Metal",  0);
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "Lumber", 0);
                GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[unitChoise_CfgUid].CostResources, "People", 0);
                // убираем требования
                GlobalVars.configs[unitChoise_CfgUid].TechConfig.Requirements.Clear();

                produceList.Add(GlobalVars.configs[unitChoise_CfgUid]);
            }
        }
    }
}

export const PlayerTowersClass : Array<typeof Player_TOWER_BASE> = [
    Player_TOWER_0,
    Player_TOWER_1,
    Player_TOWER_2,
    Player_TOWER_3,
    Player_TOWER_4,
    Player_TOWER_5
];
