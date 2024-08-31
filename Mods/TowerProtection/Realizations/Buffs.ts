import { PointCommandArgs, UnitArmament, UnitCommand, UnitDirection, UnitFlags, UnitHurtType, UnitMapLayer } from "library/game-logic/horde-types";
import { CFGPrefix, DeleteUnitParameters, GlobalVars } from "../GlobalData";
import { IBuff } from "../Types/IBuff";
import { Player_TOWER_BASE, PlayerTowersClass } from "./Player_units";
import { createHordeColor, createPF, createPoint } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { log } from "library/common/logging";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { IUnit } from "../Types/IUnit";
import { createGameMessageWithNoSound } from "library/common/messages";
import { mergeFlags } from "library/dotnet/dotnet-utils";
import { ChebyshevDistance, spawnUnits } from "../Utils";
import { generateCellInSpiral } from "library/common/position-tools";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { spawnDecoration } from "library/game-logic/decoration-spawn";

// export class Buff_Reroll extends IBuff {
//     static CfgUid         : string = "#" + CFGPrefix + "_Buff_Reroll";
//     static BaseCfgUid     : string = "#UnitConfig_Slavyane_Swordmen";

//     constructor(teamNum: number) {
//         super(teamNum);
//         this.needDeleted = true;
//     }

//     static InitConfig() {
//         IBuff.InitConfig.call(this);

//         // имя
//         ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Немножко выпить");
//         //
//         ScriptUtils.GetValue(GlobalVars.configs[this.CfgUid], "PortraitCatalogRef").SetConfig(GlobalVars.HordeContentApi.GetAnimationCatalog("#AnimCatalog_RerollPortrait"));
//         // описание
//         ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Вы вроде ничего не купили, но ассортимент изменился.");
//         // стоимость
//         ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 50);
//     }
// };

export class Buff_DoublingMaxBuff extends IBuff {
    static CfgUid         : string = "#" + CFGPrefix + "_Buff_DoublingMaxBuff";
    static BaseCfgUid     : string = "#UnitConfig_Nature_Draider";
    static MaxCount       : number = 1;
    static HpCost         : number = 1000;

    constructor(teamNum: number) {
        super(teamNum);
        this.needDeleted = true;

        // ищем максимально прокаченный бафф
        let maxBuffIdx   = -1;
        let maxBuffCount = 0;
        for (var buffClassIdx = 0; buffClassIdx < ImprovementsBuffsClass.length; buffClassIdx++) {
            // отшельник не может удвоить сам себя!
            // не может удвоить реролл
            if (ImprovementsBuffsClass[buffClassIdx].name == "Buff_DoublingMaxBuff" ||
                ImprovementsBuffsClass[buffClassIdx].name == "Buff_Reroll"
            ) {
                continue;
            }
            if (maxBuffIdx == -1 || Buff_Improvements.TowerBuffsCount[teamNum][buffClassIdx] > maxBuffCount) {
                maxBuffIdx   = buffClassIdx;
                maxBuffCount = Buff_Improvements.TowerBuffsCount[teamNum][buffClassIdx];
            }
        }

        var msg = createGameMessageWithNoSound("Темный отшельник удволи бафф '"
            + GlobalVars.configs[ImprovementsBuffsClass[maxBuffIdx].CfgUid].Name + "' " + maxBuffCount + " -> " + (2 * maxBuffCount),
            createHordeColor(255, 140, 140, 140));
        GlobalVars.teams[teamNum].settlement.Messages.AddMessage(msg);

        // удваиваем количество данного баффа
        for (var i = 0; i < maxBuffCount; i++) {
            GlobalVars.buffs.push(new ImprovementsBuffsClass[maxBuffIdx](teamNum));
        }
        Buff_Improvements.TowerBuffsCount[teamNum][maxBuffIdx] += maxBuffCount;

        // убавляем макс хп на HpValue хп в конфиг башни
        var towerCfg = GlobalVars.configs[PlayerTowersClass[teamNum].CfgUid];
        ScriptUtils.SetValue(towerCfg, "MaxHealth", Math.max(towerCfg.MaxHealth - Buff_DoublingMaxBuff.HpCost, 1));
        // респавним башню
        (GlobalVars.teams[teamNum].tower as Player_TOWER_BASE).Respawn();
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Пригласить темного отшельника");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Удваивает максимально прокаченный бафф за 1000 хп. Осторожно, можно пригласить 1 раз.");
    }
};

export class Buff_PeriodIncomeGold extends IBuff {
    static CfgUid         : string = "#" + CFGPrefix + "_Buff_PeriodIncomeGold";
    static BaseCfgUid     : string = "#UnitConfig_Slavyane_Mine";
    static Period         : number = 250;
    static IncomeGold     : number = 10;
    activePrevTickNum     : number;
    remainder             : number;

