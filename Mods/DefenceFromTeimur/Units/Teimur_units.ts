import { createHordeColor, createPoint } from "library/common/primitives";
import { UnitFlags, UnitCommand, UnitDirection, ProduceAtCommandArgs } from "library/game-logic/horde-types";
import { UnitProfession, UnitProducerProfessionParams } from "library/game-logic/unit-professions";
import { CreateConfig, UnitGiveOrder, spawnUnits, unitCanBePlacedByRealMap } from "../Utils";
import { ILegendaryUnit } from "../Types/ILegendaryUnit";
import { ITeimurUnit } from "../Types/ITeimurUnit";
import { generateCellInSpiral } from "library/common/position-tools";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { GlobalVars } from "../GlobalData";
import { IUnit } from "../Types/IUnit";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { log } from "library/common/logging";

export class Teimur_Swordmen extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Swordmen";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Swordmen";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Archer extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Archer";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Archer";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Archer_2 extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Archer_2";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Archer_2";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Heavymen extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Heavymen";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Heavymen";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Raider extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Raider";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Raider";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Catapult extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Catapult";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_Catapult";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Balista extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Balista";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_Balista";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Mag_2 extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Mag_2";
    static BaseCfgUid  : string = "#UnitConfig_Mage_Mag_2";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Villur extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Villur";
    static BaseCfgUid  : string = "#UnitConfig_Mage_Villur";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Olga extends ITeimurUnit {
    static CfgUid      : string = "#DefenceTeimur_Olga";
    static BaseCfgUid  : string = "#UnitConfig_Mage_Olga";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}

export class Teimur_Legendary_SWORDMEN extends ILegendaryUnit {
    static CfgUid        : string = "#DefenceTeimur_legendary_swordmen";
    static BaseCfgUid    : string = "#DefenceTeimur_Swordmen";
    static Description   : string = "Слабости: огонь, окружение. Преимущества: ближний бой, броня, много хп.";
    static MaxCloneDepth : number = 0;

    currCloneDepth: number;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
        
        this.currCloneDepth = 0;
    }

    static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);
        // назначаем имя
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Name", "Легендарный рыцарь");
        // меняем цвет
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // задаем количество здоровья от числа игроков
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "MaxHealth", Math.floor(100 * Math.sqrt(difficult)));
        // создаем конфиги для клонов
        this.MaxCloneDepth = Math.ceil(Math.log2(configs[this.CfgUid].MaxHealth / 10)) + 1;
        for (var i = 1; i < this.MaxCloneDepth; i++) {
            var uid = this.CfgUid + "_" + i;

            // копируем базового рыцаря
            configs[uid] = CreateConfig(this.CfgUid, uid);
            // задаем количество здоровья
            GlobalVars.ScriptUtils.SetValue(configs[uid], "MaxHealth", Math.ceil(configs[this.CfgUid].MaxHealth / Math.pow(2, i + 1)));
            // задаем цвет
            GlobalVars.ScriptUtils.SetValue(configs[uid], "TintColor", createHordeColor(255, 255, Math.floor(255 * (i + 1) / this.MaxCloneDepth), Math.floor(255 * (i + 1) / this.MaxCloneDepth)));
        }
    }

    public OnDead(gameTickNum: number): void {
        // если существует конфиг для следующего уровня клонов, то спавним 2-ух клонов и увеличиваем уровень клонов на 1
        if (this.currCloneDepth < Teimur_Legendary_SWORDMEN.MaxCloneDepth - 1) {
            // создаем генератор по спирали вокруг умершего рыцаря
            var generator = generateCellInSpiral(this.unit.Cell.X, this.unit.Cell.Y);
            // спавним 2-ух рыцарей
            var spawnedUnits = spawnUnits(this.unit.Owner,
                GlobalVars.configs[Teimur_Legendary_SWORDMEN.CfgUid + "_" + (this.currCloneDepth + 1)],
                2,
                UnitDirection.Down,
                generator);
            for (var spawnedUnit of spawnedUnits) {
                var unitInfo = new Teimur_Legendary_SWORDMEN(spawnedUnit, this.teamNum);
                unitInfo.currCloneDepth = this.currCloneDepth + 1;
                GlobalVars.units.push(unitInfo);
                spawnDecoration(GlobalVars.ActiveScena.GetRealScena(), GlobalVars.HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), spawnedUnit.Position);
            }
        }
    }
}
export class Teimur_Legendary_HEAVYMAN extends ILegendaryUnit {
    static CfgUid      : string = "#DefenceTeimur_legendary_heavymen";
    static BaseCfgUid  : string = "#DefenceTeimur_Heavymen";
    static Description : string = "Слабости: давится, огонь. Преимущества: очень силен в ближнем бою.";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);
        
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Name", "Легендарный тяжелый рыцарь");
        // меняем цвет
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // увеличиваем хп
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "MaxHealth", Math.floor(400 * Math.sqrt(difficult)));
        // делаем броню 3, чтобы стрели не брали его
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Shield", 3);
    }
}
export class Teimur_Legendary_ARCHER extends ILegendaryUnit {
    static CfgUid      : string = "#DefenceTeimur_legendary_archer";
    static BaseCfgUid  : string = "#DefenceTeimur_Archer";
    static Description : string = "Слабости: ближний бой, окружение. Преимущества: дальний бой, иммун к огню.";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);
        
        // назначаем имя
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Name", "Легендарный лучник");
        // меняем цвет
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // стреляет сразу 10 стрелами
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid].MainArmament, "EmitBulletsCountMin", 10);
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid].MainArmament, "EmitBulletsCountMax", 10);
        // увеличиваем разброс
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid].MainArmament, "BaseAccuracy", 0);
        // увеличиваем дальность
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid].MainArmament, "Range", 10);
        // делаем так, чтобы не давили всадники
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Weight", 12);
        // задаем количество здоровья от числа игроков
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "MaxHealth", Math.floor(200 * Math.sqrt(difficult)));
        // делаем имунитет к огню
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Flags", UnitFlags.FireResistant);
    }
}
export class Teimur_Legendary_ARCHER_2 extends ILegendaryUnit {
    static CfgUid      : string = "#DefenceTeimur_legendary_archer_2";
    static BaseCfgUid  : string = "#DefenceTeimur_Archer_2";
    static Description : string = "Слабости: ближний бой, окружение. Преимущества: дальний бой, иммун к огню.";

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);
        
        // назначаем имя
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Name", "Легендарный поджигатель");
        // меняем цвет
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // стреляет сразу 10 стрелами
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid].MainArmament, "EmitBulletsCountMin", 5);
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid].MainArmament, "EmitBulletsCountMax", 5);
        // увеличиваем разброс
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid].MainArmament, "BaseAccuracy", 0);
        // увеличиваем дальность
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid].MainArmament, "Range", 10);
        // делаем так, чтобы не давили всадники
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Weight", 12);
        // задаем количество здоровья от числа игроков
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "MaxHealth", Math.floor(200 * Math.sqrt(difficult)));
        // делаем имунитет к огню
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Flags", UnitFlags.FireResistant);
    }
}
export class Teimur_Legendary_RAIDER extends ILegendaryUnit {
    static CfgUid      : string = "#DefenceTeimur_legendary_Raider";
    static BaseCfgUid  : string = "#DefenceTeimur_Raider";
    static Description : string = "Слабости: ближний бой, окружение, огонь. Преимущества: скорость, спавн союзников.";

