import { createHordeColor, createPF, createPoint, createResourcesAmount } from "library/common/primitives";
import { UnitFlags, UnitCommand, UnitDirection, UnitHurtType, UnitSpecification, BattleController, BulletState, UnitMapLayer, UnitEffectFlag, TileType } from "library/game-logic/horde-types";
import { UnitProfession, UnitProducerProfessionParams } from "library/game-logic/unit-professions";
import { ChebyshevDistance, CreateBulletConfig, CreateUnitConfig, EuclidDistance, generateRandomCellInRect, spawnUnit, spawnUnits, unitCanBePlacedByRealMap } from "../Utils";
import { ILegendaryUnit } from "../Types/ILegendaryUnit";
import { ITeimurUnit } from "../Types/ITeimurUnit";
import { generateCellInSpiral } from "library/common/position-tools";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { CFGPrefix, GlobalVars } from "../GlobalData";
import { IUnit } from "../Types/IUnit";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { log } from "library/common/logging";
import { iterateOverUnitsInBox, unitCheckPathTo } from "library/game-logic/unit-and-map";
import { setBulletInitializeWorker, setBulletProcessWorker } from "library/game-logic/workers-tools";
import { createGameMessageWithSound } from "library/common/messages";

export class Teimur_Swordmen extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Swordmen";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Swordmen";

    static MaxSpawnCount: number = 20;
    static MaxHealthBase: number = 10;
    static DamageBase   : number = 5;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Archer extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Archer";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Archer";

    static MaxSpawnCount: number = 20;
    static MaxHealthBase: number = 10;
    static DamageBase   : number = 4;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Archer_2 extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Archer_2";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Archer_2";

    static MaxSpawnCount: number = 20;
    static MaxHealthBase: number = 10;
    static DamageBase   : number = 4;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Heavymen extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Heavymen";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Heavymen";

    static MaxSpawnCount: number = 20;
    static MaxHealthBase: number = 15;
    static DamageBase   : number = 5;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Raider extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Raider";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Raider";

    static MaxSpawnCount: number = 20;
    static MaxHealthBase: number = 20;
    static DamageBase   : number = 5;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Catapult extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Catapult";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_Catapult";

    static MaxSpawnCount: number = 10;
    static MaxHealthBase: number = 20;
    static DamageBase   : number = 6;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Balista extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Balista";
    static BaseCfgUid  : string = "#UnitConfig_Slavyane_Balista";

    static MaxSpawnCount: number = 10;
    static MaxHealthBase: number = 20;
    static DamageBase   : number = 10;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }
}
export class Teimur_Mag_2 extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Mag_2";
    static BaseCfgUid  : string = "#UnitConfig_Mage_Mag_2";

    static MaxSpawnCount: number = 10;
    static MaxHealthBase: number = 40;
    static DamageBase   : number = 10;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig() {
        ITeimurUnit.InitConfig.call(this);

        // задаем количество брони
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 0);
        // ставим дальность
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "Range", 5);
    }
}
export class Teimur_Villur extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Villur";
    static BaseCfgUid  : string = "#UnitConfig_Mage_Villur";

    static MaxSpawnCount: number = 4;
    static MaxHealthBase: number = 40;
    static DamageBase   : number = 10;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig() {
        ITeimurUnit.InitConfig.call(this);

        // задаем количество брони
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 0);
        // ставим дальность
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "Range", 5);
    }
}
export class Teimur_Olga extends ITeimurUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_Olga";
    static BaseCfgUid  : string = "#UnitConfig_Mage_Olga";

    static MaxSpawnCount: number = 4;
    static MaxHealthBase: number = 40;
    static DamageBase   : number = 10;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig() {
        ITeimurUnit.InitConfig.call(this);

        // задаем количество брони
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 0);
        // ставим дальность
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "Range", 5);
    }
}
export class Teimur_Scorpion extends ITeimurUnit {
    static CfgUid    : string = "#" + CFGPrefix + "_Scorpion";
    static BaseCfgUid: string = "#UnitConfig_Nature_ScorpionBig";

    static MaxSpawnCount: number = 10;
    static MaxHealthBase: number = 15;
    static DamageBase   : number = 5;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig(): void {
        ITeimurUnit.InitConfig.call(this);

        // задаем количество брони
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 4);
    }
}

export class Teimur_Legendary_SWORDMEN extends ILegendaryUnit {
    static CfgUid        : string = "#" + CFGPrefix + "_legendary_swordmen";
    static BaseCfgUid    : string = "#" + CFGPrefix + "_Swordmen";
    static Description   : string = "Слабости: огонь, окружение. Преимущества: ближний бой, броня, много хп.";
    static MaxCloneDepth : number = 0;

    static MaxSpawnCount: number = 4;
    static MaxHealthBase: number = 0;
    static DamageBase   : number = 5;

    currCloneDepth: number;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
        