    constructor(teamNum: number) {
        super(teamNum);

        this.activePrevTickNum = GlobalVars.gameTickNum - GlobalVars.startGameTickNum;
        this.remainder         = 0;
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Построить шахту");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description",
            "Добывает " + Buff_PeriodIncomeGold.IncomeGold + " золота за " + (Buff_PeriodIncomeGold.Period / 50) + " сек");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 300);
    }

    public OnEveryTick(gameTickNum: number) {
        if (this.activePrevTickNum + Buff_PeriodIncomeGold.Period <= gameTickNum) {
            var income              = this.remainder + (gameTickNum - this.activePrevTickNum) * Buff_PeriodIncomeGold.IncomeGold / Buff_PeriodIncomeGold.Period;
            var income_int          = Math.floor(income);
            this.remainder          = income - income_int;
            this.activePrevTickNum  = gameTickNum;
            GlobalVars.teams[this.teamNum].incomeGold += income_int;
        }
    }
};

export class Buff_PeriodHealing extends IBuff {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_PeriodHealing";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Worker1";
    static MaxCount       :   number = 7; 
    static ActivatePeriod :   number = 250;
    static HealingValue   :   number = 100;

    constructor(teamNum: number) {
        super(teamNum);

        this.processingTick       = 0;
        this.processingTickModule = Buff_PeriodHealing.ActivatePeriod;
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Нанять работника");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description",
            "Ремонтирует " + Buff_PeriodHealing.HealingValue + " хп каждые " + (Buff_PeriodHealing.ActivatePeriod / 50) + " сек");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 250);
    }

    public OnEveryTick(gameTickNum: number) {
        const maxHealth = GlobalVars.configs[PlayerTowersClass[this.teamNum].CfgUid].MaxHealth;

        if (GlobalVars.teams[this.teamNum].tower.unit.Health + Buff_PeriodHealing.HealingValue < maxHealth) {
            GlobalVars.teams[this.teamNum].tower.unit.Health += Buff_PeriodHealing.HealingValue;
        }
    }
};

export class Buff_AddShield extends IBuff {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_AddShield";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Turel";

    constructor(teamNum: number) {
        super(teamNum);

        var level = Buff_Improvements.TowerBuffsCount[teamNum][Buff_Improvements.OpBuffNameToBuffIdx.get(this.constructor.name) as number];

        // добавляем 1 броню в конфиг башни
        var towerCfg = GlobalVars.configs[PlayerTowersClass[teamNum].CfgUid];
        ScriptUtils.SetValue(towerCfg, "Shield", towerCfg.Shield + 1);
        // добавляем резист
        if (level == 5) {
            ScriptUtils.SetValue(towerCfg, "Flags", mergeFlags(UnitFlags, towerCfg.Flags, UnitFlags.FireResistant));
        } else if (level == 8) {
            ScriptUtils.SetValue(towerCfg, "Flags", mergeFlags(UnitFlags, towerCfg.Flags, UnitFlags.MagicResistant));
        }
        // респавним башню
        (GlobalVars.teams[teamNum].tower as Player_TOWER_BASE).Respawn();
        // удаляем бафф
        this.needDeleted = true;
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Укрепить башню");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Добавляет 1 броню. На 5 уровне добавляет иммун к огню. На 8 уровне добавляет иммун к магии.");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 500);
    }
};

export class Buff_AddMaxHP extends IBuff {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_AddHP";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Tower";
    static HpValue        :   number = 500;

    constructor(teamNum: number) {
        super(teamNum);

        // увеличиваем макс ХП
        var towerCfg = GlobalVars.configs[PlayerTowersClass[teamNum].CfgUid];
        ScriptUtils.SetValue(towerCfg, "MaxHealth", towerCfg.MaxHealth + Buff_AddMaxHP.HpValue);
        // респавним башню
        (GlobalVars.teams[teamNum].tower as Player_TOWER_BASE).Respawn();
        // удаляем бафф
        this.needDeleted = true;
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Укрепить башню");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Добавляет 500 хп к текущему и максимальному здоровью");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 500);
    }
};

export class Buff_HpToGold extends IBuff {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_HpToGold";
    static BaseCfgUid     :   string = "#UnitConfig_Barbarian_Swordmen";
    static HpValue        :   number = 500;
    static GoldValue      :   number = 450;