    static SpawnPeriod : number = 300;

    spawnPrevStart : number;
    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);

        this.spawnPrevStart = 0;
    }

    static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);

        // назначаем имя
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Name", "Легендарный всадник");
        // меняем цвет
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // задаем количество здоровья от числа игроков
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "MaxHealth", Math.floor(200 * Math.sqrt(difficult)));
        // делаем урон = 0
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid].MainArmament.BulletCombatParams, "Damage", 0);
    }

    public OnEveryTick(gameTickNum: number): void {
        // каждые 5 секунд спавним юнитов вокруг всадника
        if (gameTickNum - this.spawnPrevStart > Teimur_Legendary_RAIDER.SpawnPeriod) {
            this.spawnPrevStart = gameTickNum;

            var teimurUnitClass : typeof ITeimurUnit;
            var randomNumber = GlobalVars.rnd.RandomNumber(1, 4);
            if (randomNumber == 1) {
                teimurUnitClass = Teimur_Swordmen;
            } else if (randomNumber == 2) {
                teimurUnitClass = Teimur_Archer;
            } else if (randomNumber == 3) {
                teimurUnitClass = Teimur_Archer_2;
            } else {
                teimurUnitClass = Teimur_Heavymen;
            }

            log.info("GlobalVars.configs[teimurUnitClass.CfgUid] = ", GlobalVars.configs[teimurUnitClass.CfgUid]);

            var generator    = generateCellInSpiral(this.unit.Cell.X, this.unit.Cell.Y);
            var spawnedUnits = spawnUnits(GlobalVars.teimurSettlement,
                GlobalVars.configs[teimurUnitClass.CfgUid],
                Math.min(GlobalVars.difficult, 3),
                UnitDirection.Down,
                generator);
            for (var spawnedUnit of spawnedUnits) {
                var unitInfo = new teimurUnitClass(spawnedUnit, this.teamNum);
                GlobalVars.units.push(unitInfo);
                spawnDecoration(GlobalVars.ActiveScena.GetRealScena(), GlobalVars.HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), spawnedUnit.Position);
            }
        }

        // проверяем, что юнит ничего не делает
        if (!this.unit.OrdersMind.IsIdle()) {
            return;
        }
        // атакуем замок
        UnitGiveOrder(this.unit, GlobalVars.teams[this.teamNum].castleCell, UnitCommand.Attack, AssignOrderMode.Queue);
    }
}
export class Teimur_Legendary_WORKER extends ILegendaryUnit {
    static CfgUid      : string = "#DefenceTeimur_legendary_worker";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Worker1";
    static Description : string = "Слабости: ближний бой, окружение, огонь, ранней атаки. Преимущества: строит башни.";