        this.currCloneDepth = 0;
    }

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);

        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный рыцарь");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // задаем количество здоровья от числа игроков
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", Math.floor(100 * Math.sqrt(GlobalVars.difficult)));
        // создаем конфиги для клонов
        this.MaxCloneDepth = Math.ceil(Math.log2(GlobalVars.configs[this.CfgUid].MaxHealth / 10)) + 1;
        for (var i = 1; i < this.MaxCloneDepth; i++) {
            var uid = this.CfgUid + "_" + i;

            // копируем базового рыцаря
            GlobalVars.configs[uid] = CreateUnitConfig(this.CfgUid, uid);
            // задаем количество здоровья
            ScriptUtils.SetValue(GlobalVars.configs[uid], "MaxHealth", Math.ceil(GlobalVars.configs[this.CfgUid].MaxHealth / Math.pow(2, i + 1)));
            // задаем цвет
            ScriptUtils.SetValue(GlobalVars.configs[uid], "TintColor", createHordeColor(255, 255, Math.floor(255 * (i + 1) / this.MaxCloneDepth), Math.floor(255 * (i + 1) / this.MaxCloneDepth)));
        }

        this.MaxHealthBase = 100 * Math.sqrt(GlobalVars.difficult);
    }

    public static GetSpawnCount(spawnCount: number) {
        if (this.MaxSpawnCount < 0) {
            return spawnCount;
        }

        var coeff : number;
        if (spawnCount <= this.MaxSpawnCount) {
            coeff = 1.0;
        } else {
            coeff = spawnCount / this.MaxSpawnCount;
        }

        // задаем количество здоровья
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", Math.floor(this.MaxHealthBase * coeff));
        // задаем урон
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament.ShotParams, "Damage", Math.floor(this.DamageBase * coeff));
        for (var i = 1; i < this.MaxCloneDepth; i++) {
            var uid = this.CfgUid + "_" + i;
            // задаем количество здоровья
            ScriptUtils.SetValue(GlobalVars.configs[uid], "MaxHealth", Math.ceil(GlobalVars.configs[this.CfgUid].MaxHealth / Math.pow(2, i + 1)));
            // задаем урон
            ScriptUtils.SetValue(GlobalVars.configs[uid].MainArmament.ShotParams, "Damage", Math.floor(this.DamageBase * coeff));
        }

        return Math.min(spawnCount, this.MaxSpawnCount);
    }

    public OnDead(gameTickNum: number): void {
        super.OnDead(gameTickNum);

        // если существует конфиг для следующего уровня клонов, то спавним 2-ух клонов и увеличиваем уровень клонов на 1
        if (this.currCloneDepth < Teimur_Legendary_SWORDMEN.MaxCloneDepth - 1 &&
            !GlobalVars.teams[this.teamNum].tower.unit.IsDead
        ) {
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
                spawnDecoration(ActiveScena.GetRealScena(), HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), spawnedUnit.Position);
            }
        }
    }
}
export class Teimur_Legendary_HEAVYMAN extends ILegendaryUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_legendary_heavymen";
    static BaseCfgUid  : string = "#" + CFGPrefix + "_Heavymen";
    static Description : string = "Слабости: давится, огонь. Преимущества: очень силен в ближнем бою.";

    static MaxSpawnCount : number = 4;
    static MaxHealthBase : number = 0;
    static DamageBase    : number = 5;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);
        
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный тяжелый рыцарь");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // делаем броню 3, чтобы стрели не брали его
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Shield", 3);

        this.MaxHealthBase = Math.floor(400 * Math.sqrt(GlobalVars.difficult));
    }
}
export class Teimur_Legendary_ARCHER extends ILegendaryUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_legendary_archer";
    static BaseCfgUid  : string = "#" + CFGPrefix + "_Archer";
    static Description : string = "Слабости: ближний бой, окружение. Преимущества: дальний бой, иммун к огню.";

    static MaxSpawnCount : number = 4;
    static MaxHealthBase : number = 0;
    static DamageBase    : number = 5;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);
        
        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный лучник");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // стреляет сразу 10 стрелами
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "EmitBulletsCountMin", 10);
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "EmitBulletsCountMax", 10);
        // увеличиваем разброс
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "BaseAccuracy", 0);
        // увеличиваем дальность
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "Range", 10);
        // делаем так, чтобы не давили всадники
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "PressureResist", 21);
        // делаем имунитет к огню
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Flags", UnitFlags.FireResistant);

        this.MaxHealthBase = Math.floor(200 * Math.sqrt(GlobalVars.difficult));
    }
}
export class Teimur_Legendary_ARCHER_2 extends ILegendaryUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_legendary_archer_2";
    static BaseCfgUid  : string = "#" + CFGPrefix + "_Archer_2";
    static Description : string = "Слабости: ближний бой, окружение. Преимущества: дальний бой, иммун к огню.";

    static MaxSpawnCount : number = 4;
    static MaxHealthBase : number = 0;
    static DamageBase    : number = 5;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);
        
        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный поджигатель");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // стреляет сразу 10 стрелами
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "EmitBulletsCountMin", 5);
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "EmitBulletsCountMax", 5);
        // увеличиваем разброс
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "BaseAccuracy", 0);
        // увеличиваем дальность
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "Range", 9);
        // делаем так, чтобы не давили всадники
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "PressureResist", 21);
        // делаем имунитет к огню
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Flags", UnitFlags.FireResistant);

        this.MaxHealthBase = Math.floor(200 * Math.sqrt(GlobalVars.difficult));
    }
}
export class Teimur_Legendary_RAIDER extends ILegendaryUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_legendary_Raider";
    static BaseCfgUid  : string = "#" + CFGPrefix + "_Raider";
    static Description : string = "Слабости: ближний бой, окружение, огонь. Преимущества: скорость, спавн союзников.";

    static MaxSpawnCount : number = 4;
    static MaxHealthBase : number = 0;
    static DamageBase    : number = 0;

    static SpawnPeriod : number = 300;

    spawnPrevStart : number;
    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);

        this.spawnPrevStart = 0;
    }

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);

        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный всадник");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // устанавливаем скорость
        GlobalVars.configs[this.CfgUid].Speeds.Item.set(TileType.Grass, 14);
        GlobalVars.configs[this.CfgUid].Speeds.Item.set(TileType.Marsh, 14);
        GlobalVars.configs[this.CfgUid].Speeds.Item.set(TileType.Sand,  14);

        this.MaxHealthBase = Math.floor(200 * Math.sqrt(GlobalVars.difficult));
    }

    public OnEveryTick(gameTickNum: number): void {
        // каждые SpawnPeriod/50 секунд спавним юнитов вокруг всадника
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
            var spawnedUnits = spawnUnits(GlobalVars.teams[this.teamNum].teimurSettlement,
                GlobalVars.configs[teimurUnitClass.CfgUid],
                Math.min(GlobalVars.difficult, 3),
                UnitDirection.Down,
                generator);
            for (var spawnedUnit of spawnedUnits) {
                var unitInfo = new teimurUnitClass(spawnedUnit, this.teamNum);
                GlobalVars.units.push(unitInfo);
                spawnDecoration(ActiveScena.GetRealScena(), HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), spawnedUnit.Position);
            }
        }

        // если в очереди меньше 2 приказов, то генерируем новые
        if (this.unit_ordersMind.OrdersCount <= 1) {
            // генерируем 5 рандомных достижимых точек вокруг цели
            var generator_  = generateRandomCellInRect(GlobalVars.teams[this.teamNum].towerCell.X - 10, GlobalVars.teams[this.teamNum].towerCell.Y - 10, 20, 20);
            var ordersCount = 5 - this.unit_ordersMind.OrdersCount;
            for (var position = generator_.next(), orderNum = 0; !position.done && orderNum < ordersCount; position = generator_.next(), orderNum++) {
                if (unitCheckPathTo(this.unit, createPoint(position.value.X, position.value.Y))) {
                    this.unit_ordersMind.AssignSmartOrder(createPoint(position.value.X, position.value.Y), AssignOrderMode.Queue, 100000);
                }
            }
        }
    }
}
export class Teimur_Legendary_WORKER extends ILegendaryUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_legendary_worker";
    static BaseCfgUid  : string = "#UnitConfig_Barbarian_Worker1";
    static Description : string = "Слабости: ближний бой, окружение, огонь, ранней атаки. Преимущества: строит башни при получении урона.";

    static MaxSpawnCount : number = 4;
    static MaxHealthBase : number = 0;
    static DamageBase    : number = 4;

    static TowerMaxHealthBase : number = 0;
    static TowerDamageBase    : number = 4;

    static TowerMaxBuildRadius : number = 8;

    state: number;
    towersBuild: number;
    producingUnit: any;

    onProducedHandler: any;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);

        this.state       = 0;
        this.towersBuild = 3;
        this.producingUnit = null;

        var that = this;

        // подписываемся на событие о постройке юнитов
        this.onProducedHandler = unit.Owner.Units.UnitProduced.connect(function (sender, UnitProducedEventArgs) {
            try {
                // проверяем, что построил нужный юнит
                if (UnitProducedEventArgs.ProducerUnit.Id != that.unit.Id) {
                    return;
                }

                that.producingUnit = UnitProducedEventArgs.Unit;
                GlobalVars.units.push(new IUnit(that.producingUnit, that.teamNum));
            } catch (ex) {
                log.exception(ex);
            }
        });
    }

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);

        // (легендарная) башня к крестьянину

        var towerUid = this.CfgUid + "_tower";
        GlobalVars.configs[towerUid] = CreateUnitConfig("#UnitConfig_Slavyane_Tower", towerUid);
        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[towerUid], "Name", "Легендарная башня");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[towerUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // делаем башню бесплатной
        ScriptUtils.SetValue(GlobalVars.configs[towerUid].CostResources, "Gold",   0);
        ScriptUtils.SetValue(GlobalVars.configs[towerUid].CostResources, "Metal",  0);
        ScriptUtils.SetValue(GlobalVars.configs[towerUid].CostResources, "Lumber", 0);
        ScriptUtils.SetValue(GlobalVars.configs[towerUid].CostResources, "People", 0);
        // делаем починку бесплатной
        var towerRepableProf = GlobalVars.configs[towerUid].ProfessionParams.Item.get(UnitProfession.Reparable);
        towerRepableProf.RecoverCost.Gold   = 0;
        towerRepableProf.RecoverCost.Metal  = 0;
        towerRepableProf.RecoverCost.Lumber = 0;
        towerRepableProf.RecoverCost.People = 0;
        // убираем требования у башни
        GlobalVars.configs[towerUid].TechConfig.Requirements.Clear();
        // ускоряем время постройки
        ScriptUtils.SetValue(GlobalVars.configs[towerUid], "ProductionTime", 200);
        // убираем возможность захвата
        GlobalVars.configs[towerUid].ProfessionParams.Remove(UnitProfession.Capturable);
        // делаем поджигательные стрелы
        ScriptUtils.GetValue(GlobalVars.configs[towerUid].MainArmament, "BulletConfigRef")
            .SetConfig(HordeContentApi.GetBulletConfig("#BulletConfig_FireArrow"));
        
        this.TowerMaxHealthBase = Math.floor(50 * Math.sqrt(GlobalVars.difficult));

        // (легендарный) крестьянин

        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный инженер");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(255, 255, 100, 100));
        // делаем так, чтобы не давили всадники
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "PressureResist", 21);
        // удаляем команду атаки
        GlobalVars.configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.Attack);
        // добавляем в список построек легендарную башню
        {
            var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var produceList    = producerParams.CanProduceList;
            produceList.Clear();
            produceList.Add(GlobalVars.configs[towerUid]);
        }

        this.MaxHealthBase = Math.floor(200 * Math.sqrt(GlobalVars.difficult));
    }

    public static GetSpawnCount(spawnCount: number) {
        var towerUid = this.CfgUid + "_tower";
        if (spawnCount <= this.MaxSpawnCount) {
            // задаем количество здоровья
            ScriptUtils.SetValue(GlobalVars.configs[towerUid], "MaxHealth", Math.floor(this.TowerMaxHealthBase));
            // задаем урон
            ScriptUtils.SetValue(GlobalVars.configs[towerUid].MainArmament.ShotParams, "Damage", Math.floor(this.TowerDamageBase));
        } else {
            var coeff = spawnCount / this.MaxSpawnCount;
            // задаем количество здоровья
            ScriptUtils.SetValue(GlobalVars.configs[towerUid], "MaxHealth", Math.floor(this.TowerMaxHealthBase * coeff));
            // задаем урон
            ScriptUtils.SetValue(GlobalVars.configs[towerUid].MainArmament.ShotParams, "Damage", Math.floor(this.TowerDamageBase * coeff));
        }

        return ILegendaryUnit.GetSpawnCount.call(this, spawnCount);
    }

    public OnEveryTick(gameTickNum: number): void {
        // состояние идти на базу врага
        if (this.state == 0) {
            var towerCell = GlobalVars.teams[this.teamNum].towerCell;

            // если ничего не делаем, то идем на замок
            if (this.unit_ordersMind.IsIdle()) {
                this.GivePointCommand(towerCell, UnitCommand.MoveToPoint, AssignOrderMode.Queue);
            }

            const distanceToTower : number = ChebyshevDistance(this.unit.Cell.X, this.unit.Cell.Y, towerCell.X + 0.5, towerCell.Y + 0.5);

            // если рабочего ударили и он подошел близко
            if (this.unit.Health < GlobalVars.configs[Teimur_Legendary_WORKER.CfgUid].MaxHealth &&
                distanceToTower < Teimur_Legendary_WORKER.TowerMaxBuildRadius
            ) {
                this.state = 1;
            }
        }
        // состояние разместить вышку
        else if (this.state == 1) {
            if (this.towersBuild > 0) {
                if (!this.producingUnit) {
                    // ищем ближайшее место куда можно построить башню
                    var generator = generateCellInSpiral(this.unit.Cell.X, this.unit.Cell.Y);
                    for (var position = generator.next(); !position.done; position = generator.next()) {
                        if (unitCanBePlacedByRealMap(GlobalVars.configs[Teimur_Legendary_WORKER.CfgUid + "_tower"], position.value.X, position.value.Y)) {
                            this.GivePointProduceCommand(
                                GlobalVars.configs[Teimur_Legendary_WORKER.CfgUid + "_tower"],
                                createPoint(position.value.X, position.value.Y),
                                AssignOrderMode.Replace);
                            break;
                        }
                    }
                }
                // рабочий построил вышку
                else {
                    this.towersBuild--;
                    this.state = 2;
                }
            }
            // лимит постройки исчерпан
            else {
                this.unit.CommandsMind.AddAutomatedCommand(UnitCommand.Repair, AssignOrderMode.Replace);
                this.state = 3;
            }
        }
        // состояние постройки текущей вышки
        else if (this.state == 2) {
            // вышку сломали
            if (this.producingUnit.IsDead) {
                this.producingUnit = null;
                this.state = 1;
            }
            else {
                // вышка не достроена
                if (this.producingUnit.EffectsMind.BuildingInProgress) {
                    if (this.unit_ordersMind.IsIdle()) {
                        this.GivePointCommand(this.producingUnit.Cell, UnitCommand.Build, AssignOrderMode.Replace);
                    }
                }
                // вышку достроили 
                else {
                    this.producingUnit = null;
                    this.state = 1;
                }
            }
        }
        // state = 3, ничего не делаем
    }

    public OnDead(gameTickNum: number) {
        super.OnDead(gameTickNum);
        // отписываемся от события
        if (this.onProducedHandler) {
            this.onProducedHandler.disconnect();
        }
    }
}
export class Teimur_CapturedUnit extends ITeimurUnit {
    static CfgUid      : string = "";
    static BaseCfgUid  : string = "";