    constructor(teamNum: number) {
        super(teamNum);

        // убавляем макс хп на HpValue хп в конфиг башни
        var towerCfg = GlobalVars.configs[PlayerTowersClass[teamNum].CfgUid];
        ScriptUtils.SetValue(towerCfg, "MaxHealth", Math.max(towerCfg.MaxHealth - Buff_HpToGold.HpValue, 1));
        // респавним башню
        (GlobalVars.teams[teamNum].tower as Player_TOWER_BASE).Respawn();
        // удаляем бафф
        this.needDeleted = true;
        // добавляем GoldValue
        GlobalVars.teams[teamNum].incomeGold += Buff_HpToGold.GoldValue;
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Пригласить торговца Теймера");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Купить 450 золота за 500 здоровья. Осторожно! Меньше 1 здоровье не опустится!");
    }
};

export class DefenderUnit extends IUnit {
    static CfgUid      : string = "";
    static BaseCfgUid  : string = "";

    patrolRadius       : number;
    patrolMaxRadius    : number;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);

        // запрещаем командывать игроку
        var commandsMind       = this.unit.CommandsMind;
        var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");
        disallowedCommands.Add(UnitCommand.MoveToPoint, 1);
        disallowedCommands.Add(UnitCommand.HoldPosition, 1);
        disallowedCommands.Add(UnitCommand.Attack, 1);
        disallowedCommands.Add(UnitCommand.Capture, 1);
        disallowedCommands.Add(UnitCommand.StepAway, 1);
        disallowedCommands.Add(UnitCommand.Cancel, 1);
    }

    public OnEveryTick(gameTickNum: number): void {
        var towerCell         = GlobalVars.teams[this.teamNum].towerCell;

        // если отошли далеко, то идем назад
        var distanceToTower = ChebyshevDistance(towerCell.X + 0.5, towerCell.Y + 0.5, this.unit.Cell.X, this.unit.Cell.Y);
        if (distanceToTower > this.patrolMaxRadius) {
            var commandsMind       = this.unit.CommandsMind;
            var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");

            if (disallowedCommands.ContainsKey(UnitCommand.MoveToPoint)) disallowedCommands.Remove(UnitCommand.MoveToPoint);
            
            var pointCommandArgs1 = new PointCommandArgs(createPoint(towerCell.X, towerCell.Y), UnitCommand.MoveToPoint, AssignOrderMode.Replace);
            this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs1);

            disallowedCommands.Add(UnitCommand.MoveToPoint, 1);
        }

        // патрулируем вокруг башни
        if (this.unit_ordersMind.IsIdle()) {
            var commandsMind       = this.unit.CommandsMind;
            var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");

            if (disallowedCommands.ContainsKey(UnitCommand.Attack)) disallowedCommands.Remove(UnitCommand.Attack);

            var pointCommandArgs1 = new PointCommandArgs(createPoint(towerCell.X - this.patrolRadius,     towerCell.Y - this.patrolRadius),     UnitCommand.Attack, AssignOrderMode.Queue);
            var pointCommandArgs2 = new PointCommandArgs(createPoint(towerCell.X + this.patrolRadius + 1, towerCell.Y - this.patrolRadius),     UnitCommand.Attack, AssignOrderMode.Queue);
            var pointCommandArgs3 = new PointCommandArgs(createPoint(towerCell.X + this.patrolRadius + 1, towerCell.Y + this.patrolRadius + 1), UnitCommand.Attack, AssignOrderMode.Queue);
            var pointCommandArgs4 = new PointCommandArgs(createPoint(towerCell.X - this.patrolRadius,     towerCell.Y + this.patrolRadius + 1), UnitCommand.Attack, AssignOrderMode.Queue);
            this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs1);
            this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs2);
            this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs3);
            this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs4);

            disallowedCommands.Add(UnitCommand.Attack, 1);
        }
    }
}

export class IBuff_Defender_Unit extends IBuff {
    static CfgUid              :   string = "";
    static BaseCfgUid          :   string = "";
    static DefenderCfgBaseUid  :   string = "";
    static DefenderRespawnTime :   number = 0;

    // для каждой тимы хранит уровень защитника
    static TeamsDefenderLevel  :   Array<number>;

    static Upgrade_HP          :   number = 0;
    static Upgrade_Damage      :   number = 0;
    static Upgrade_Shield      :   number = 0;
    static Upgrade_ImmuneFire  :   number = -1;
    static Upgrade_ImmuneMagic :   number = -1;

    static PatrolRadius        :   number = 4;
    static PatrolMaxRadius     :   number = 10;

    defenderDeadTickNum        :   number;
    defenderUnit               :   DefenderUnit | null;
    defenderKillsCounter       :   number;
    defenderCurrLevel          :   number;