    towersBuild: number;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);

        this.towersBuild = 3;
    }

    static InitConfig(configs: any, difficult: number) {
        configs[this.CfgUid] = CreateConfig(this.BaseCfgUid, this.CfgUid);

        // (легендарная) башня к крестьянину

        var towerUid = this.CfgUid + "_tower";
        configs[towerUid] = CreateConfig("#UnitConfig_Slavyane_Tower", towerUid);
        // назначаем имя
        GlobalVars.ScriptUtils.SetValue(configs[towerUid], "Name", "Легендарная башня");
        // меняем цвет
        GlobalVars.ScriptUtils.SetValue(configs[towerUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // задаем количество здоровья от числа игроков
        GlobalVars.ScriptUtils.SetValue(configs[towerUid], "MaxHealth", Math.floor(50 * Math.sqrt(difficult)));
        // делаем башню бесплатной
        GlobalVars.ScriptUtils.SetValue(configs[towerUid].CostResources, "Gold",   0);
        GlobalVars.ScriptUtils.SetValue(configs[towerUid].CostResources, "Metal",  0);
        GlobalVars.ScriptUtils.SetValue(configs[towerUid].CostResources, "Lumber", 0);
        GlobalVars.ScriptUtils.SetValue(configs[towerUid].CostResources, "People", 0);
        // убираем требования у башни
        configs[towerUid].TechConfig.Requirements.Clear();
        // ускоряем время постройки
        GlobalVars.ScriptUtils.SetValue(configs[towerUid], "ProductionTime", 200);
        // убираем возможность захвата
        configs[towerUid].ProfessionParams.Remove(UnitProfession.Capturable);
        
        // (легендарный) крестьянин

        // назначаем имя
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Name", "Легендарный инженер");
        // меняем цвет
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // задаем количество здоровья от числа игроков
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "MaxHealth", Math.floor(300 * Math.sqrt(difficult)));
        // делаем так, чтобы не давили всадники
        GlobalVars.ScriptUtils.SetValue(configs[this.CfgUid], "Weight", 12);
        // удаляем команду атаки
        configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.Attack);
        // добавляем в список построек легендарную башню
        {
            var producerParams = configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();
            produceList.Add(configs[towerUid]);
        }
    }

    public OnEveryTick(gameTickNum: number): void {
        // отдел приказов
        var ordersMind = this.unit.OrdersMind;

        // юнит бездействует и у него фулл хп, то отправляем его на базу врага
        if (ordersMind.IsIdle() && this.unit.Health == GlobalVars.configs[Teimur_Legendary_WORKER.CfgUid].MaxHealth) {
            UnitGiveOrder(this.unit, GlobalVars.teams[this.teamNum].castleCell, UnitCommand.MoveToPoint, AssignOrderMode.Queue);
            return;
        }

        // проверка, что юнит готов строить башню
        if (this.towersBuild == 0 ||
            this.unit.Health == GlobalVars.configs[Teimur_Legendary_WORKER.CfgUid].MaxHealth ||
            ordersMind.ActiveOrder.ProductUnit != undefined) {
            return;
        }

        // Отменить все приказы юнита
        ordersMind.CancelOrders(true);

        // ищем ближайшее место куда можно построить башню
        var generator = generateCellInSpiral(this.unit.Cell.X, this.unit.Cell.Y);
        for (var position = generator.next(); !position.done; position = generator.next()) {
            if (unitCanBePlacedByRealMap(GlobalVars.configs[Teimur_Legendary_WORKER.CfgUid + "_tower"], position.value.X, position.value.Y)) {
                // делаем так, чтобы инженер не отвлекался, когда строит башню (убираем реакцию на инстинкты)
                ordersMind.AssignSmartOrder(this.unit.Cell, AssignOrderMode.Replace, 100000);

                var produceAtCommandArgs = new ProduceAtCommandArgs(AssignOrderMode.Queue, GlobalVars.configs[Teimur_Legendary_WORKER.CfgUid + "_tower"], createPoint(position.value.X, position.value.Y));
                this.unit.Cfg.GetOrderDelegate(this.unit, produceAtCommandArgs);

                // уменьшаем количество создаваемых башен на 1
                this.towersBuild--;
                break;
            }
        }
    }
}

export const TeimurLegendaryUnitsClass : Array<typeof IUnit> = [
    Teimur_Legendary_SWORDMEN,
    Teimur_Legendary_HEAVYMAN,
    Teimur_Legendary_ARCHER,
    Teimur_Legendary_ARCHER_2,
    Teimur_Legendary_RAIDER,
    Teimur_Legendary_WORKER
];

export const TeimurUnitsClass : Array<typeof IUnit> = [
    Teimur_Swordmen,
    Teimur_Archer,
    Teimur_Archer_2,
    Teimur_Heavymen,
    Teimur_Raider,
    Teimur_Catapult,
    Teimur_Balista,
    Teimur_Mag_2,
    Teimur_Villur,
    Teimur_Olga
];