    // отключаем автоскейл от количества
    static MaxSpawnCount : number = -1;

    ownerSettlementUid: any;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    RegainControlOwner() {
        this.unit_ordersMind.CancelOrdersSafe();
        this.unit.ChangeOwner(ActiveScena.GetRealScena().Settlements.GetByUid(this.ownerSettlementUid));
        this.needDeleted = true;
    }
}
export class Teimur_Legendary_HORSE extends ILegendaryUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_legendary_Horse";
    static BaseCfgUid  : string = "#" + CFGPrefix + "_Raider";
    static Description : string = "Слабости: окружение, огонь. Преимущества: скорость, захват юнитов.";

    static MaxSpawnCount : number = 4;
    static MaxHealthBase : number = 0;
    static DamageBase    : number = 0;

    static CapturePeriod     : number = 150;
    /** максимальное количество юнитов, которое может захватить */
    static CaptureUnitsLimit : number = 20;

    /** захваченные юниты */
    captureUnits: Array<Teimur_CapturedUnit>;

    capturePrevStart : number;
    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);

        this.capturePrevStart = BattleController.GameTimer.GameFramesCounter;
        this.captureUnits     = new Array<Teimur_CapturedUnit>();
    }

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);

        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный всадник разума");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(150, 100, 100, 255));
        // делаем не давящимся
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "PressureResist", 22);
        // устанавливаем скорость
        GlobalVars.configs[this.CfgUid].Speeds.Item.set(TileType.Grass, 14);
        GlobalVars.configs[this.CfgUid].Speeds.Item.set(TileType.Marsh, 14);
        GlobalVars.configs[this.CfgUid].Speeds.Item.set(TileType.Sand,  14);

        this.CaptureUnitsLimit = Math.floor(this.CaptureUnitsLimit * Math.sqrt(GlobalVars.difficult));

        this.MaxHealthBase = Math.floor(120 * Math.sqrt(GlobalVars.difficult));
    }

    public OnEveryTick(gameTickNum: number): void {
        // каждые CapturePeriod/50 секунд захватываем юнитов в пределах захвата
        if (this.captureUnits.length < Teimur_Legendary_HORSE.CaptureUnitsLimit &&
            gameTickNum - this.capturePrevStart > Teimur_Legendary_HORSE.CapturePeriod &&
            !this.unit.EffectsMind.HasEffect(UnitEffectFlag.Burning)) {
            this.capturePrevStart = gameTickNum;

            // количество юнитов за раз
            var captureUnitsLimit = 2;

            // ищем ближайших вражеских юнитов
            let unitsIter = iterateOverUnitsInBox(createPoint(this.unit.Cell.X, this.unit.Cell.Y), 4);
            var unitsShowFlag = {};
            for (let u = unitsIter.next(); !u.done; u = unitsIter.next()) {
                var _unit = u.value;

                // проверка, что уже учли
                if (unitsShowFlag[_unit.Id]) {
                    continue;
                }
                unitsShowFlag[_unit.Id] = 1;

                const _unitOwnerUid = Number.parseInt(_unit.Owner.Uid);
                
                // пропускаем союзников
                if (_unitOwnerUid == GlobalVars.teams[this.teamNum].teimurSettlementIdx
                    // здания
                    || _unit.Cfg.IsBuilding
                    // юнитов с иммуном к магии
                    || _unit.Cfg.Flags.HasFlag(UnitFlags.MagicResistant)
                ) {
                    continue;
                }
                // достигнут предел захвата за раз
                if (captureUnitsLimit <= 0) {
                    break;
                }

                var prevOwnerUid = _unit.Owner.Uid;

                _unit.OrdersMind.CancelOrdersSafe();
                _unit.ChangeOwner(GlobalVars.teams[this.teamNum].teimurSettlement);

                var unitInfo = new Teimur_CapturedUnit(_unit, this.teamNum);
                unitInfo.ownerSettlementUid = prevOwnerUid;

                GlobalVars.units.push(unitInfo);
                this.captureUnits.push(unitInfo);
                spawnDecoration(ActiveScena.GetRealScena(), HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), _unit.Position);
                captureUnitsLimit--;
            }
        }

        // если в очереди меньше 2 приказов, то генерируем новые
        if (this.unit_ordersMind.OrdersCount <= 1) {
            // генерируем 5 рандомных достижимых точек вокруг цели
            var generator_  = generateRandomCellInRect(GlobalVars.teams[this.teamNum].towerCell.X - 10, GlobalVars.teams[this.teamNum].towerCell.Y - 10, 20, 20);
            var ordersCount = 5 - this.unit_ordersMind.OrdersCount;
            for (var position = generator_.next(), orderNum = 0; !position.done && orderNum < ordersCount; position = generator_.next(), orderNum++) {
                if (unitCheckPathTo(this.unit, createPoint(position.value.X, position.value.Y))) {
                    this.unit_ordersMind.AssignSmartOrder(createPoint(position.value.X, position.value.Y), AssignOrderMode.Queue, 100000);
                }
            }
        }
    }

    public OnDead(gameTickNum: number) {
        super.OnDead(gameTickNum);
        // освобождаем юнитов из-под контроля
        for (var unitInfo of this.captureUnits) {
            if (unitInfo.unit.IsDead) {
                continue;
            }

            unitInfo.RegainControlOwner();
            spawnDecoration(ActiveScena.GetRealScena(), HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), unitInfo.unit.Position);
        }
    }
}
export class Teimur_RevivedUnit extends ITeimurUnit {
    static CfgUid      : string = "";
    static BaseCfgUid  : string = "";
    static LifeTime    : number = 50*10;

