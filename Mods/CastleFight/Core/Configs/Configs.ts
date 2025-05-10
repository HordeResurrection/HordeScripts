import { Config_Barrack_1, Config_Unit_1 } from "./Barracks/Config_Barrack_1";
import { Config_Barrack_1_1, Config_Unit_1_1 } from "./Barracks/Config_Barrack_1_1";
import { Config_Barrack_1_1_1, Config_Unit_1_1_1 } from "./Barracks/Config_Barrack_1_1_1";
import { Config_Barrack_1_1_1_1, Config_Unit_1_1_1_1 } from "./Barracks/Config_Barrack_1_1_1_1";
import { Config_Barrack_1_1_1_2, Config_Unit_1_1_1_2 } from "./Barracks/Config_Barrack_1_1_1_2";
import { Config_Barrack_1_1_2, Config_Unit_1_1_2 } from "./Barracks/Config_Barrack_1_1_2";
import { Config_Barrack_1_2, Config_Unit_1_2 } from "./Barracks/Config_Barrack_1_2";
import { Config_Barrack_1_2_1, Config_Unit_1_2_1 } from "./Barracks/Config_Barrack_1_2_1";
import { Config_Barrack_2, Config_Unit_2 } from "./Barracks/Config_Barrack_2";
import { Config_Barrack_2_1, Config_Unit_2_1 } from "./Barracks/Config_Barrack_2_1";
import { Config_Barrack_2_1_1, Config_Unit_2_1_1 } from "./Barracks/Config_Barrack_2_1_1";
import { Config_Barrack_2_1_2, Config_Unit_2_1_2 } from "./Barracks/Config_Barrack_2_1_2";
import { Config_Barrack_2_2, Config_Unit_2_2 } from "./Barracks/Config_Barrack_2_2";
import { Config_Barrack_2_2_1, Config_Unit_2_2_1 } from "./Barracks/Config_Barrack_2_2_1";
import { Config_Barrack_2_3, Config_Unit_2_3 } from "./Barracks/Config_Barrack_2_3";
import { Config_Barrack_2_3_1, Config_Unit_2_3_1 } from "./Barracks/Config_Barrack_2_3_1";
import { IBarrack } from "./Barracks/IBarrack";
import { IAttackingUnit } from "./IAttackingUnit";
import { Config_Church } from "./Church/Config_Church";
import { Config_Holy_spirit_accuracy } from "./Church/Config_Holy_spirit_accuracy";
import { Config_Holy_spirit_attack } from "./Church/Config_Holy_spirit_attack";
import { Config_Holy_spirit_cloning } from "./Church/Config_Holy_spirit_cloning";
import { Config_Holy_spirit_defense } from "./Church/Config_Holy_spirit_defense";
import { Config_Holy_spirit_health } from "./Church/Config_Holy_spirit_health";
import { Config_Castle } from "./Config_Castle";
import { Config_Worker } from "./Config_Worker";
import { IConfig } from "./IConfig";
import { Config_Mercenary_Swordmen } from "./Mercenary/Config_Mercenary_Swordmen";
import { Config_MercenaryCamp } from "./Mercenary/Config_MercenaryCamp";
import { Config_Mercenary_Archer } from "./Mercenary/Config_Mercenary_Archer";
import { Config_Mercenary_Archer_2 } from "./Mercenary/Config_Mercenary_Archer_2";
import { Config_Mercenary_Heavymen } from "./Mercenary/Config_Mercenary_Heavymen";
import { Config_Mercenary_Raider } from "./Mercenary/Config_Mercenary_Raider";

/** для корректной генерации описания нужен правильный порядок */
export var BarrackConfigs : Array<typeof IBarrack> = [
    Config_Barrack_1_1_1_1,
    Config_Barrack_1_1_1_2,
    Config_Barrack_1_1_1,
    Config_Barrack_1_1_2,
    Config_Barrack_1_2_1,
    Config_Barrack_1_1,
    Config_Barrack_1_2,
    Config_Barrack_1,
    
    Config_Barrack_2_1_1,
    Config_Barrack_2_1_2,
    Config_Barrack_2_2_1,
    Config_Barrack_2_3_1,
    Config_Barrack_2_1,
    Config_Barrack_2_2,
    Config_Barrack_2_3,
    Config_Barrack_2
];

export var BarrackUnitConfigs : Array<typeof IAttackingUnit> = [
    Config_Unit_1,
    Config_Unit_1_1,
    Config_Unit_1_1_1,
    Config_Unit_1_1_1_1,
    Config_Unit_1_1_1_2,
    Config_Unit_1_1_2,
    Config_Unit_1_2,
    Config_Unit_1_2_1,
    Config_Unit_2,
    Config_Unit_2_1,
    Config_Unit_2_1_1,
    Config_Unit_2_1_2,
    Config_Unit_2_2,
    Config_Unit_2_2_1,
    Config_Unit_2_3,
    Config_Unit_2_3_1
];

export var UsedConfigs : Array<typeof IConfig> = [
    ...BarrackUnitConfigs,
    ...BarrackConfigs,
    Config_Castle,
    Config_Holy_spirit_accuracy,
    Config_Holy_spirit_attack,
    Config_Holy_spirit_cloning,
    Config_Holy_spirit_defense,
    Config_Holy_spirit_health,
    Config_Church,
    Config_Mercenary_Swordmen,
    Config_Mercenary_Archer,
    Config_Mercenary_Archer_2,
    Config_Mercenary_Heavymen,
    Config_Mercenary_Raider,
    Config_MercenaryCamp,
    Config_Worker
]