    constructor(teamNum: number) {
        super(teamNum);

        var TeamsDefenderLevel = this.constructor['TeamsDefenderLevel'];

        // если CFG инициализирован, тогда прокачиваем его и удаляем бафф
        if (TeamsDefenderLevel[this.teamNum] != 0) {
            TeamsDefenderLevel[this.teamNum]++;
            this.needDeleted = true;
        } else {
            TeamsDefenderLevel[this.teamNum]++;
            this.defenderUnit           = null;
            this.defenderDeadTickNum    = GlobalVars.gameTickNum - GlobalVars.startGameTickNum;
            this.defenderKillsCounter   = 0;
            this.defenderCurrLevel      = 1;

            // var that = this;
            // поддержка системы уровней
            // GlobalVars.teams[teamNum].settlement.Units.UnitReplaced.connect(function (sender, args) {
            //     if (that.defenderUnit != null && args.OldUnit.Id == that.defenderUnit.Id) {
            //         that.defenderUnit = args.NewUnit;

            //         // запрещаем командывать игроку
            //         var commandsMind       = that.defenderUnit.CommandsMind;
            //         var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");
            //         disallowedCommands.Add(UnitCommand.MoveToPoint, 1);
            //         disallowedCommands.Add(UnitCommand.HoldPosition, 1);
            //         disallowedCommands.Add(UnitCommand.Attack, 1);
            //         disallowedCommands.Add(UnitCommand.Capture, 1);
            //         disallowedCommands.Add(UnitCommand.StepAway, 1);
            //         disallowedCommands.Add(UnitCommand.Cancel, 1);
            //     }
            // });
        }
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        this.TeamsDefenderLevel = new Array<number>(GlobalVars.teams.length);
        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            this.TeamsDefenderLevel[teamNum] = 0;
        }

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Нанять защитника - " + HordeContentApi.GetUnitConfig(this.DefenderCfgBaseUid).Name);
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Охраняет башню. Респавн " + this.DefenderRespawnTime / 50
            + " сек. За каждое улучшение получает "
            + this.Upgrade_HP + " хп, "
            + this.Upgrade_Damage + " урона"
            + (this.Upgrade_Shield > 0 ? ", " + this.Upgrade_Shield + " брони" : "")
            + (this.Upgrade_ImmuneFire > 0 ? ", иммун к огню с " + this.Upgrade_ImmuneFire + " уровня" : "")
            + (this.Upgrade_ImmuneMagic > 0 ? ", иммун к магии с " + this.Upgrade_ImmuneMagic + " уровня" : "")
        );
    }

    public OnEveryTick(gameTickNum: number) {
        var defenderLevel     = this.constructor['TeamsDefenderLevel'][this.teamNum];

        // если защитника прокачали
        if (this.defenderUnit != null && this.defenderCurrLevel != defenderLevel) {
            this.defenderCurrLevel    = defenderLevel;

            var units                   = GlobalVars.teams[this.teamNum].settlement.Units;
            var deleteParams            = new DeleteUnitParameters();
            deleteParams.UnitToDelete   = this.defenderUnit.unit;
            units.DeleteUnit(deleteParams);

            spawnDecoration(GlobalVars.ActiveScena.GetRealScena(), GlobalVars.HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), this.defenderUnit.unit.Position);

            this.defenderUnit.needDeleted = true;
            this.defenderDeadTickNum      = gameTickNum - this.constructor['DefenderRespawnTime'];
            this.defenderKillsCounter     = this.defenderUnit.unit.KillsCounter;
            this.defenderUnit             = null;
        }

        // если защитник умер
        if (this.defenderUnit == null) {
            // пришло время для спавна
            if (this.defenderDeadTickNum + this.constructor['DefenderRespawnTime'] <= gameTickNum) {
                var towerCell       = GlobalVars.teams[this.teamNum].towerCell;
                var generator       = generateCellInSpiral(towerCell.X, towerCell.Y);

                // создаем конфиг, если нет
                var defenderCfgUid    = this.constructor['DefenderCfgBaseUid'] + "_level_" + defenderLevel;
                var defenderCfg : any = null;
                if (!HordeContentApi.HasUnitConfig(defenderCfgUid)) {
                    defenderCfg = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig(this.constructor['DefenderCfgBaseUid']), defenderCfgUid);

                    GlobalVars.ScriptUtils.SetValue(defenderCfg, "MaxHealth", Math.floor(defenderLevel*this.constructor['Upgrade_HP']));
                    GlobalVars.ScriptUtils.SetValue(defenderCfg.MainArmament.ShotParams, "Damage", Math.floor(defenderLevel*this.constructor['Upgrade_Damage']));
                    if (this.constructor['Upgrade_Shield'] > 0) {
                        GlobalVars.ScriptUtils.SetValue(defenderCfg, "Shield", Math.floor(defenderLevel*this.constructor['Upgrade_Shield']));
                    }
                    if (this.constructor['Upgrade_ImmuneFire'] <= defenderLevel) {
                        ScriptUtils.SetValue(defenderCfg, "Flags", mergeFlags(UnitFlags, defenderCfg.Flags, UnitFlags.FireResistant));
                    }
                    if (this.constructor['Upgrade_ImmuneMagic'] <= defenderLevel) {
                        ScriptUtils.SetValue(defenderCfg, "Flags", mergeFlags(UnitFlags, defenderCfg.Flags, UnitFlags.MagicResistant));
                    }
                } else {
                    defenderCfg = HordeContentApi.GetUnitConfig(defenderCfgUid);
                }

                // создаем юнита
                this.defenderUnit = new DefenderUnit(spawnUnits(GlobalVars.teams[this.teamNum].settlement,
                    defenderCfg,
                    1,
                    UnitDirection.Down,
                    generator)[0], this.teamNum);
                // задаем параметры
                this.defenderUnit.patrolRadius      = this.constructor['PatrolRadius'];
                this.defenderUnit.patrolMaxRadius   = this.constructor['PatrolMaxRadius'];
                this.defenderUnit.unit.KillsCounter = this.defenderKillsCounter;
                // добавляем в обработчик
                GlobalVars.units.push(this.defenderUnit);
            }
        } else {
            // если юнит умер, то очищаем ссылку и делаем респавн
            if (this.defenderUnit.unit.IsDead) {
                this.defenderKillsCounter = this.defenderUnit.unit.KillsCounter;
                this.defenderUnit         = null;
                this.defenderDeadTickNum  = gameTickNum;
            }
        }
    }
}