    // отключаем автоскейл от количества
    static MaxSpawnCount : number = -1;

    reviveTickNum: number;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);

        this.reviveTickNum = -1;
    }

    public OnEveryTick(gameTickNum: number) {
        if (this.reviveTickNum < 0) {
            this.reviveTickNum = gameTickNum;
        } else if (this.reviveTickNum + Teimur_RevivedUnit.LifeTime < gameTickNum) {
            this.unit.BattleMind.InstantDeath(null, UnitHurtType.Mele);
            return;
        }

        ITeimurUnit.prototype.OnEveryTick.call(this, gameTickNum);
    }
}
export class Teimur_Legendary_DARK_DRAIDER extends ILegendaryUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_legendary_Dark_Draider";
    static BaseCfgUid  : string = "#" + CFGPrefix + "_Raider";
    static Description : string = "Слабости: окружение, огонь, дальний бой. Преимущества: скорость, оживление свежих трупов, ближний бой";

    static MaxSpawnCount : number = 4;
    static MaxHealthBase : number = 0;
    static DamageBase    : number = 5;

    /** максимальное количество юнитов, которое может оживить */
    static ReviveUnitsLimit : number = 30;

    /** оживленные юниты */
    reviveUnits: Array<Teimur_RevivedUnit>;

    revivePrevStart : number;
    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);

        this.revivePrevStart = 0;
        this.reviveUnits     = new Array<Teimur_RevivedUnit>();

        // поскольку трупы на карте живут не долго, то делаем обработку юнита чаще
        this.processingTickModule   = 10;
        this.processingTick         = this.unit.PseudoTickCounter % this.processingTickModule;
    }

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);

        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный всадник тьмы");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(150, 50, 50, 50));
        // устанавливаем скорость
        GlobalVars.configs[this.CfgUid].Speeds.Item.set(TileType.Grass, 14);
        GlobalVars.configs[this.CfgUid].Speeds.Item.set(TileType.Marsh, 14);
        GlobalVars.configs[this.CfgUid].Speeds.Item.set(TileType.Sand,  14);
        // задаем иконку
        //GlobalVars.configs[this.CfgUid].PortraitCatalog.RemoveItem(GlobalVars.configs[this.CfgUid].PortraitCatalog.GetFirst());
        //GlobalVars.configs[this.CfgUid].PortraitCatalog.AddItem(HordeContentApi.GetUnitConfig("#UnitConfig_Nature_Draider").PortraitCatalog);

        //var portraitCatalogUid = HordeContentApi.GetUnitConfig("#UnitConfig_Nature_Draider").PortraitCatalog as string;
        //printObjectItems(HordeContentApi.GetUnitConfig("#UnitConfig_Nature_Draider").PortraitCatalog);
        //portraitCatalogUid = portraitCatalogUid.substring(portraitCatalogUid.indexOf("Uid:") + 4);
        //ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "PortraitCatalog", HordeContentApi.GetUnitConfig("#UnitConfig_Nature_Draider").PortraitCatalog.Uid);

        this.ReviveUnitsLimit = Math.floor(this.ReviveUnitsLimit * Math.sqrt(GlobalVars.difficult));

        this.MaxHealthBase = Math.floor(250 * Math.sqrt(GlobalVars.difficult));
    }

    public OnEveryTick(gameTickNum: number): void {
        // ресаем юнитов
        {
            this.revivePrevStart = gameTickNum;

            // количество юнитов за раз
            var reviveUnitsLimit = 5;

            // ищем ближайших вражеских юнитов
            let unitsIter = iterateOverUnitsInBox(createPoint(this.unit.Cell.X, this.unit.Cell.Y), 8);
            for (let u = unitsIter.next(); !u.done; u = unitsIter.next()) {
                var _unit = u.value;

                if (
                    // пропускаем живых
                    !_unit.IsDead ||
                    // ранее воскрешенных
                    _unit.Cfg.Uid.includes("_REVIVED") ||
                    // пропускаем здания
                    _unit.Cfg.IsBuilding ||
                    // технику
                    _unit.Cfg.Specification.HasFlag(UnitSpecification.Machine) ||
                    // и магов
                    _unit.Cfg.Specification.HasFlag(UnitSpecification.Mage)
                ) {
                    continue;
                }

                // достигнут предел захвата за раз
                if (reviveUnitsLimit <= 0) {
                    break;
                }

                reviveUnitsLimit--;

                // создаем конфиг трупа

                const revivedCfgUid = _unit.Cfg.Uid + "_REVIVED";
                if (HordeContentApi.HasUnitConfig(revivedCfgUid)) {
                    GlobalVars.configs[revivedCfgUid] = HordeContentApi.GetUnitConfig(revivedCfgUid);
                } else {
                    GlobalVars.configs[revivedCfgUid] = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig(_unit.Cfg.Uid), revivedCfgUid);
                    // назначаем имя
                    ScriptUtils.SetValue(GlobalVars.configs[revivedCfgUid], "Name", "{Восставший} " + GlobalVars.configs[revivedCfgUid].Name);
                    // меняем цвет
                    ScriptUtils.SetValue(GlobalVars.configs[revivedCfgUid], "TintColor", createHordeColor(255, 50, 50, 50));
                }
                
                // пытаемся поднять трупа в клетке его смерти

                var reviveUnit = spawnUnit(GlobalVars.teams[this.teamNum].teimurSettlement, GlobalVars.configs[revivedCfgUid], UnitDirection.Down, _unit.Cell);
                if (reviveUnit != null) {
                    var unitInfo = new Teimur_RevivedUnit(reviveUnit, this.teamNum);
                    GlobalVars.units.push(unitInfo);
                    this.reviveUnits.push(unitInfo);
                    spawnDecoration(ActiveScena.GetRealScena(), HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), _unit.Position);
                }
            }
        }

        ITeimurUnit.prototype.OnEveryTick.call(this, gameTickNum);
    }

    public OnDead(gameTickNum: number) {
        super.OnDead(gameTickNum);
        // убиваем оживленных юнитов
        for (var unitInfo of this.reviveUnits) {
            if (unitInfo.unit.IsDead) {
                continue;
            }

            unitInfo.unit.BattleMind.InstantDeath(null, UnitHurtType.Mele);
        }
    }
}
export class Teimur_Legendary_FIRE_MAGE extends ILegendaryUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_legendary_FIRE_MAGE";
    static BaseCfgUid  : string = "#UnitConfig_Mage_Villur";
    static Description : string = "Слабости: дальний бой, скорострельность. Преимущества: плащ огня, смертоносный огненный шар";

    static MaxSpawnCount : number = 4;
    static MaxHealthBase : number = 0;
    static DamageBase    : number = 10;

    static FireballCfgUid : string = "#" + CFGPrefix + "_legendary_FIRE_MAGE_FIREBALL";
    static FireballCfg    : any;

    static FireCfgUid     : string = "#BulletConfig_Fire";
    static FireCfg        : any;

    static SpellFireFlashCooldown : number = 50 * 3;
    spellFireFlashPrevCast : number = 0;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);

        this.FireCfg = HordeContentApi.GetBulletConfig(this.FireCfgUid);

        // создаем снаряд
        this.FireballCfg = CreateBulletConfig("#BulletConfig_ScriptBullet_Template", this.FireballCfgUid);
        // кастомные обработчики снаряда
        setBulletInitializeWorker(GlobalVars.plugin, this.FireballCfg, this.Fireball_initializeWorker);
        setBulletProcessWorker(GlobalVars.plugin, this.FireballCfg, this.Fireball_processWorker);
        // Установка скорости полета
        ScriptUtils.SetValue(this.FireballCfg, "BaseBulletSpeed", createPF(2, 0));
        // отключаем баллистику
        ScriptUtils.SetValue(this.FireballCfg, "IsBallistic", false);
        ScriptUtils.SetValue(this.FireballCfg, "LoopAnimation", true);
        // включаем нужную анимацию
        ScriptUtils.GetValue(this.FireballCfg, "BulletAnimationsCatalogRef").SetConfig(HordeContentApi.GetAnimationCatalog("#AnimCatalog_Bullets_DragonFire"));
        // количество направлений
        ScriptUtils.SetValue(this.FireballCfg, "DirectionsCount", 8);
        // огонь
        //ScriptUtils.GetValue(this.FireballCfg.SpecialParams, "FireConfigRef").SetConfig(HordeContentApi.GetBulletConfig(this.FireCfgUid));

        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный маг огня");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(150, 255, 100, 100));
        // задаем кастомный снаряд
        ScriptUtils.GetValue(GlobalVars.configs[this.CfgUid].MainArmament, "BulletConfigRef").SetConfig(this.FireballCfg);
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "ReloadTime", 300);
        // ставим дальность
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament, "Range", 7);

        this.MaxHealthBase = Math.floor(120 * Math.sqrt(GlobalVars.difficult));
    }

    public OnEveryTick(gameTickNum: number): void {
        ITeimurUnit.prototype.OnEveryTick.call(this, gameTickNum);

        // кастуем огненную вспышку вокруг себя
        if (this.spellFireFlashPrevCast + Teimur_Legendary_FIRE_MAGE.SpellFireFlashCooldown < gameTickNum) {
            this.spellFireFlashPrevCast = gameTickNum;

            const cellX     = this.unit.Cell.X;
            const cellY     = this.unit.Cell.Y;
            const xs        = Math.max(0, cellX - 2);
            const xe        = Math.min(GlobalVars.scenaWidth - 1, cellX + 2);
            const ys        = Math.max(0, cellY - 2);
            const ye        = Math.min(GlobalVars.scenaHeight - 1, cellY + 2);
            for (var x = xs; x <= xe; x++) {
                for (var y = ys; y <= ye; y++) {
                    HordeClassLibrary.World.Objects.Bullets.Implementations.Fire.BaseFireBullet.MakeFire(
                        this.unit, createPoint(x << 5, y << 5), UnitMapLayer.Main, Teimur_Legendary_FIRE_MAGE.FireCfg);
                }
            }
        }
    }

    protected static Fireball_initializeWorker(bull: any, emitArgs: any) {
        // Настройка анимации по данным из конфига
        bull.SetupAnimation();

        // Звук выстрела (берет из каталога заданного в конфиге снаряда)
        //bullet.UtterSound("Shot", bullet.Position);

        //bull.ScriptData.animationInverted = false;
        bull.ScriptData.damagedCells = new Map<number, Map<number, boolean>>();

        /** время запуска снаряда */
        const launchTick           : number = BattleController.GameTimer.GameFramesCounter;
        /** расстояние до цели */
        const distanceToTarget     : number = EuclidDistance(bull.Position.X, bull.Position.Y, bull.TargetPos.X, bull.TargetPos.Y);
        
        // траектория полета снаряда

        const nPoints : number = 8;
        bull.ScriptData.Speed               = bull.Cfg.BaseBulletSpeed;// + bull.CombatParams.AdditiveBulletSpeed;
        bull.ScriptData.Trajectories        = {};
        bull.ScriptData.Trajectories.points = new Array<any>(nPoints);
        bull.ScriptData.Trajectories.times  = new Array<number>(nPoints);
        bull.ScriptData.Trajectories.frame  = 0;

        // угол от TargetPos до LaunchPos

        const angle : number = Math.atan2(bull.TargetPos.Y - bull.Position.Y, bull.TargetPos.X - bull.Position.X);
        const cosA  : number = Math.cos(angle);
        const sinA  : number = Math.sin(angle);

        const inv_speed            : number = 1.0 / bull.ScriptData.Speed;
        const inv_distanceToTarget : number = 1.0 / distanceToTarget;
        const inv_nPoints          : number = 1.0 / nPoints;
        for (var pointNum = 0; pointNum < nPoints; pointNum++) {
            const t = (pointNum + 1) * inv_nPoints * distanceToTarget;
            //const f = 0; // полет по прямой
            const f = 200 * Math.sin(2.0 * Math.PI * t * inv_distanceToTarget); // синусоида

            bull.ScriptData.Trajectories.points[pointNum] = createPoint(Math.round(bull.Position.X + t*cosA - f*sinA), Math.round(bull.Position.Y + t*sinA + f*cosA));
            if (pointNum == 0) {
                bull.ScriptData.Trajectories.times[pointNum] =
                    launchTick + ChebyshevDistance(bull.Position.X, bull.Position.Y, bull.ScriptData.Trajectories.points[pointNum].X, bull.ScriptData.Trajectories.points[pointNum].Y)
                        * inv_speed;
            } else {
                bull.ScriptData.Trajectories.times[pointNum] = 
                    bull.ScriptData.Trajectories.times[pointNum - 1] + ChebyshevDistance(bull.ScriptData.Trajectories.points[pointNum - 1].X, bull.ScriptData.Trajectories.points[pointNum - 1].Y, bull.ScriptData.Trajectories.points[pointNum].X, bull.ScriptData.Trajectories.points[pointNum].Y)
                        * inv_speed;
            }
        }

        bull.SetTargetPosition(bull.ScriptData.Trajectories.points[0], bull.ScriptData.Speed);
        bull.SetupAnimation();
    }

    protected static Fireball_processWorker(bull: any) {
        ///////////////// УРОН

        const bullCellX    = Math.floor(bull.Position.X >> 5);
        const bullCellY    = Math.floor(bull.Position.Y >> 5);
        const xs           = Math.max(0, bullCellX - 1);
        const xe           = Math.min(GlobalVars.scenaWidth - 1, bullCellX + 1);
        const ys           = Math.max(0, bullCellY - 1);
        const ye           = Math.min(GlobalVars.scenaHeight - 1, bullCellY + 1);

        var  damagedCells = bull.ScriptData.damagedCells as Map<number, Map<number, boolean>>;

        for (var x = xs; x <= xe; x++) {
            for (var y = ys; y <= ye; y++) {
                var isCellUnique = false;

                if (!damagedCells.has(x)) {
                    isCellUnique = true;
                    damagedCells.set(x, new Map<number, boolean>());
                    var damagedCellsY = damagedCells.get(x) as Map<number, boolean>;
                    damagedCellsY.set(y, true);
                } else {
                    var damagedCellsY = damagedCells.get(x) as Map<number, boolean>;

                    if (!damagedCellsY.has(y)) {
                        isCellUnique = true; 
                        damagedCellsY.set(y, true);
                    }
                }

                if (isCellUnique) {
                    var firePosition = createPoint(x << 5, y << 5);
                    HordeClassLibrary.World.Objects.Bullets.Implementations.Fire.BaseFireBullet.MakeFire(
                        bull.SourceUnit, firePosition, UnitMapLayer.Main, Teimur_Legendary_FIRE_MAGE.FireCfg);
                    if (x == y) {
                        bull.DamageArea(1);
                    }
                }
            }
        }

        ///////////////// ТРАЕКТОРИЯ

        // зацикливаем анимацию с 8 кадра до конца
        if (bull.Visual.Animator.CurrentAnimFrame == bull.Visual.CurrentAnimation.FramesCount - 1) {
            bull.Visual.Animator.SetFrame(8);
            // bull.ScriptData.animationInverted = !bull.ScriptData.animationInverted;
            // if (bull.ScriptData.animationInverted) {
            //     bull.Visual.Animator.SetFramesSwitchDirection(HCL.HordeClassLibrary.HordeContent.ViewResources.Graphics.InternalLogic.FramesSwitcher.SwitchDirection.Forward);
            // } else {
            //     bull.Visual.Animator.SetFramesSwitchDirection(HCL.HordeClassLibrary.HordeContent.ViewResources.Graphics.InternalLogic.FramesSwitcher.SwitchDirection.Inverse)
            // }
        }

        // обновляем анимацию
        bull.UpdateAnimation();
        // автоматический полет снаряда
        bull.DistanceDecrease();
        // проверка, что снаряд достиг следующей точки траектории
        if (bull.ScriptData.Trajectories.frame < bull.ScriptData.Trajectories.points.length &&
            BattleController.GameTimer.GameFramesCounter > bull.ScriptData.Trajectories.times[bull.ScriptData.Trajectories.frame]) {
            bull.ScriptData.Trajectories.frame++;
            // проверка, что существует следующая точка траектории
            if (bull.ScriptData.Trajectories.frame < bull.ScriptData.Trajectories.points.length) {
                // устанавливаем следующую целевую позицию
                bull.SetTargetPosition(bull.ScriptData.Trajectories.points[bull.ScriptData.Trajectories.frame], bull.ScriptData.Speed);
                // запоминаем кадр анимации
                const frame = bull.Visual.Animator.CurrentAnimFrame;
                // обновляем анимацию, чтобы снаряд был повернут в сторону цели
                bull.SetupAnimation();
                // кадр будет 0-ой, поэтому устанавливаем сохраненный
                bull.Visual.Animator.SetFrame(frame);
            }
            // точки нет, снаряд долетел
            else {
                // ставим состояние, что снаряд долетел
                ScriptUtils.SetValue(bull, "State", BulletState.ReachedTheGoal);
            }
        }
    }
}
export class Teimur_Legendary_GREED_HORSE extends ILegendaryUnit {
    static CfgUid      : string = "#" + CFGPrefix + "_legendary_Greed_Horse";
    static BaseCfgUid  : string = "#UnitConfig_Nature_Horse";
    static Description : string = "Если успеете убить за 30 секунд с момента первой атаки, то принесет каждому 1000/1000/1000/10 ресурсов, иначе отнимет по 500/500/500/5 ресурсов";

