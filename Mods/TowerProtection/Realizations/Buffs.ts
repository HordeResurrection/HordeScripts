import { PointCommandArgs, TilePayload, TileType, UnitArmament, UnitCommand, UnitDirection, UnitFlags, UnitHurtType, UnitMapLayer } from "library/game-logic/horde-types";
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
import { printObjectItems } from "library/common/introspection";
import { iterateOverUnitsInBox } from "library/game-logic/unit-and-map";
import { Rectangle } from "../Types/Geometry";

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

export class Buff_DigMoat extends IBuff {
    static CfgUid         : string = "#" + CFGPrefix + "_Buff_DigMoat";
    static BaseCfgUid     : string = "#UnitConfig_Nature_Draider";
    static MaxCount       : number = 4;

    constructor(teamNum: number) {
        super(teamNum);
        this.needDeleted = true;

        var buffLevel = Buff_Improvements.TowersBuffsCount[this.teamNum][Buff_Improvements.OpBuffNameToBuffIdx.get(this.constructor.name) as number];
        var towerCell = GlobalVars.teams[this.teamNum].towerCell;
        var waterRectangle : Rectangle = new Rectangle(0,0,0,0);
        if (buffLevel == 0) {
            waterRectangle = new Rectangle(towerCell.X - 5, towerCell.Y - 1, 1, 4);
        } else if (buffLevel == 1) {
            waterRectangle = new Rectangle(towerCell.X + 1 + 5, towerCell.Y - 1, 1, 4);
        } else if (buffLevel == 2) {
            waterRectangle = new Rectangle(towerCell.X - 1, towerCell.Y + 1 + 5, 4, 1);
        } else if (buffLevel == 3) {
            waterRectangle = new Rectangle(towerCell.X - 1, towerCell.Y - 5, 4, 1);
        } 

        // 1 линия // 122 151 152 123 125
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 2, waterRectangle.Y - 2), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[122], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 1, waterRectangle.Y - 2), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[151], true);
        for (var x = waterRectangle.X; x < waterRectangle.X + waterRectangle.W; x++)
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(x, waterRectangle.Y - 2), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[152], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W, waterRectangle.Y - 2), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[123], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W + 1, waterRectangle.Y - 2), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[125], true);
        // 2 линия // 126  22  10  23 128
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 2, waterRectangle.Y - 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[126], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 1, waterRectangle.Y - 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[22], true);
        for (var x = waterRectangle.X; x < waterRectangle.X + waterRectangle.W; x++)
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(x, waterRectangle.Y - 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[10], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W, waterRectangle.Y - 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[23], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W + 1, waterRectangle.Y - 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[128], true);
        // 3 линия // 126  38   3  16 147
        for (var y = waterRectangle.Y; y < waterRectangle.Y + waterRectangle.H; y++)
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 2, y), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[126], true);
        for (var y = waterRectangle.Y; y < waterRectangle.Y + waterRectangle.H; y++)
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 1, y), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[38], true);
        for (var x = waterRectangle.X; x < waterRectangle.X + waterRectangle.W; x++) {
            for (var y = waterRectangle.Y; y < waterRectangle.Y + waterRectangle.H; y++) {
                ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(x, y), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[1], true);
            }
        }
        for (var y = waterRectangle.Y; y < waterRectangle.Y + waterRectangle.H; y++)
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W, y), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[16], true);
        for (var y = waterRectangle.Y; y < waterRectangle.Y + waterRectangle.H; y++)
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W + 1, y), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[147], true);
        // 4 линия // 127  18  20  25 128
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 2, waterRectangle.Y + waterRectangle.H), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[127], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 1, waterRectangle.Y + waterRectangle.H), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[18], true);
        for (var x = waterRectangle.X; x < waterRectangle.X + waterRectangle.W; x++)
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(x, waterRectangle.Y + waterRectangle.H), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[20], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W, waterRectangle.Y + waterRectangle.H), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[25], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W + 1, waterRectangle.Y + waterRectangle.H), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[128], true);
        // 5 линия // 130 143 144 143 134
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 2, waterRectangle.Y + waterRectangle.H + 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[130], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X - 1, waterRectangle.Y + waterRectangle.H + 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[143], true);
        for (var x = waterRectangle.X; x < waterRectangle.X + waterRectangle.W; x++)
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(x, waterRectangle.Y + waterRectangle.H + 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[144], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W, waterRectangle.Y + waterRectangle.H + 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[143], true);
        ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", createPoint(waterRectangle.X + waterRectangle.W + 1, waterRectangle.Y + waterRectangle.H + 1), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[134], true);

        // не работает

        //ScriptUtils.Invoke(GlobalVars.ActiveScena.GetRealScena().LandscapeMap, "ChangeTileByConfig", [createPoint(16, 22), GlobalVars.ActiveScena.GetRealScena().Tileset.TileConfigs[1], true]);

        // не работает 

        // var cellX = 19, cellY = 20;
        // for (var x = cellX - 1; x <= cellX + 1; x++) {
        //     for (var y = cellY - 1; y <= cellY + 1; y++) {
        //         GlobalVars.ActiveScena.GetRealScena().LandscapeMap.ReplaceTileAt(createPoint(x, y), TileType.Sand, TilePayload.Exploded);
        //     }
        // }
        // GlobalVars.ActiveScena.GetRealScena().LandscapeMap.ReplaceTileAt(createPoint(cellX, cellY), TileType.Water, TilePayload.Exploded);

        // не работает

        //GlobalVars.ActiveScena.GetRealScena().LandscapeMap.ReplaceTileAt(createPoint(16, 22), TileType.Sand, TilePayload.None);
        //GlobalVars.ActiveScena.GetRealScena().LandscapeMap.ReplaceTileAt(createPoint(17, 22), TileType.Water, TilePayload.Scorched);
        //GlobalVars.ActiveScena.GetRealScena().LandscapeMap.ReplaceTileAt(createPoint(18, 22), TileType.Water, TilePayload.Chopped);
        //GlobalVars.ActiveScena.GetRealScena().LandscapeMap.ReplaceTileAt(createPoint(19, 22), TileType.Water, TilePayload.Exploded);
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        // имя
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Вырыть ров");
        // описание
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Вырыть вокруг ров, который мешает подойди к башне");
        // стоимость
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 300);

        ScriptUtils.GetValue(GlobalVars.configs[this.CfgUid], "PortraitCatalogRef").SetConfig(GlobalVars.HordeContentApi.GetAnimationCatalog("#AnimCatalog_digMoatBuffPortrait"));
    }
};