export class Buff_Defender_Heavyman extends IBuff_Defender_Unit {
    static CfgUid               :   string = "#" + CFGPrefix + "_Buff_Defender_Heavyman";
    static BaseCfgUid           :   string = "#UnitConfig_Slavyane_Heavymen";
    static DefenderCfgBaseUid   :   string = "#UnitConfig_Slavyane_Heavymen";
    static DefenderRespawnTime  :   number = 10*50;

    static Upgrade_HP           :   number = 100;
    static Upgrade_Damage       :   number = 4;
    static Upgrade_Shield       :   number = 0.8;
    static Upgrade_ImmuneFire   :   number = 5;
    static Upgrade_ImmuneMagic  :   number = 10;

    static PatrolRadius         :   number = 4;

    constructor(teamNum: number) {
        super(teamNum);
    }

    static InitConfig() {
        IBuff_Defender_Unit.InitConfig.call(this);

        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 250);
    }
}

export class Buff_Defender_Raider extends IBuff_Defender_Unit {
    static CfgUid               :   string = "#" + CFGPrefix + "_Buff_Defender_Raider";
    static BaseCfgUid           :   string = "#UnitConfig_Slavyane_Raider";
    static DefenderCfgBaseUid   :   string = "#UnitConfig_Slavyane_Raider";
    static DefenderRespawnTime  :   number = 10*50;

    static Upgrade_HP           :   number = 100;
    static Upgrade_Damage       :   number = 5;
    static Upgrade_ImmuneFire   :   number = 5;
    static Upgrade_ImmuneMagic  :   number = 10;

    static PatrolRadius         :   number = 6;
    static PatrolMaxRadius      :   number = 14;

    constructor(teamNum: number) {
        super(teamNum);
    }

    static InitConfig() {
        IBuff_Defender_Unit.InitConfig.call(this);

        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 270);
    }
}

export class IBuff_PeriodAttack_Bullet extends IBuff {
    static CfgUid         :   string = "";
    static BaseCfgUid     :   string = "";
    static ReloadTicks    :   number = 0;

    private static _BulletCfg      :   any;
    private static _SourceArmament :   any;

    reloadTicks           : number;
    reloadPrevTickNum     : number;

    private _bulletCfg  : any;
    private _sourceArmament : any;