    // отключаем автоскейл от количества
    static MaxSpawnCount : number = -1;

    static RewardResources  : any =  createResourcesAmount(1000, 1000, 1000, 10);
    static PaymentResources : any =  createResourcesAmount(500, 500, 500, 5);
    
    static CountdownTicks : number = 50 * 30;

    countdownStartTick : number = -1;
    isChallengeEnd     : boolean    = false;

    static InitConfig() {
        ILegendaryUnit.InitConfig.call(this);

        // назначаем имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Легендарный конь алчности");
        // меняем цвет
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "TintColor", createHordeColor(150, 255, 155, 0));
        // задаем количество здоровья от числа игроков
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", Math.floor(130 * Math.sqrt(GlobalVars.difficult)));
        // делаем так, чтобы не давили всадники
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "PressureResist", 21);
    }

    public OnEveryTick(gameTickNum: number): void {
        // если в очереди меньше 2 приказов, то генерируем новые
        if (this.unit_ordersMind.OrdersCount <= 1) {
            // генерируем 5 рандомных достижимых точек вокруг цели
            var generator_  = generateRandomCellInRect(GlobalVars.teams[this.teamNum].towerCell.X - 10, GlobalVars.teams[this.teamNum].towerCell.Y - 10, 20, 20);
            var ordersCount = 5 - this.unit_ordersMind.OrdersCount;
            for (var position = generator_.next(), orderNum = 0; !position.done && orderNum < ordersCount; position = generator_.next(), orderNum++) {
                if (unitCheckPathTo(this.unit, createPoint(position.value.X, position.value.Y))) {
                    this.unit_ordersMind.AssignSmartOrder(createPoint(position.value.X, position.value.Y), AssignOrderMode.Queue, 100000);
                }
            }
        }

        // отсчет

        if (!this.isChallengeEnd) {
            if (this.countdownStartTick >= 0) {
                if (this.countdownStartTick + Teimur_Legendary_GREED_HORSE.CountdownTicks < gameTickNum) {
                    this.isChallengeEnd = true;
                    let msg2 = createGameMessageWithSound("Вы не успели, время расплаты!", createHordeColor(255, 255, 50, 10));
                    GlobalVars.teams[this.teamNum].settlement.Messages.AddMessage(msg2);
                    GlobalVars.teams[this.teamNum].settlement.Resources.TakeResources(Teimur_Legendary_GREED_HORSE.PaymentResources);
                } else {
                    var FPS         = HordeResurrection.Engine.Logic.Battle.BattleController.GameTimer.CurrentFpsLimit;
                    var secondsLeft = Math.round((this.countdownStartTick + Teimur_Legendary_GREED_HORSE.CountdownTicks - gameTickNum) / FPS);

                    if (secondsLeft <= 5 || secondsLeft % 5 == 0) {
                        let msg2 = createGameMessageWithSound("Осталось: " + secondsLeft + " секунд", createHordeColor(255, 255, 50, 10));
                        GlobalVars.teams[this.teamNum].settlement.Messages.AddMessage(msg2);
                    }
                }
            } else {
                // отлавливаем первый удар
                if (this.unit.Health != GlobalVars.configs[Teimur_Legendary_GREED_HORSE.CfgUid].MaxHealth) {
                    let msg2 = createGameMessageWithSound("Обратный отсчет начался!", createHordeColor(255, 255, 50, 10));
                    GlobalVars.teams[this.teamNum].settlement.Messages.AddMessage(msg2);
                }
            }
        }
    }

    public OnDead(gameTickNum: number) {
        // даем награду
        if (!this.isChallengeEnd) {
            let msg2 = createGameMessageWithSound("Вы успели, получите награду!", createHordeColor(255, 0, 128, 0));
            GlobalVars.teams[this.teamNum].settlement.Messages.AddMessage(msg2);
            GlobalVars.teams[this.teamNum].settlement.Resources.AddResources(Teimur_Legendary_GREED_HORSE.RewardResources);
        }
    }
    
    static GetSpawnCount(spawnCount: number) {
        // Коня спавним всегда 1, но его здоровье скайлируем

        // задаем количество здоровья
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", Math.floor(130 * Math.sqrt(GlobalVars.difficult) * spawnCount));

        return 1;
    }
}


export const TeimurLegendaryUnitsClass : Array<typeof IUnit> = [
    Teimur_Legendary_SWORDMEN,
    Teimur_Legendary_HEAVYMAN,
    Teimur_Legendary_ARCHER,
    Teimur_Legendary_ARCHER_2,
    Teimur_Legendary_RAIDER,
    Teimur_Legendary_WORKER,
    Teimur_Legendary_HORSE,
    Teimur_Legendary_DARK_DRAIDER,
    Teimur_Legendary_FIRE_MAGE,
    Teimur_Legendary_GREED_HORSE
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
    Teimur_Olga,
    Teimur_Scorpion
];

export const TeimurUnitsAllClass : Array<typeof IUnit> = TeimurLegendaryUnitsClass.concat(TeimurUnitsClass);