// export class Buff_SellEnemyBuff extends IBuff {
//     static CfgUid         : string = "#" + CFGPrefix + "_Buff_SellEnemyBuff";
//     static BaseCfgUid     : string = "#UnitConfig_Slavyane_Swordmen";
//     static HpCost         : number = 300;

//     constructor(teamNum: number) {
//         super(teamNum);
//         this.needDeleted = true;

//         // ищем случайного игрока
//         var enemyTeamsNum = new Array<number>();
//         for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
//             if (teamNum == this.teamNum || !GlobalVars.teams[teamNum].inGame || GlobalVars.teams[teamNum].tower.unit.IsDead) {
//                 continue;
//             }
//             enemyTeamsNum.push(teamNum);
//         }

//         // проверяем, что враги есть
//         if (enemyTeamsNum.length == 0) {
//             var msg = createGameMessageWithNoSound("Противников нет, кровавый ритуал отменен",
//                 createHordeColor(255, 140, 140, 140));
//             GlobalVars.teams[teamNum].settlement.Messages.AddMessage(msg);
//             return;
//         }

//         // выбираем случайного врага
//         var targetTeamNum = enemyTeamsNum[GlobalVars.rnd.RandomNumber(0, enemyTeamsNum.length - 1)];
        
//         // выбираем случайный бафф
//         var availableBuffClassIdxs = new Array<number>();
//         for (var buffClassIdx = 0; buffClassIdx < ImprovementsBuffsClass.length; buffClassIdx++) {
//             // проверяем, что бафф прокачен
//             if (Buff_Improvements.TowerBuffsCount[targetTeamNum][buffClassIdx] == 0) {
//                 continue;
//             }
            
//             availableBuffClassIdxs.push(buffClassIdx);
//         }

//         // выбираем случайный баф
//         var targetBuffClassIdx = availableBuffClassIdxs[GlobalVars.rnd.RandomNumber(0, availableBuffClassIdxs.length - 1)]; 

//         // ищем бафф улучшения