    constructor(teamNum: number) {
        super(teamNum);

        this.reloadPrevTickNum = GlobalVars.gameTickNum - GlobalVars.startGameTickNum;
        this.reloadTicks       = this.constructor['ReloadTicks'];
        this._bulletCfg        = this.constructor['_BulletCfg'];
        this._sourceArmament   = this.constructor['_SourceArmament'];
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        var cfg = HordeContentApi.GetUnitConfig(this.CfgUid);

        this._BulletCfg  = HordeContentApi.GetBulletConfig(cfg.MainArmament.BulletConfig.Uid);

        this._SourceArmament = UnitArmament.CreateArmament(this._BulletCfg);
        ScriptUtils.SetValue(this._SourceArmament.ShotParams, "Damage", cfg.MainArmament.ShotParams.Damage);
        ScriptUtils.SetValue(this._SourceArmament.ShotParams, "AdditiveBulletSpeed", createPF(0, 0));
        ScriptUtils.SetValue(this._SourceArmament, "Range", cfg.MainArmament.Range);
        ScriptUtils.SetValue(this._SourceArmament, "ForestRange", cfg.MainArmament.ForestRange);
        ScriptUtils.SetValue(this._SourceArmament, "RangeMin", cfg.MainArmament.RangeMin);
        ScriptUtils.SetValue(this._SourceArmament, "Levels", cfg.MainArmament.Levels);
        ScriptUtils.SetValue(this._SourceArmament, "ReloadTime", cfg.MainArmament.ReloadTime);
        ScriptUtils.SetValue(this._SourceArmament, "BaseAccuracy", cfg.MainArmament.BaseAccuracy);
        ScriptUtils.SetValue(this._SourceArmament, "MaxDistanceDispersion", cfg.MainArmament.MaxDistanceDispersion);
        ScriptUtils.SetValue(this._SourceArmament, "DisableDispersion", cfg.MainArmament.DisableDispersion);
        ScriptUtils.SetValue(this._SourceArmament, "EmitBulletsCountMin", 1);
        ScriptUtils.SetValue(this._SourceArmament, "EmitBulletsCountMax", 1);
    }

    public OnEveryTick(gameTickNum: number) {
        if (this.reloadPrevTickNum + this.reloadTicks <= gameTickNum) {
            var tower      = GlobalVars.teams[this.teamNum].tower as Player_TOWER_BASE;
            var targetUnit = tower.GetTargetUnit(this._sourceArmament.Range);
            if (targetUnit != null) {
                // отправляемся на перезарядку, только если выстрелили
                this.reloadPrevTickNum = gameTickNum;

                spawnBullet(
                    tower.unit,
                    targetUnit,
                    this._sourceArmament,
                    this._bulletCfg,
                    this._sourceArmament.ShotParams,
                    tower.unit.Position,
                    targetUnit.Position,
                    UnitMapLayer.Main);
            }
        }
    }
}

export class Buff_PeriodAttack_Swordmen extends IBuff_PeriodAttack_Bullet {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_PeriodAttack_Swordmen";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Swordmen";
    static ReloadTicks    :   number = 50;

    constructor(teamNum: number) {
        super(teamNum);
    }

    static InitConfig() {
        IBuff_PeriodAttack_Bullet.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Нанять рыцаря");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Бьёт каждые " + (this.ReloadTicks / 50) + " секунды");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 100);
    }
}

export class Buff_PeriodAttack_Arrow extends IBuff_PeriodAttack_Bullet {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_PeriodAttack_Arrow";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Archer";
    static ReloadTicks    :   number = 100;

    constructor(teamNum: number) {
        super(teamNum);
    }

    static InitConfig() {
        IBuff_PeriodAttack_Bullet.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Нанять лучника");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Стреляет каждые " + (this.ReloadTicks / 50) + " секунды");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 100);
    }
}

export class Buff_PeriodAttack_Arrow_2 extends IBuff_PeriodAttack_Bullet {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_PeriodAttack_Arrow_2";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Archer_2";
    static ReloadTicks    :   number = 100;

    constructor(teamNum: number) {
        super(teamNum);
    }

    static InitConfig() {
        IBuff_PeriodAttack_Bullet.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Нанять поджигателя");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Стреляет каждые " + (this.ReloadTicks / 50) + " секунды");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 200);
    }
}

export class Buff_PeriodAttack_Catapult extends IBuff_PeriodAttack_Bullet {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_PeriodAttack_Catapult";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Catapult";
    static ReloadTicks    :   number = 150;

    constructor(teamNum: number) {
        super(teamNum);
    }

    static InitConfig() {
        IBuff_PeriodAttack_Bullet.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Нанять катапульту");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Стреляет каждые " + (this.ReloadTicks / 50) + " секунды");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 200);
    }
}

export class Buff_PeriodAttack_Balista extends IBuff_PeriodAttack_Bullet {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_PeriodAttack_Balista";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Balista";
    static ReloadTicks    :   number = 150;

    constructor(teamNum: number) {
        super(teamNum);
    }

    static InitConfig() {
        IBuff_PeriodAttack_Bullet.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Нанять баллисту");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Стреляет каждые " + (this.ReloadTicks / 50) + " секунды");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 200);
    }
}

export class Buff_PeriodAttack_Ikon extends IBuff_PeriodAttack_Bullet {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_PeriodAttack_Ikon";
    static BaseCfgUid     :   string = "#UnitConfig_Mage_Mag_16";
    static ReloadTicks    :   number = 300;

    constructor(teamNum: number) {
        super(teamNum);
    }

    static InitConfig() {
        IBuff_PeriodAttack_Bullet.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Нанять Икона");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Стреляет каждые " + (this.ReloadTicks / 50) + " секунды");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 750);
    }
}

export class Buff_PeriodAttack_Villur extends IBuff_PeriodAttack_Bullet {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_PeriodAttack_Villur";
    static BaseCfgUid     :   string = "#UnitConfig_Mage_Villur";
    static ReloadTicks    :   number = 300;

    constructor(teamNum: number) {
        super(teamNum);
    }

    static InitConfig() {
        IBuff_PeriodAttack_Bullet.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Нанять Виллура");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Стреляет каждые " + (this.ReloadTicks / 50) + " секунды. Осторожно, возможно, самоподжигание");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 600);
    }
}

const ImprovementsBuffsClass : Array<typeof IBuff> = [
    //Buff_Reroll,
    Buff_PeriodIncomeGold,
    Buff_PeriodHealing,
    Buff_AddShield,
    Buff_AddMaxHP,
    Buff_PeriodAttack_Swordmen,
    Buff_PeriodAttack_Arrow,
    Buff_PeriodAttack_Arrow_2,
    Buff_PeriodAttack_Catapult,
    Buff_PeriodAttack_Balista,
    Buff_PeriodAttack_Ikon,
    Buff_PeriodAttack_Villur,
    Buff_HpToGold,
    Buff_DoublingMaxBuff,
    Buff_Defender_Heavyman,
    Buff_Defender_Raider
];

export class Buff_Improvements extends IBuff {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_Improvements";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Worker1";

    static ImprovementPlans    : Array<Array<number>>;
    static TowerBuffsCount     : Array<Array<number>>;
    static OpBuffNameToBuffIdx : Map<string, number>;

    onProducedHandler: any;

    impPlanCurrNum   : number;
    towerProduceList : any;