//         // убавляем макс хп на HpValue хп в конфиг башни
//         var towerCfg = GlobalVars.configs[PlayerTowersClass[teamNum].CfgUid];
//         ScriptUtils.SetValue(towerCfg, "MaxHealth", Math.max(towerCfg.MaxHealth - Buff_SellEnemyBuff.HpCost, 1));
//         // респавним башню
//         (GlobalVars.teams[teamNum].tower as Player_TOWER_BASE).Respawn();
//     }

//     static InitConfig() {
//         IBuff.InitConfig.call(this);

//         // вычисляем среднюю стоимость
//         var avg_sum = 0.0;
//         var avg_count = 0;
//         for (var buffClassIdx = 0; buffClassIdx < ImprovementsBuffsClass.length; buffClassIdx++) {
//             var goldCost = GlobalVars.configs[ImprovementsBuffsClass[buffClassIdx].CfgUid].CostResources.Gold;
//             if (goldCost == 0) {
//                 continue;
//             }
//             avg_sum   += goldCost;
//             avg_count ++;
//         }
//         this.HpCost = Math.floor(1.1 * avg_sum / avg_count)

//         // имя
//         ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Name", "Провести кроварый ритуал");
//         // описание
//         ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Потратить " + this.HpCost + " хп, чтобы случайный вражеский игрок потеряет случайный бафф.");