    constructor(teamNum: number) {
        super(teamNum);

        this.impPlanCurrNum   = 0;
        var producerParams    = GlobalVars.configs[PlayerTowersClass[this.teamNum].CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        this.towerProduceList = producerParams.CanProduceList;

        var that = this;
        // подписываемся на событие о постройке юнитов
        this.onProducedHandler = GlobalVars.teams[teamNum].settlement.Units.UnitProduced.connect(function (sender, UnitProducedEventArgs) {
            try {
                // проверяем, что построил нужный юнит
                if (UnitProducedEventArgs.ProducerUnit.Id != GlobalVars.teams[that.teamNum].tower.unit.Id) {
                    return;
                }

                // отменяем постройку
                GlobalVars.teams[that.teamNum].tower.unit.OrdersMind.CancelOrdersSafe();

                var producedUnitCfg = UnitProducedEventArgs.Unit.Cfg;

                // ищем номер баффа
                for (var buffClassIdx = 0; buffClassIdx < ImprovementsBuffsClass.length; buffClassIdx++) {
                    var buffClass = ImprovementsBuffsClass[buffClassIdx];
                    if (buffClass.CfgUid == producedUnitCfg.Uid) {
                        var buffCfg = GlobalVars.configs[buffClass.CfgUid];

                        // проверяем, что баффов не больше нужного количества
                        if (buffClass.MaxCount > 0 && Buff_Improvements.TowerBuffsCount[teamNum][buffClassIdx] >= buffClass.MaxCount) {
                            GlobalVars.teams[teamNum].incomeGold   += buffCfg.CostResources.Gold;
                            GlobalVars.teams[teamNum].incomeMetal  += buffCfg.CostResources.Metal;
                            GlobalVars.teams[teamNum].incomeLumber += buffCfg.CostResources.Lumber;
                            GlobalVars.teams[teamNum].incomePeople += buffCfg.CostResources.People;

                            let msg = createGameMessageWithNoSound("Достигнут лимит '"
                                + buffCfg.Name + "' = " + Buff_Improvements.TowerBuffsCount[teamNum][buffClassIdx] + ". Потраченное возвращено.",
                                createHordeColor(255, 200, 200, 200));
                            GlobalVars.teams[that.teamNum].settlement.Messages.AddMessage(msg);
                        } else {
                            GlobalVars.buffs.push(new buffClass(that.teamNum));
                            Buff_Improvements.TowerBuffsCount[teamNum][buffClassIdx]++;

                            let msg = createGameMessageWithNoSound("Добавлен '" + buffCfg.Name
                                + "', всего " + Buff_Improvements.TowerBuffsCount[teamNum][buffClassIdx] + (buffClass.MaxCount > 0 ? " / " + buffClass.MaxCount : ""),
                                createHordeColor(255, 200, 200, 200));
                            GlobalVars.teams[that.teamNum].settlement.Messages.AddMessage(msg);
                        }

                        that.towerProduceList.Clear();
                        that.impPlanCurrNum++;

                        // динамически генерируем план
                        if (that.impPlanCurrNum == Buff_Improvements.ImprovementPlans.length) {
                            Buff_Improvements.ImprovementPlans.push([]);
                            var keys    = Array.from(Array(ImprovementsBuffsClass.length).keys());
                            for (var i = 0; i < 3; i++) {
                                var index = GlobalVars.rnd.RandomNumber(0, keys.length - 1);
                                var key   = keys[index];
                                keys.splice(index, 1);
                                Buff_Improvements.ImprovementPlans[Buff_Improvements.ImprovementPlans.length - 1].push(key);
                            }
                        }

                        // устанавливаем следующий набор баффов
                        for (var buffClassIdx of Buff_Improvements.ImprovementPlans[that.impPlanCurrNum]) {
                            that.towerProduceList.Add(GlobalVars.configs[ImprovementsBuffsClass[buffClassIdx].CfgUid]);
                        }

                        break;
                    }
                }

                // удаляем юнита
                var deleteParams          = new DeleteUnitParameters();
                deleteParams.UnitToDelete = UnitProducedEventArgs.Unit;
                GlobalVars.teams[that.teamNum].settlement.Units.DeleteUnit(deleteParams);
            } catch (ex) {
                log.exception(ex);
            }
        });
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        // инициализируем оператор перевода
        this.OpBuffNameToBuffIdx = new Map<string, number>();
        for (var buffClassIdx = 0; buffClassIdx < ImprovementsBuffsClass.length; buffClassIdx++) {
            this.OpBuffNameToBuffIdx.set(ImprovementsBuffsClass[buffClassIdx].name, buffClassIdx);
        }

        // инициализируем первые 4 баффа

        this.ImprovementPlans = new Array<Array<number>>();
        this.ImprovementPlans.push(new Array<number>());
        var keys    = Array.from(Array(ImprovementsBuffsClass.length).keys());
        for (var i = 0; i < 3; i++) {
            var index = GlobalVars.rnd.RandomNumber(0, keys.length - 1);
            var key   = keys[index];
            keys.splice(index, 1);
            this.ImprovementPlans[this.ImprovementPlans.length - 1].push(key);
        }

        this.TowerBuffsCount = new Array<Array<number>>(GlobalVars.teams.length);
        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            if (!GlobalVars.teams[teamNum].inGame ||
                GlobalVars.teams[teamNum].tower.unit.IsDead) {
                continue;
            }

            this.TowerBuffsCount[teamNum] = new Array<number>(ImprovementsBuffsClass.length);
            for (var buffClassIdx = 0; buffClassIdx < ImprovementsBuffsClass.length; buffClassIdx++) {
                this.TowerBuffsCount[teamNum][buffClassIdx] = 0;
            }

            var producerParams    = GlobalVars.configs[PlayerTowersClass[teamNum].CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var towerProduceList = producerParams.CanProduceList;

            // инициализируем первый план
            towerProduceList.Clear();
            for (var buffClassIdx of Buff_Improvements.ImprovementPlans[0]) {
                towerProduceList.Add(GlobalVars.configs[ImprovementsBuffsClass[buffClassIdx].CfgUid]);
            }
        }
    }

    public OnDead(gameTickNum: number) {
        // отписываемся от события
        if (this.onProducedHandler) {
            this.onProducedHandler.disconnect();
        }
        // выводим игроку его баффы
        var str         = "Вами были куплены следующие баффы:\n";
        var spentGold   = 0;
        var spentMetal  = 0;
        var spentLumber = 0;
        var spentPeople = 0;
        for (var i = 0; i < ImprovementsBuffsClass.length; i++) {
            var buffCfg   = GlobalVars.configs[ImprovementsBuffsClass[i].CfgUid];
            var buffName  = buffCfg.Name;
            var buffCount = Buff_Improvements.TowerBuffsCount[this.teamNum][i];

            if (buffCount == 0) {
                continue;
            }

            str += buffName + " : " + buffCount + "\n";

            spentGold   += buffCfg.CostResources.Gold;
            spentMetal  += buffCfg.CostResources.Metal;
            spentLumber += buffCfg.CostResources.Lumber;
            spentPeople += buffCfg.CostResources.People;
        }
        str += "Вы потратили: " + spentMetal + " металла " + spentGold + " золота " + spentLumber + " дерева " + spentPeople + " людей\n";
        let msg = createGameMessageWithNoSound(str, createHordeColor(255, 200, 200, 200));
        GlobalVars.teams[this.teamNum].settlement.Messages.AddMessage(msg);
    }
}

export const BuffsClass : Array<typeof IBuff> = [
    ...ImprovementsBuffsClass,
    Buff_Improvements
];