//         ScriptUtils.GetValue(GlobalVars.configs[this.CfgUid], "PortraitCatalogRef").SetConfig(GlobalVars.HordeContentApi.GetAnimationCatalog("#AnimCatalog_sellEnemyBuffPortrait"));
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
        for (var buffClassIdx = 0; buffClassIdx < Buff_Improvements.ImprovementsBuffsClass.length; buffClassIdx++) {
            // отшельник не может удвоить сам себя!
            // не может удвоить реролл
            if (Buff_Improvements.ImprovementsBuffsClass[buffClassIdx].name == "Buff_DoublingMaxBuff" ||
                Buff_Improvements.ImprovementsBuffsClass[buffClassIdx].name == "Buff_Reroll"
            ) {
                continue;
            }
            if (maxBuffIdx == -1 || Buff_Improvements.TowersBuffsCount[teamNum][buffClassIdx] > maxBuffCount) {
                maxBuffIdx   = buffClassIdx;
                maxBuffCount = Buff_Improvements.TowersBuffsCount[teamNum][buffClassIdx];
            }
        }

        var msg = createGameMessageWithNoSound("Темный отшельник удвоил '"
            + GlobalVars.configs[Buff_Improvements.ImprovementsBuffsClass[maxBuffIdx].CfgUid].Name + "' " + maxBuffCount + " -> " + (2 * maxBuffCount),
            createHordeColor(255, 140, 140, 140));
        GlobalVars.teams[teamNum].settlement.Messages.AddMessage(msg);

        // удваиваем количество данного баффа
        Buff_Improvements.TowersBuffImprRef[this.teamNum].AddBuff(maxBuffIdx, maxBuffCount, true);

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

        this.activePrevTickNum = GlobalVars.gameTickNum - GlobalVars.gameStateChangedTickNum;
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

        var nextLevel = Buff_Improvements.TowersBuffsCount[teamNum][Buff_Improvements.OpBuffNameToBuffIdx.get(this.constructor.name) as number] + 1;

        // добавляем 1 броню в конфиг башни
        var towerCfg = GlobalVars.configs[PlayerTowersClass[teamNum].CfgUid];
        ScriptUtils.SetValue(towerCfg, "Shield", towerCfg.Shield + 1);
        // добавляем резист
        if (nextLevel == 6) {
            ScriptUtils.SetValue(towerCfg, "Flags", mergeFlags(UnitFlags, towerCfg.Flags, UnitFlags.FireResistant));
            //ScriptUtils.SetValue(towerCfg, "TintColor", createHordeColor(255, 178, 34, 34));
        } else if (nextLevel == 9) {
            ScriptUtils.SetValue(towerCfg, "Flags", mergeFlags(UnitFlags, towerCfg.Flags, UnitFlags.MagicResistant));
            //ScriptUtils.SetValue(towerCfg, "TintColor", createHordeColor(255, 192, 5, 248));
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
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "Description", "Добавляет 1 броню. На 6 уровне добавляет иммун к огню. На 9 уровне добавляет иммун к магии.");
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
        // if (this.unit_ordersMind.IsIdle()) {
        //     var commandsMind       = this.unit.CommandsMind;
        //     var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");

        //     if (disallowedCommands.ContainsKey(UnitCommand.Attack)) disallowedCommands.Remove(UnitCommand.Attack);

        //     var pointCommandArgs1 = new PointCommandArgs(createPoint(towerCell.X - this.patrolRadius,     towerCell.Y - this.patrolRadius),     UnitCommand.Attack, AssignOrderMode.Queue);
        //     var pointCommandArgs2 = new PointCommandArgs(createPoint(towerCell.X + this.patrolRadius + 1, towerCell.Y - this.patrolRadius),     UnitCommand.Attack, AssignOrderMode.Queue);
        //     var pointCommandArgs3 = new PointCommandArgs(createPoint(towerCell.X + this.patrolRadius + 1, towerCell.Y + this.patrolRadius + 1), UnitCommand.Attack, AssignOrderMode.Queue);
        //     var pointCommandArgs4 = new PointCommandArgs(createPoint(towerCell.X - this.patrolRadius,     towerCell.Y + this.patrolRadius + 1), UnitCommand.Attack, AssignOrderMode.Queue);
        //     this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs1);
        //     this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs2);
        //     this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs3);
        //     this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs4);

        //     disallowedCommands.Add(UnitCommand.Attack, 1);
        // }

        if (this.unit_ordersMind.IsIdle()) {
            var targetsUnitInfo : any[] = [];

            // ищем ближайшие цели
            let unitsIter = iterateOverUnitsInBox(this.unit.Cell, 10);
            for (let u = unitsIter.next(); !u.done; u = unitsIter.next()) {
                var _unit = u.value;

                if (_unit.IsDead || _unit.Id == this.unit.Id || _unit.Owner.Uid == GlobalVars.teams[this.teamNum].settlementIdx) {
                    continue;
                }

                // +0.5,+0.5 это чтобы центр башни
                // итоговое расстояние уменьшаем на 1, чтобы расстояние от края башни считалось
                targetsUnitInfo.push({
                    unit: _unit,
                    distance: ChebyshevDistance(_unit.Cell.X, _unit.Cell.Y, this.unit.Cell.X + 0.5, this.unit.Cell.Y + 0.5) - 1
                });
            }

            if (targetsUnitInfo.length > 0) {
                // сортируем
                targetsUnitInfo.sort((a, b) => {
                    return a.distance - b.distance;
                });

                var commandsMind       = this.unit.CommandsMind;
                var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");

                if (disallowedCommands.ContainsKey(UnitCommand.Attack)) disallowedCommands.Remove(UnitCommand.Attack);

                var pointCommandArgs1 = new PointCommandArgs(
                    targetsUnitInfo[0].unit.Cell,
                    UnitCommand.Attack,
                    AssignOrderMode.Queue);
                this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs1);

                disallowedCommands.Add(UnitCommand.Attack, 1);
            } else {
                var commandsMind       = this.unit.CommandsMind;
                var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");

                if (disallowedCommands.ContainsKey(UnitCommand.MoveToPoint)) disallowedCommands.Remove(UnitCommand.MoveToPoint);
                
                var pointCommandArgs1 = new PointCommandArgs(
                    createPoint(towerCell.X, towerCell.Y),
                    UnitCommand.MoveToPoint,
                    AssignOrderMode.Queue);
                this.unit.Cfg.GetOrderDelegate(this.unit, pointCommandArgs1);

                disallowedCommands.Add(UnitCommand.MoveToPoint, 1);
            }
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
            this.defenderDeadTickNum    = GlobalVars.gameTickNum - GlobalVars.gameStateChangedTickNum;
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

        this.reloadPrevTickNum = GlobalVars.gameTickNum - GlobalVars.gameStateChangedTickNum;
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
        ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].CostResources, "Gold", 250);
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

export class Buff_Improvements extends IBuff {
    static CfgUid         :   string = "#" + CFGPrefix + "_Buff_Improvements";
    static BaseCfgUid     :   string = "#UnitConfig_Slavyane_Worker1";

    static ImprovementPlans    : Array<Array<number>>;
    static TowersBuffsCount     : Array<Array<number>>;
    static TowersBuffImprRef : Array<Buff_Improvements>;
    static OpBuffNameToBuffIdx : Map<string, number>;
    static ImprovementsBuffsClass : Array<typeof IBuff> = [
        //Buff_Reroll,
        Buff_PeriodIncomeGold,
        Buff_PeriodHealing,
        Buff_DigMoat,
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
        Buff_Defender_Raider,
    
        // важно, чтобы данный бафф был после всех
        //Buff_SellEnemyBuff
    ];

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

                // добавляем бафф
                that.TryBuyBuff(UnitProducedEventArgs.Unit.Cfg.Uid);

                // удаляем юнита
                var deleteParams          = new DeleteUnitParameters();
                deleteParams.UnitToDelete = UnitProducedEventArgs.Unit;
                GlobalVars.teams[that.teamNum].settlement.Units.DeleteUnit(deleteParams);
            } catch (ex) {
                log.exception(ex);
            }
        });

        // сохраняем ссылку для всех
        Buff_Improvements.TowersBuffImprRef[this.teamNum] = this;
    }

    public TryBuyBuff(buffCfgUid : string) {
        // отменяем постройку
        GlobalVars.teams[this.teamNum].tower.unit.OrdersMind.CancelOrdersSafe();

        // ищем номер баффа
        for (var buffClassIdx = 0; buffClassIdx < Buff_Improvements.ImprovementsBuffsClass.length; buffClassIdx++) {
            var buffClass = Buff_Improvements.ImprovementsBuffsClass[buffClassIdx];
            if (buffClass.CfgUid == buffCfgUid) {
                var buffCfg = GlobalVars.configs[buffClass.CfgUid];

                // добавляем бафф
                var addCount = this.AddBuff(buffClassIdx);

                // если не добавлен, то возвращаем деньги
                if (addCount == 0) {
                    GlobalVars.teams[this.teamNum].incomeGold   += buffCfg.CostResources.Gold;
                    GlobalVars.teams[this.teamNum].incomeMetal  += buffCfg.CostResources.Metal;
                    GlobalVars.teams[this.teamNum].incomeLumber += buffCfg.CostResources.Lumber;
                    GlobalVars.teams[this.teamNum].incomePeople += buffCfg.CostResources.People;

                    let msg = createGameMessageWithNoSound("Достигнут лимит '"
                        + buffCfg.Name + "' = " + Buff_Improvements.TowersBuffsCount[this.teamNum][buffClassIdx] + ". Потраченное возвращено.",
                        createHordeColor(255, 200, 200, 200));
                    GlobalVars.teams[this.teamNum].settlement.Messages.AddMessage(msg);
                }
                // если добавлен
                else {
                    let msg = createGameMessageWithNoSound("Добавлен " + (addCount == 1 ? "" : addCount) + " '" + buffCfg.Name
                        + "', всего " + Buff_Improvements.TowersBuffsCount[this.teamNum][buffClassIdx] + (buffClass.MaxCount > 0 ? " / " + buffClass.MaxCount : ""),
                        createHordeColor(255, 200, 200, 200));
                    GlobalVars.teams[this.teamNum].settlement.Messages.AddMessage(msg);
                }

                this.towerProduceList.Clear();
                this.impPlanCurrNum++;

                // динамически генерируем план
                if (this.impPlanCurrNum == Buff_Improvements.ImprovementPlans.length) {
                    Buff_Improvements.ImprovementPlans.push([]);
                    var keys    = Array.from(Array(Buff_Improvements.ImprovementsBuffsClass.length).keys());
                    for (var i = 0; i < 3; i++) {
                        var index = GlobalVars.rnd.RandomNumber(0, keys.length - 1);
                        var key   = keys[index];
                        keys.splice(index, 1);
                        Buff_Improvements.ImprovementPlans[Buff_Improvements.ImprovementPlans.length - 1].push(key);
                    }
                }

                // устанавливаем следующий набор баффов
                for (var buffClassIdx of Buff_Improvements.ImprovementPlans[this.impPlanCurrNum]) {
                    this.towerProduceList.Add(GlobalVars.configs[Buff_Improvements.ImprovementsBuffsClass[buffClassIdx].CfgUid]);
                }

                break;
            }
        }
    }

    /** добавить бафф */
    public AddBuff(buffClassIdx: number, count: number = 1, forceFlag: boolean = false) : number {
        var buffClass = Buff_Improvements.ImprovementsBuffsClass[buffClassIdx];
        var i = 0;
        for (; i < count && (forceFlag || buffClass.MaxCount <= 0 || Buff_Improvements.TowersBuffsCount[this.teamNum][buffClassIdx] < buffClass.MaxCount); i++) {
            GlobalVars.buffs.push(new buffClass(this.teamNum));
            Buff_Improvements.TowersBuffsCount[this.teamNum][buffClassIdx]++;
        }

        return i;
    }

    /** удалить бафф */
    public DeleteBuff(buffClassIdx: number, count: number = 1) : number {
        var buffClass = Buff_Improvements.ImprovementsBuffsClass[buffClassIdx];
        var i = 0;
        for (; i < count && Buff_Improvements.TowersBuffsCount[this.teamNum][buffClassIdx] > 0; i++) {
            GlobalVars.buffs.push(new buffClass(this.teamNum, true));
            Buff_Improvements.TowersBuffsCount[this.teamNum][buffClassIdx]--;
        }
        return i;
    }

    static InitConfig() {
        IBuff.InitConfig.call(this);

        // инициализируем оператор перевода

        this.OpBuffNameToBuffIdx = new Map<string, number>();
        for (var buffClassIdx = 0; buffClassIdx < Buff_Improvements.ImprovementsBuffsClass.length; buffClassIdx++) {
            this.OpBuffNameToBuffIdx.set(Buff_Improvements.ImprovementsBuffsClass[buffClassIdx].name, buffClassIdx);
        }

        // инициализируем первые 3 баффа

        this.ImprovementPlans = new Array<Array<number>>();
        this.ImprovementPlans.push(new Array<number>());
        var keys    = Array.from(Array(Buff_Improvements.ImprovementsBuffsClass.length).keys());
        for (var i = 0; i < 3; i++) {
            var index = GlobalVars.rnd.RandomNumber(0, keys.length - 1);
            var key   = keys[index];
            keys.splice(index, 1);
            this.ImprovementPlans[this.ImprovementPlans.length - 1].push(key);
        }

        this.TowersBuffsCount = new Array<Array<number>>(GlobalVars.teams.length);
        this.TowersBuffImprRef = new Array<Buff_Improvements>(GlobalVars.teams.length);
        for (var teamNum = 0; teamNum < GlobalVars.teams.length; teamNum++) {
            if (!GlobalVars.teams[teamNum].inGame ||
                GlobalVars.teams[teamNum].tower.unit.IsDead) {
                continue;
            }

            this.TowersBuffsCount[teamNum] = new Array<number>(Buff_Improvements.ImprovementsBuffsClass.length);
            for (var buffClassIdx = 0; buffClassIdx < Buff_Improvements.ImprovementsBuffsClass.length; buffClassIdx++) {
                this.TowersBuffsCount[teamNum][buffClassIdx] = 0;
            }

            var producerParams    = GlobalVars.configs[PlayerTowersClass[teamNum].CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            var towerProduceList = producerParams.CanProduceList;

            // инициализируем первый план
            towerProduceList.Clear();
            for (var buffClassIdx of Buff_Improvements.ImprovementPlans[0]) {
                towerProduceList.Add(GlobalVars.configs[Buff_Improvements.ImprovementsBuffsClass[buffClassIdx].CfgUid]);
            }
        }
    }

    private _surrounded : boolean = false;
    public OnEveryTick(gameTickNum: number): void {
        if (GlobalVars.teams[this.teamNum].tower.unit_ordersMind.ActiveOrder.ProductUnitConfig) {
            var activeMotion = GlobalVars.teams[this.teamNum].tower.unit_ordersMind.ActiveMotion;
            if (activeMotion.LeftTime <= 0) {
                // нас окружили, а бафф уже готов
                // ставим флаг об этом
                if (!this._surrounded) {
                    this._surrounded = true;
                }
                // нас окружили, а бафф уже готов и флаг уже стоит
                // значит применяет бафф вручную
                else {
                    this._surrounded = false;

                    // делаем так, чтобы деньги не вернули
                    activeMotion.IsPaid = false;

                    // добавить бафф
                    this.TryBuyBuff(GlobalVars.teams[this.teamNum].tower.unit_ordersMind.ActiveOrder.ProductUnitConfig.Uid);
                }
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
        for (var i = 0; i < Buff_Improvements.ImprovementsBuffsClass.length; i++) {
            var buffCfg   = GlobalVars.configs[Buff_Improvements.ImprovementsBuffsClass[i].CfgUid];
            var buffName  = buffCfg.Name;
            var buffCount = Buff_Improvements.TowersBuffsCount[this.teamNum][i];

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
    ...Buff_Improvements.ImprovementsBuffsClass,
    Buff_Improvements
];