// оборачиваем все в пространство имен
namespace _5_Oborona_ot_Tejmura {

// \todo
// сделать у Богдана шатер вместо замка
// и когда игроки побеждают, то пусть шатер уничтожается

// флаг, что игра закончилась
var mapdefens_isFinish;
// 40 минут с 50 кадрами в секунду
var mapdefens_timeEnd;
// ссылка на замок, который должны уничтожить враги
var mapdefens_goalCastle;
// прямоугольник для спавна
var mapdefens_enemySpawnRectangle;
// конфиги юнитов для спавна
var mapdefens_enemyUnitsCfg;
// конфиги снарядов
var mapdefens_enemyBulletCfg;
// игрок врага для управления
//var mapdefens_enemyPlayer;
// игрок врага для управления
var mapdefens_enemySettlement;
// текущая волна
var mapdefens_spawnWaveNum;
// план для спавна
var mapdefens_spawnPlan;
// максимальное количество игроков в игре
var mapdefens_playersMaxCount;
// количество игроков в игре
var mapdefens_playersCount : number;

// список ид легендарных юнитов
var mapdefens_legendaryUnitsCFGId;
// слабость легендарных юнитов
var mapdefens_legendaryUnitsInformation;

// список легендарных рыцарей на карте
var mapdefens_legendary_swordmen_unitsInfo;
// список легендарных всадников на карте
var mapdefens_legendary_raider_unitsInfo;
// список легендарных инженер на карте
var mapdefens_legendary_worker_unitsInfo;

export function mapdefens_onFirstRun() {
    var realScena   = scena.GetRealScena();
    var settlements = realScena.Settlements;
    // Рандомизатор
    var rnd         = realScena.Context.Randomizer;
    
    mapdefens_isFinish    = false;
    mapdefens_timeEnd     = (40 * 60) * 50;
    mapdefens_enemySpawnRectangle = {
        x: 0,
        y: 0,
        w: 182,
        h: 22
    };

    mapdefens_playersMaxCount = 5;
    mapdefens_playersCount    = 0;
    // пробегаемся по занятым слотам
    for (var player of players) {
        var realPlayer = player.GetRealPlayer();
        var settlement = realPlayer.GetRealSettlement();
        
        // игрок
        if (settlement.Uid < mapdefens_playersMaxCount) {
            if (!HordeUtils.getValue(realPlayer, "MasterMind")) {
                mapdefens_playersCount++;

                // позиция цели врагов
                var position = createPoint(89, 124);
                //var position = createPoint(89, 150); // для тестов;

                // любому игроку добавляем церковь - цель врагов
                if (!mapdefens_goalCastle) {
                    // церкви тут нету - начало карты
                    if (unitCanBePlacedByRealMap(HordeContent.GetUnitConfig("#UnitConfig_Slavyane_Church"), position.X, position.Y)) {
                        var goalUnitCfg = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Slavyane_Church"));
                        // увеличиваем хп до 400
                        HordeUtils.setValue(goalUnitCfg, "MaxHealth", 400);
                        // убираем починку
                        goalUnitCfg.ProfessionParams.Remove(UnitProfession.Reparable);

                        mapdefens_goalCastle = spawnUnit(
                            settlement,
                            goalUnitCfg,
                            position,
                            UnitDirection.Down
                        );
                    }
                    // что-то мешает, скорее всего это горячая загрузка скриптов
                    else {
                        mapdefens_goalCastle = realScena.UnitsMap.GetUpperUnit(position);
                    }
                }
                logi("Поселение ", settlement.Uid, " is player");
            }
        }
    }
    logi("Игроков: ", mapdefens_playersCount);

    // ссылка на поселение врага
    mapdefens_enemySettlement = settlements.Item.get('5');

    ////////////////////////////
    // задаем конфиги врагов
    ////////////////////////////

    mapdefens_enemyUnitsCfg       = {};
    mapdefens_enemyBulletCfg      = {};
    mapdefens_legendaryUnitsCFGId = [];
    mapdefens_legendaryUnitsInformation = [];

    // (легкая пехота) рыцарь
    mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Swordmen"] = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Barbarian_Swordmen"));
    // (легкая пехота) лучник
    mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Archer"]   = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Barbarian_Archer"));
    // (легкая пехота) лучник с зажигательными стрелами
    mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Archer_2"] = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Barbarian_Archer_2"));

    // (тяжелая пехота) тяжелый рыцарь
    mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Heavymen"] = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Barbarian_Heavymen"));

    // (конница) всадник
    mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Raider"]   = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Barbarian_Raider"));

    // (техника) катапульта
    mapdefens_enemyUnitsCfg["UnitConfig_Slavyane_Catapult"]  = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Slavyane_Catapult"));
    // (техника) баллиста
    mapdefens_enemyUnitsCfg["UnitConfig_Slavyane_Balista"]   = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Slavyane_Balista"));

    // (маг) Фантом (1 молния)
    mapdefens_enemyUnitsCfg["UnitConfig_Mage_Mag_2"]         = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Mage_Mag_2"));
    // (маг) Виллур (1 фаерболл)
    mapdefens_enemyUnitsCfg["UnitConfig_Mage_Villur"]        = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Mage_Villur"));
    // (маг) Ольга (шторм из молний)
    mapdefens_enemyUnitsCfg["UnitConfig_Mage_Olga"]          = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Mage_Olga"));

    // (легендарный) рыцарь
    mapdefens_legendaryUnitsCFGId.push("UnitConfig_legendary_swordmen");
    mapdefens_legendaryUnitsInformation.push("Слабости: давится, горит. Преимущества: очень силен в ближнем бою.");
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_swordmen"] = HordeContent.CloneConfig(mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Swordmen"]);
    // назначаем имя
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_swordmen"], "Name", "Легендарный рыцарь");
    // меняем цвет
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_swordmen"], "TintColor", createHordeColor(255, 255, 100, 100));
    // задаем количество здоровья от числа игроков
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_swordmen"], "MaxHealth", Math.floor(100 * Math.sqrt(mapdefens_playersCount)));
    // создаем конфиги для клонов
    var swordmenClonesDepth = Math.ceil(Math.log2(mapdefens_enemyUnitsCfg["UnitConfig_legendary_swordmen"].MaxHealth / 10));
    for (var i = 0; i < swordmenClonesDepth; i++) {
        var uid = "UnitConfig_legendary_swordmen_" + i;

        // копируем базового рыцаря
        mapdefens_enemyUnitsCfg[uid] = HordeContent.CloneConfig(mapdefens_enemyUnitsCfg["UnitConfig_legendary_swordmen"]);
        // задаем количество здоровья
        HordeUtils.setValue(mapdefens_enemyUnitsCfg[uid], "MaxHealth", Math.ceil(mapdefens_enemyUnitsCfg["UnitConfig_legendary_swordmen"].MaxHealth / Math.pow(2, i + 1)));
        // задаем цвет
        HordeUtils.setValue(mapdefens_enemyUnitsCfg[uid], "TintColor", createHordeColor(255, 255, Math.floor(255 * (i + 1) / swordmenClonesDepth), Math.floor(255 * (i + 1) / swordmenClonesDepth)));
    }

    // (легендарный) тяжелый рыцарь
    mapdefens_legendaryUnitsCFGId.push("UnitConfig_legendary_heavymen");
    mapdefens_legendaryUnitsInformation.push("Слабости: горит, окружение. Преимущества: ближний бой, броня, много хп.");
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_heavymen"] = HordeContent.CloneConfig(mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Heavymen"]);
    // назначаем имя
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_heavymen"], "Name", "Легендарный тяжелый рыцарь");
    // меняем цвет
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_heavymen"], "TintColor", createHordeColor(255, 255, 100, 100));
    // увеличиваем хп
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_heavymen"], "MaxHealth", Math.floor(400 * Math.sqrt(mapdefens_playersCount)));
    // делаем броню 3, чтобы стрели не брали его
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_heavymen"], "Shield", 3);

    // (легендарный) лучник
    mapdefens_legendaryUnitsCFGId.push("UnitConfig_legendary_archer");
    mapdefens_legendaryUnitsInformation.push("Слабости: ближний бой, окружение. Преимущества: дальний бой, не горит.");
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"] = HordeContent.CloneConfig(mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Archer"]);
    // назначаем имя
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"], "Name", "Легендарный лучник");
    // меняем цвет
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"], "TintColor", createHordeColor(255, 255, 100, 100));
    // стреляет сразу 10 стрелами
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"].MainArmament, "EmitBulletsCountMin", 10);
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"].MainArmament, "EmitBulletsCountMax", 10);
    // увеличиваем разброс
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"].MainArmament, "BaseAccuracy", 0);
    // увеличиваем дальность
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"].MainArmament, "Range", 10);
    // делаем так, чтобы не давили всадники
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"], "Weight", 12);
    // задаем количество здоровья от числа игроков
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"], "MaxHealth", Math.floor(200 * Math.sqrt(mapdefens_playersCount)));
    // делаем имунитет к огню
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer"], "Flags", UnitFlags.FireResistant);

    // (легендарный) поджигатель
    mapdefens_legendaryUnitsCFGId.push("UnitConfig_legendary_archer_2");
    mapdefens_legendaryUnitsInformation.push("Слабости: ближний бой, окружение. Преимущества: дальний бой, не горит.");
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"] = HordeContent.CloneConfig(mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Archer_2"]);
    // назначаем имя
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"], "Name", "Легендарный поджигатель");
    // меняем цвет
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"], "TintColor", createHordeColor(255, 255, 100, 100));
    // стреляет сразу 5 стрелами
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"].MainArmament, "EmitBulletsCountMin", 5);
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"].MainArmament, "EmitBulletsCountMax", 5);
    // увеличиваем дальность
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"].MainArmament, "Range", 10);
    // увеличиваем разброс
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"].MainArmament, "BaseAccuracy", 0);
    // делаем так, чтобы не давили всадники
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"], "Weight", 12);
    // задаем количество здоровья от числа игроков
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"], "MaxHealth", Math.floor(200 * Math.sqrt(mapdefens_playersCount)));
    // делаем имунитет к огню
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_archer_2"], "Flags", UnitFlags.FireResistant);

    // (легендарный) всадник
    mapdefens_legendaryUnitsCFGId.push("UnitConfig_legendary_Raider");
    mapdefens_legendaryUnitsInformation.push("Слабости: ближний бой, окружение, горит. Преимущества: скорость, спавн союзников.");
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_Raider"] = HordeContent.CloneConfig(mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Raider"]);
    // назначаем имя
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_Raider"], "Name", "Легендарный всадник");
    // меняем цвет
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_Raider"], "TintColor", createHordeColor(255, 255, 100, 100));
    // задаем количество здоровья от числа игроков
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_Raider"], "MaxHealth", Math.floor(200 * Math.sqrt(mapdefens_playersCount)));
    // делаем урон = 0
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_Raider"].MainArmament.BulletCombatParams, "Damage", 0);

    // (легендарная) башня к крестьянину
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"] = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Slavyane_Tower"));
    // назначаем имя
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"], "Name", "Легендарная башня");
    // меняем цвет
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"], "TintColor", createHordeColor(255, 255, 100, 100));
    // задаем количество здоровья от числа игроков
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"], "MaxHealth", Math.floor(50 * Math.sqrt(mapdefens_playersCount)));
    // делаем башню бесплатной
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"].CostResources, "Gold",   0);
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"].CostResources, "Metal",  0);
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"].CostResources, "Lumber", 0);
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"].CostResources, "People", 0);
    // убираем требования у башни
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"].TechConfig.Requirements.Clear();
    // ускоряем время постройки
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"], "ProductionTime", 200);
    // убираем возможность захвата
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"].ProfessionParams.Remove(UnitProfession.Capturable);
    
    // (легендарный) крестьянин
    mapdefens_legendaryUnitsCFGId.push("UnitConfig_legendary_worker");
    mapdefens_legendaryUnitsInformation.push("Слабости: ближний бой, окружение, огонь, ранней атаки. Преимущества: строит башни.");
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker"] = HordeContent.CloneConfig(HordeContent.GetUnitConfig("#UnitConfig_Barbarian_Worker1"));
    // назначаем имя
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker"], "Name", "Легендарный инженер");
    // меняем цвет
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker"], "TintColor", createHordeColor(255, 255, 100, 100));
    // задаем количество здоровья от числа игроков
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker"], "MaxHealth", Math.floor(300 * Math.sqrt(mapdefens_playersCount)));
    // делаем так, чтобы не давили всадники
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker"], "Weight", 12);
    // удаляем команду атаки
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker"].AllowedCommands.Remove(UnitCommand.Attack);
    // добавляем в список построек легендарную башню
    {
        var producerParams = mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker"].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        produceList.Clear();
        produceList.Add(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"]);
    }

    // (легендарная) баллиста
    /*mapdefens_legendaryUnitsCFGId.push("UnitConfig_legendary_Balista");
    // делаем стрелы
    var legendary_balista_arrows = 5;
    for (var i = 0; i < legendary_balista_arrows; i++) {
        var arrowId = "BulletConfig_legendary_BallistaArrow_" + i;

        // клонируем обычный снаряд баллисты
        mapdefens_enemyBulletCfg[arrowId] = HordeContent.CloneConfig(HordeContent.GetBulletConfig("#BulletConfig_BallistaArrow"));
        
        // устанавливаем 1 фрагмент
        HordeUtils.setValue(mapdefens_enemyBulletCfg[arrowId].SpecialParams, "FragmentsCount", 1);
        // делаем, чтобы текущая стрела вылетала из следующей
        if (i > 0) {
            HordeUtils.setValue(mapdefens_enemyBulletCfg["BulletConfig_legendary_BallistaArrow_" + (i - 1)].SpecialParams.FragmentBulletConfig, "Uid", mapdefens_enemyBulletCfg[arrowId].Uid);
        }

        //mapdefens_enemyBulletCfg["BulletConfig_legendary_BallistaArrow_1_fragment"] = HordeContent.CloneConfig(HordeContent.GetBulletConfig("#BulletConfig_BallistaArrow_Fragment"));
        //printObjectItems(mapdefens_enemyBulletCfg["BulletConfig_legendary_BallistaArrow_1_fragment"], 2);
        //HordeUtils.setValue(mapdefens_enemyBulletCfg["BulletConfig_legendary_BallistaArrow_1_fragment"], "Archetype", mapdefens_enemyBulletCfg["BulletConfig_legendary_BallistaArrow_1"].Uid);
        
        //HordeUtils.setValue(mapdefens_enemyBulletCfg["BulletConfig_legendary_BallistaArrow_0"].SpecialParams, "FragmentsFlyRadius", 8);
        //HordeUtils.setValue(mapdefens_enemyBulletCfg["BulletConfig_legendary_BallistaArrow_0"].SpecialParams.FragmentCombatParams, "AdditiveBulletSpeed", createPF(5, 5));
        //printObjectItems(mapdefens_enemyBulletCfg["BulletConfig_legendary_BallistaArrow_0"].SpecialParams, 2);
    }
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_Balista"] = HordeContent.CloneConfig(mapdefens_enemyUnitsCfg["UnitConfig_Slavyane_Balista"]);
    // назначаем имя
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_Balista"], "Name", "Легендарная баллиста");
    // меняем цвет
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_Balista"], "TintColor", createHordeColor(255, 255, 100, 100));
    // задаем количество здоровья от числа игроков
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_Balista"], "MaxHealth", Math.floor(300 * Math.sqrt(mapdefens_playersCount)));
    // ставим легендарный снаряд
    HordeUtils.setValue(mapdefens_enemyUnitsCfg["UnitConfig_legendary_Balista"].MainArmament.BulletConfig, "Uid", mapdefens_enemyBulletCfg["BulletConfig_legendary_BallistaArrow_0"].Uid);
    // убираем возможность захвата
    mapdefens_enemyUnitsCfg["UnitConfig_legendary_Balista"].ProfessionParams.Remove(UnitProfession.Capturable);*/
    
    /////////////////////////
    // общие настройки для всех юнитов
    /////////////////////////

    // убираем возможность захвата зданий у всех юнитов
    // нужно убрать
    for (var unitID in mapdefens_enemyUnitsCfg) {
        mapdefens_enemyUnitsCfg[unitID].AllowedCommands.Remove(UnitCommand.Capture);
    }
    
    ////////////////////////////////////////////////////
    // задаем волны спавна
    ////////////////////////////////////////////////////

    mapdefens_spawnWaveNum = 0;
    var planNum = rnd.RandomNumber(1, 2);
    if (planNum == 1) {
        initWavePlan_1();
    } else if (planNum == 2) {
        initWavePlan_2();
    }

    // тест
    // mapdefens_spawnPlan = [];
    // mapdefens_spawnPlan.push({
    //    message: "ВОЛНА 1",
    //    gameTickNum: 1 * 60 * 50,
    //    units: [
    //        { count: 1 * mapdefens_playersCount, cfgId: "UnitConfig_legendary_Raider" }
    //    ]
    // });

    // считает сколько будет врагов
    var unitsTotalCount = {};
    for (var plan of mapdefens_spawnPlan) {
        for (var unitInfo of plan.units) {
            if (unitsTotalCount[unitInfo.cfgId] == undefined) {
                unitsTotalCount[unitInfo.cfgId] = 0;
            }
            unitsTotalCount[unitInfo.cfgId] += unitInfo.count;
        }
    }
    for (var unitCfg in unitsTotalCount) {
        logi(unitCfg, " ", unitsTotalCount[unitCfg]);
    }

    ////////////////////////////////////////////////////
    // списки легендарных юнитов на карте
    ////////////////////////////////////////////////////

    if (!mapdefens_legendary_swordmen_unitsInfo) {
        mapdefens_legendary_swordmen_unitsInfo = [];
    }
    if (!mapdefens_legendary_raider_unitsInfo) {
        mapdefens_legendary_raider_unitsInfo = [];
    }
    if (!mapdefens_legendary_worker_unitsInfo) {
        mapdefens_legendary_worker_unitsInfo = [];
    }
}

export function mapdefens_everyTick(gameTickNum: number) {
    var FPS = HordeEngine.HordeResurrection.Engine.Logic.Battle.BattleController.GameTimer.CurrentFpsLimit;

    var realScena   = scena.GetRealScena();
    // Рандомизатор
    var rnd         = realScena.Context.Randomizer;

    // конец игры
    if (mapdefens_isFinish) {
        return;
    }

    //////////////////////////////////////////
    // оповещаем сколько осталось до конца
    //////////////////////////////////////////
    if (gameTickNum % (30 * FPS) == 0) {
        var secondsLeft = Math.round(mapdefens_timeEnd - gameTickNum) / FPS;
        var minutesLeft = Math.floor(secondsLeft / 60);
        secondsLeft -= minutesLeft * 60;

        broadcastMessage("Осталось продержаться " + (minutesLeft > 0 ? minutesLeft + " минут " : "") + secondsLeft + " секунд", createHordeColor(255, 100, 100, 100));
    }

    //////////////////////////////////////////
    // регистрируем конец игры
    //////////////////////////////////////////
    
    // целевой объект разрушили - игроки проиграли
    if ((!mapdefens_goalCastle || mapdefens_goalCastle.IsDead) && !mapdefens_isFinish) {
        mapdefens_isFinish = true;
        broadcastMessage("ИГРОКИ ПРОИГРАЛИ", createHordeColor(255, 255, 50, 10));
        for (var i = 0; i < mapdefens_playersMaxCount; i++) {
            scena.GetRealScena().Settlements.Item.get("" + i).Existence.ForceDefeat();
        }
    }
    // прошло gameEnd тиков - игроки победили
    if (gameTickNum >= mapdefens_timeEnd) {
        mapdefens_isFinish = true;
        broadcastMessage("ИГРОКИ ПОБЕДИЛИ", createHordeColor(255, 255, 50, 10));
        scena.GetRealScena().Settlements.Item.get("" + mapdefens_playersMaxCount).Existence.ForceDefeat();
    }

    //////////////////////////////////////////
    // обработка волн
    //////////////////////////////////////////

    while (mapdefens_spawnWaveNum < mapdefens_spawnPlan.length && mapdefens_spawnPlan[mapdefens_spawnWaveNum].gameTickNum <= gameTickNum) {
        // отправляем сообщение в чат, если оно есть
        if (mapdefens_spawnPlan[mapdefens_spawnWaveNum]["message"]) {
            logi(mapdefens_spawnPlan[mapdefens_spawnWaveNum]["message"]);
            
            broadcastMessage(mapdefens_spawnPlan[mapdefens_spawnWaveNum]["message"], createHordeColor(255, 255, 50, 10));
        }

        // спавним юнитов
        var generator = generateRandomPositionInRect2D(mapdefens_enemySpawnRectangle.x, mapdefens_enemySpawnRectangle.y, mapdefens_enemySpawnRectangle.w, mapdefens_enemySpawnRectangle.h);
        for (var i = 0; i < mapdefens_spawnPlan[mapdefens_spawnWaveNum].units.length; i++) {
            if (mapdefens_spawnPlan[mapdefens_spawnWaveNum].units[i].count <= 0) {
                continue;
            }

            var spawnedUnits = spawnUnits(mapdefens_enemySettlement,
                mapdefens_enemyUnitsCfg[mapdefens_spawnPlan[mapdefens_spawnWaveNum].units[i].cfgId],
                mapdefens_spawnPlan[mapdefens_spawnWaveNum].units[i].count,
                UnitDirection.Down,
                generator);
            
            // информируем о легендарных противниках и их слабостях
            var legendaryIndex = mapdefens_legendaryUnitsCFGId.indexOf(mapdefens_spawnPlan[mapdefens_spawnWaveNum].units[i].cfgId);
            if (legendaryIndex >= 0) {
                broadcastMessage("Замечен " + mapdefens_enemyUnitsCfg[mapdefens_spawnPlan[mapdefens_spawnWaveNum].units[i].cfgId].Name, createHordeColor(255, 255, 165, 10));
                broadcastMessage(mapdefens_legendaryUnitsInformation[legendaryIndex], createHordeColor(255, 200, 130, 10));
            }

            // запоминаем некоторых легендарных юнитов в список
            if ("UnitConfig_legendary_swordmen" == mapdefens_spawnPlan[mapdefens_spawnWaveNum].units[i].cfgId) {
                for (var spawnedUnit of spawnedUnits) {
                    mapdefens_legendary_swordmen_unitsInfo.push({
                        unit:       spawnedUnit,
                        cloneDepth: 0
                    });
                }
            } else if ("UnitConfig_legendary_Raider" == mapdefens_spawnPlan[mapdefens_spawnWaveNum].units[i].cfgId) {
                for (var spawnedUnit of spawnedUnits) {
                    mapdefens_legendary_raider_unitsInfo.push({
                        unit: spawnedUnit
                    });
                }
            } else if ("UnitConfig_legendary_worker" == mapdefens_spawnPlan[mapdefens_spawnWaveNum].units[i].cfgId) {
                for (var spawnedUnit of spawnedUnits) {
                    mapdefens_legendary_worker_unitsInfo.push({
                        unit: spawnedUnit,
                        towersBuild: 2 + mapdefens_playersCount
                    });
                }
            }
        }

        // переходим к следующему плану
        mapdefens_spawnWaveNum++;
    }

    //////////////////////////////////////////
    // обработка легендарных рыцарей
    //////////////////////////////////////////

    // регистрируем смерть легендарных рыцарей для клонирования
    for (var i = 0; i < mapdefens_legendary_swordmen_unitsInfo.length; i++) {
        // если рыцарь умер
        if (mapdefens_legendary_swordmen_unitsInfo[i].unit.IsDead) {
            // если существует конфиг для следующего уровня клонов, то спавним 2-ух клонов и увеличиваем уровень клонов на 1
            var cloneCfg = mapdefens_enemyUnitsCfg["UnitConfig_legendary_swordmen_" + mapdefens_legendary_swordmen_unitsInfo[i].cloneDepth];
            if (cloneCfg) {
                // создаем генератор по спирали вокруг умершего рыцаря
                var generator = generatePositionInSpiral(mapdefens_legendary_swordmen_unitsInfo[i].unit.Cell.X, mapdefens_legendary_swordmen_unitsInfo[i].unit.Cell.Y);
                // спавним 2-ух рыцарей
                var spawnedUnits = spawnUnits(mapdefens_enemySettlement,
                    cloneCfg,
                    2,
                    UnitDirection.Down,
                    generator);
                for (var spawnedUnit of spawnedUnits) {
                    mapdefens_legendary_swordmen_unitsInfo.push({
                        unit: spawnedUnit,
                        cloneDepth: (mapdefens_legendary_swordmen_unitsInfo[i].cloneDepth + 1)
                    });
                }
            }
            
            // удаляем из массива умершего рыцаря
            mapdefens_legendary_swordmen_unitsInfo.splice(i--, 1);
        }
    }

    //////////////////////////////////////////
    // обработка легендарных всадников
    //////////////////////////////////////////

    // регистрируем смерть легендарных всадников
    for (var i = 0; i < mapdefens_legendary_raider_unitsInfo.length; i++) {
        // если всадник умер, то исключаем его из списка
        if (mapdefens_legendary_raider_unitsInfo[i].unit.IsDead) {
            mapdefens_legendary_raider_unitsInfo.splice(i--, 1);
        }
    }
    // каждые 5 секунд спавним юнитов вокруг всадника
    if (gameTickNum % 300 == 0) {
        for (var i = 0; i < mapdefens_legendary_raider_unitsInfo.length; i++) {
            var raider = mapdefens_legendary_raider_unitsInfo[i].unit;
            var spawnUnitId;
            var randomNumber = rnd.RandomNumber(1, 4);
            if (randomNumber == 1) {
                spawnUnitId = "UnitConfig_Barbarian_Swordmen";
            } else if (randomNumber == 2) {
                spawnUnitId = "UnitConfig_Barbarian_Archer";
            } else if (randomNumber == 3) {
                spawnUnitId = "UnitConfig_Barbarian_Archer_2";
            } else {
                spawnUnitId = "UnitConfig_Barbarian_Heavymen";
            }

            var generator    = generatePositionInSpiral(raider.Cell.X, raider.Cell.Y);
            var spawnedUnits = spawnUnits(mapdefens_enemySettlement,
                mapdefens_enemyUnitsCfg[spawnUnitId],
                Math.min(mapdefens_playersCount, 3),
                UnitDirection.Down,
                generator);
        }
    }

    //////////////////////////////////////////
    // обработка легендарных инженеров
    //////////////////////////////////////////

    for (var i = 0; i < mapdefens_legendary_worker_unitsInfo.length; i++) {
        // если всадник умер, то исключаем его из списка
        if (mapdefens_legendary_worker_unitsInfo[i].unit.IsDead) {
            mapdefens_legendary_worker_unitsInfo.splice(i--, 1);
        }
    }

    //////////////////////////////////////////
    // логика поведения юнитов
    //////////////////////////////////////////

    // приказываем врагам атаковать из места спавна
    //if (gameTickNum % 180 == 0) {
    //    // выделяем юнитов в точке спавна
    //    inputSelectUnits(mapdefens_enemyPlayer,
    //        createPoint(mapdefens_enemySpawnRectangle.x, mapdefens_enemySpawnRectangle.y),
    //        createPoint(mapdefens_enemySpawnRectangle.x + mapdefens_enemySpawnRectangle.w, mapdefens_enemySpawnRectangle.y + mapdefens_enemySpawnRectangle.h));

    //    // отправляем их в бой в ближайшую пустую точку к замку
    //    var generator = generatePositionInSpiral(mapdefens_goalCastle.Cell.X, mapdefens_goalCastle.Cell.Y);
    //    for (var position = generator.next(); !position.done; position = generator.next()) {
    //        if (unitCanBePlacedByRealMap(mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Swordmen"], position.value.X, position.value.Y)) {
    //            inputPointBasedCommand(mapdefens_enemyPlayer, createPoint(position.value.X, position.value.Y), UnitCommand.Attack);
    //            break;
    //        }
    //    }
    //}

    // приказываем бездействующим юнитам врага атаковать
    if (gameTickNum % 180 == 0) {
        // позиция для атаки цели
        var goalPosition;
        {
            var generator = generatePositionInSpiral(mapdefens_goalCastle.Cell.X, mapdefens_goalCastle.Cell.Y);
            for (goalPosition = generator.next(); !goalPosition.done; goalPosition = generator.next()) {
                if (unitCanBePlacedByRealMap(mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Swordmen"], goalPosition.value.X, goalPosition.value.Y)) {
                    break;
                }
            }
        }

        //////////////////////////////////////////
        // логика поведения легендарных инженеров
        //////////////////////////////////////////
        
        for (var i = 0; i < mapdefens_legendary_worker_unitsInfo.length; i++) {
            var worker = mapdefens_legendary_worker_unitsInfo[i].unit;

            // юнит только что заспавнился и пока у него нету ид
            if (worker.Id == 0) {
                continue;
            }

            // отдел приказов
            var ordersMind   = worker.OrdersMind;

            // юнит бездействует и у него фулл хп, то отправляем его на базу врага
            if (ordersMind.IsIdle() && worker.Health == mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker"].MaxHealth) {
                // выделяем данного юнита
                //inputSelectUnitsById(mapdefens_enemyPlayer, [worker.Id]);

                // в конце отправляем в атаку на цель
                //inputPointBasedCommand(mapdefens_enemyPlayer, createPoint(goalPosition.value.X, goalPosition.value.Y), UnitCommand.MoveToPoint);
                var pointCommandArgs = new PointCommandArgs(createPoint(goalPosition.value.X, goalPosition.value.Y), UnitCommand.MoveToPoint, AssignOrderMode.Queue);
                worker.Cfg.GetOrderWorker(worker, pointCommandArgs);

                continue;
            }

            // проверка, что инженер что-то строит
            var currentOrderProducing = ordersMind.ActiveOrder.ProductUnit != undefined;

            // проверка, что юнит готов строить башню
            if (worker.Health == mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker"].MaxHealth ||
                currentOrderProducing) {
                continue;
            }

            // выделяем данного юнита
            //inputSelectUnitsById(mapdefens_enemyPlayer, [worker.Id]);

            // Отменить все приказы юнита
            ordersMind.CancelOrders(true);

            // ищем ближайшее место куда можно построить башню
            var generator = generatePositionInSpiral(worker.Cell.X, worker.Cell.Y);
            for (var position = generator.next(); !position.done; position = generator.next()) {
                if (unitCanBePlacedByRealMap(mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"], position.value.X, position.value.Y)) {
                    //inputProduceBuildingCommand(mapdefens_enemyPlayer, mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"].Uid, createPoint(position.value.X, position.value.Y), null);

                    // делаем так, чтобы инженер не отвлекался, когда строит башню (убираем реакцию на инстинкты)
                    ordersMind.AssignSmartOrder(worker.Cell, AssignOrderMode.Replace, 100000);

                    var produceAtCommandArgs = new ProduceAtCommandArgs(AssignOrderMode.Queue, mapdefens_enemyUnitsCfg["UnitConfig_legendary_worker_Tower"], createPoint(position.value.X, position.value.Y));
                    worker.Cfg.GetOrderWorker(worker, produceAtCommandArgs);

                    // уменьшаем количество создаваемых башен на 1
                    mapdefens_legendary_worker_unitsInfo[i].towersBuild--;
                    // если инженер достиг лимита воздвигаемых башен, то удаляем его из списка
                    if (mapdefens_legendary_worker_unitsInfo[i].towersBuild == 0) {
                        mapdefens_legendary_worker_unitsInfo.splice(i--, 1);
                    }
                    break;
                }
            }
        }

        //////////////////////////////////////////
        // логика поведения легендарных всадников
        //////////////////////////////////////////
        
        for (var i = 0; i < mapdefens_legendary_raider_unitsInfo.length; i++) {
            var raider = mapdefens_legendary_raider_unitsInfo[i].unit;
            // отдел приказов
            var ordersMind   = raider.OrdersMind;

            // или юнит только что заспавнился и пока у него нету ид
            if (raider.Id == 0 || ordersMind.OrdersCount > 5) {
                continue;
            }

            // выделяем данного юнита
            //inputSelectUnitsById(mapdefens_enemyPlayer, [raider.Id]);

            // генерируем 5 рандомных достижимых точек вокруг цели
            var generator = generateRandomPositionInRect2D(mapdefens_goalCastle.Cell.X - 20, mapdefens_goalCastle.Cell.Y - 20, 40, 40);
            for (var position = generator.next(); !position.done; position = generator.next()) {
                if (unitCheckPathTo(raider, createPoint(position.value.X, position.value.Y))) {
                    //inputPointBasedCommand(mapdefens_enemyPlayer, createPoint(position.value.X, position.value.Y), UnitCommand.MoveToPoint, AssignOrderMode.Queue);
                    //var pointCommandArgs = new PointCommandArgs(createPoint(position.value.X, position.value.Y), UnitCommand.MoveToPoint, AssignOrderMode.Queue);
                    //raider.Cfg.GetOrderWorker(raider, pointCommandArgs);

                    ordersMind.AssignSmartOrder(createPoint(position.value.X, position.value.Y), AssignOrderMode.Queue, 100000);

                    break;
                }
            }
        }

        //////////////////////////////////////////
        // логика поведения почти всех юнитов
        //////////////////////////////////////////

        var enemyUnitsEnumerator = mapdefens_enemySettlement.Units.GetEnumerator();
        var centerRect = { x: 72, y: 78, w: 110 - 72, h: 83 - 78 };

        var generator  = generateRandomPositionInRect2D(centerRect.x, centerRect.y, centerRect.w, centerRect.h);
        while (enemyUnitsEnumerator.MoveNext()) {
            var unit         = enemyUnitsEnumerator.Current;
            // отдел приказов
            var ordersMind   = unit.OrdersMind;
            
            // Проверка что юнит бездействует
            // или юнит только что заспавнился и пока у него нету ид
            if (!ordersMind.IsIdle() || unit.Id == 0) {
                continue;
            }

            // выделяем данного юнита
            //inputSelectUnitsById(mapdefens_enemyPlayer, [unit.Id]);
            
            // если Y < 80, то оправляем сначала в центр
            if (unit.Cell.Y < 80) {
                var positionFound = false;
                var position;
                while (!positionFound) {
                    for (position = generator.next(); !position.done; position = generator.next()) {
                        if (unitCanBePlacedByRealMap(mapdefens_enemyUnitsCfg["UnitConfig_Barbarian_Swordmen"], position.value.X, position.value.Y)) {
                            positionFound = true;
                            break;
                        }
                    }
                    // генератор закончился, делаем новый
                    if (!positionFound) {
                        generator = generateRandomPositionInRect2D(centerRect.x, centerRect.y, centerRect.w, centerRect.h);
                    }
                }
                //inputPointBasedCommand(mapdefens_enemyPlayer, createPoint(position.value.X, position.value.Y), UnitCommand.Attack);
                var pointCommandArgs = new PointCommandArgs(createPoint(position.value.X, position.value.Y), UnitCommand.Attack, AssignOrderMode.Queue);
                unit.Cfg.GetOrderWorker(unit, pointCommandArgs);

                // вызывает рассинхрон
                // 20% юнитов идут в обход
                // var randomNumber = rnd.RandomNumber(1, 100);
                // if (randomNumber <= 10) {
                //     var position2 = { X: goalPosition.value.X - 30, Y: Math.floor((goalPosition.value.Y + position.value.Y) * 0.5) };
                //     inputPointBasedCommand(mapdefens_enemyPlayer, createPoint(position2.X, position2.Y), UnitCommand.Attack, AssignOrderMode.Queue);
                //     if (randomNumber <= 5) {
                //         var position3 = { X: goalPosition.value.X - 30, Y: goalPosition.value.Y };
                //         inputPointBasedCommand(mapdefens_enemyPlayer, createPoint(position3.X, position3.Y), UnitCommand.Attack, AssignOrderMode.Queue);
                //     }
                // } else if (randomNumber <= 20) {
                //     var position2 = { X: goalPosition.value.X + 30, Y: Math.floor((goalPosition.value.Y + position.value.Y) * 0.5) };
                //     inputPointBasedCommand(mapdefens_enemyPlayer, createPoint(position2.X, position2.Y), UnitCommand.Attack, AssignOrderMode.Queue);
                //     if (randomNumber <= 15) {
                //         var position3 = { X: goalPosition.value.X + 30, Y: goalPosition.value.Y };
                //         inputPointBasedCommand(mapdefens_enemyPlayer, createPoint(position3.X, position3.Y), UnitCommand.Attack, AssignOrderMode.Queue);
                //     }
                // }
            }
            
            // в конце отправляем в атаку на цель
            //inputPointBasedCommand(mapdefens_enemyPlayer, createPoint(goalPosition.value.X, goalPosition.value.Y), UnitCommand.Attack, AssignOrderMode.Queue);
            var pointCommandArgs = new PointCommandArgs(createPoint(goalPosition.value.X, goalPosition.value.Y), UnitCommand.Attack, AssignOrderMode.Queue);
            unit.Cfg.GetOrderWorker(unit, pointCommandArgs);
        }
        enemyUnitsEnumerator.Dispose();
    }
}

function randomItem (array) {
    var rnd = scena.GetRealScena().Context.Randomizer;
    return array[rnd.RandomNumber(0, array.length - 1)];
};

function initWavePlan_1() {
    broadcastMessage("волны пойдут по плану 1 (1 минута до первой волны)", createHordeColor(255, 255, 50, 10));

    mapdefens_spawnPlan = [];
    mapdefens_spawnPlan.push({
        message: "ВОЛНА 1",
        gameTickNum: 1 * 60 * 50,
        units: [
            { count: 5 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 2 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Archer" }
        ]
    }, {
        message: "ВОЛНА 2",
        gameTickNum: 3 * 60 * 50,
        units: [
            { count: 10 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 4 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Archer" }
        ]
    }, {
        message: "ВОЛНА 3",
        gameTickNum: 5 * 60 * 50,
        units: [
            { count: 10 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 3 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Heavymen" },
            { count: 4 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Archer" }
        ]
    }, {
        message: "ВОЛНА 4",
        gameTickNum: 8 * 60 * 50,
        units: [
            { count: 15 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 5 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Heavymen" },
            { count: 3 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Archer" },
            { count: 2 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Archer_2" }
        ]
    }, {
        message: "БОСС ВОЛНА 5",
        gameTickNum: 10 * 60 * 50,
        units: [
            { count: 1,                          cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: 5 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Raider" }
        ]
    }, {
        message: "ВОЛНА 6",
        gameTickNum: 13.5 * 60 * 50,
        units: [
            { count: 20 * mapdefens_playersCount, cfgId: randomItem(["UnitConfig_Barbarian_Swordmen", "UnitConfig_Barbarian_Heavymen", "UnitConfig_Barbarian_Archer", "UnitConfig_Barbarian_Archer_2" ]) }
        ]
    }, {
        message: "ВОЛНА 7",
        gameTickNum: 15 * 60 * 50,
        units: [
            { count: 10 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 10 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Heavymen" },
            { count: 4 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Archer" },
            { count: 6 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Archer_2" }
        ]
    }, {
        gameTickNum: 15.3 * 60 * 50,
        units: [
            { count: 5 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Raider" }
        ]
    }, {
        message: "ВОЛНА 8",
        gameTickNum: 18 * 60 * 50,
        units: [
            { count: 25 * mapdefens_playersCount, cfgId: randomItem(["UnitConfig_Barbarian_Swordmen", "UnitConfig_Barbarian_Heavymen", "UnitConfig_Barbarian_Archer", "UnitConfig_Barbarian_Archer_2" ]) }
        ]
    }, {
        gameTickNum: 18.3 * 60 * 50,
        units: [
            { count: 5 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Raider" }
        ]
    }, {
        message: "БОСС ВОЛНА 9",
        gameTickNum: 20 * 60 * 50,
        units: [
            { count: 10 * mapdefens_playersCount, cfgId: "UnitConfig_Slavyane_Catapult" },
            { count: 10 * mapdefens_playersCount, cfgId: "UnitConfig_Slavyane_Balista" }
        ]
    }, {
        message: "ВОЛНА 10",
        gameTickNum: 23 * 60 * 50,
        units: [
            { count: 15 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 15 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Heavymen" },
            { count: 5 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Archer" },
            { count: 8 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Archer_2" },
            { count: 2 * mapdefens_playersCount,  cfgId: "UnitConfig_Slavyane_Catapult" },
            { count: 2 * mapdefens_playersCount,  cfgId: "UnitConfig_Slavyane_Balista" }
        ]
    }, {
        gameTickNum: 23.3 * 60 * 50,
        units: [
            { count: 6 * mapdefens_playersCount,          cfgId: "UnitConfig_Barbarian_Raider" },
            { count: 1,                                   cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 3 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 5 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) }
        ]
    }, {
        message: "ВОЛНА 11",
        gameTickNum: 26 * 60 * 50,
        units: [
            { count: 20 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 16 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Heavymen" },
            { count: 8 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Archer" },
            { count: 10 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Archer_2" },
            { count: 3 * mapdefens_playersCount,  cfgId: "UnitConfig_Slavyane_Catapult" },
            { count: 3 * mapdefens_playersCount,  cfgId: "UnitConfig_Slavyane_Balista" }
        ]
    }, {
        gameTickNum: 26.3 * 60 * 50,
        units: [
            { count: 10 * mapdefens_playersCount,         cfgId: "UnitConfig_Barbarian_Raider" },
            { count: 1,                                   cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 3 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 5 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) }
        ]
    }, {
        message: "БОСС ВОЛНА 12",
        gameTickNum: 30 * 60 * 50,
        units: [
            { count: 3 * mapdefens_playersCount,          cfgId: "UnitConfig_Mage_Mag_2" },
            { count: 1 * mapdefens_playersCount,          cfgId: "UnitConfig_Mage_Villur" },
            { count: 1 * mapdefens_playersCount,          cfgId: "UnitConfig_Mage_Olga" },
            { count: 1,                                   cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: 1,                                   cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 3 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 5 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) }
        ]
    }, {
        message: "ВОЛНА 13",
        gameTickNum: 32 * 60 * 50,
        units: [
            { count: 20 * mapdefens_playersCount,         cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 20 * mapdefens_playersCount,         cfgId: "UnitConfig_Barbarian_Heavymen" },
            { count: 10 * mapdefens_playersCount,         cfgId: "UnitConfig_Barbarian_Archer" },
            { count: 10 * mapdefens_playersCount,         cfgId: "UnitConfig_Barbarian_Archer_2" },
            { count: 3 * mapdefens_playersCount,          cfgId: "UnitConfig_Slavyane_Catapult" },
            { count: 3 * mapdefens_playersCount,          cfgId: "UnitConfig_Slavyane_Balista" },
            { count: 3 * mapdefens_playersCount,          cfgId: "UnitConfig_Mage_Mag_2" },
            { count: 1,                                   cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 3 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 5 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) }
        ]
    }, {
        message: "ВОЛНА 14",
        gameTickNum: 34 * 60 * 50,
        units: [
            { count: 25 * mapdefens_playersCount,         cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 25 * mapdefens_playersCount,         cfgId: "UnitConfig_Barbarian_Heavymen" },
            { count: 12 * mapdefens_playersCount,         cfgId: "UnitConfig_Barbarian_Archer" },
            { count: 12 * mapdefens_playersCount,         cfgId: "UnitConfig_Barbarian_Archer_2" },
            { count: 3 * mapdefens_playersCount,          cfgId: "UnitConfig_Slavyane_Catapult" },
            { count: 3 * mapdefens_playersCount,          cfgId: "UnitConfig_Slavyane_Balista" },
            { count: 1 * mapdefens_playersCount,          cfgId: "UnitConfig_Mage_Mag_2" },
            { count: 1 * mapdefens_playersCount,          cfgId: "UnitConfig_Mage_Villur" },
            { count: 1 * mapdefens_playersCount,          cfgId: "UnitConfig_Mage_Olga" },
            { count: 1,                                   cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 3 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) },
            { count: mapdefens_playersCount >= 5 ? 1 : 0, cfgId: randomItem(mapdefens_legendaryUnitsCFGId) }
        ]
    }, {
        message: "ФИНАЛЬНАЯ ВОЛНА 15",
        gameTickNum: 36 * 60 * 50,
        units: [
            { count: 100 * mapdefens_playersCount, cfgId: "UnitConfig_Barbarian_Swordmen" },
            { count: 30 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Heavymen" },
            { count: 10 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Archer" },
            { count: 20 * mapdefens_playersCount,  cfgId: "UnitConfig_Barbarian_Archer_2" },
            { count: 6 * mapdefens_playersCount,   cfgId: "UnitConfig_Slavyane_Catapult" },
            { count: 6 * mapdefens_playersCount,   cfgId: "UnitConfig_Slavyane_Balista" },
            { count: 1 * mapdefens_playersCount,   cfgId: "UnitConfig_Mage_Mag_2" },
            { count: 1 * mapdefens_playersCount,   cfgId: "UnitConfig_Mage_Villur" },
            { count: 1 * mapdefens_playersCount,   cfgId: "UnitConfig_Mage_Olga" },
            { count: 1,                            cfgId: "UnitConfig_legendary_swordmen" },
            { count: 1,                            cfgId: "UnitConfig_legendary_heavymen" },
            { count: 1,                            cfgId: "UnitConfig_legendary_archer" },
            { count: 1,                            cfgId: "UnitConfig_legendary_archer_2" },
            { count: 1,                            cfgId: "UnitConfig_legendary_Raider" },
            { count: 1,                            cfgId: "UnitConfig_legendary_worker" }
        ]
    }
    );
}

function initWavePlan_2() {
    broadcastMessage("волны пойдут по плану 2 (5 минут до первой волны)", createHordeColor(255, 255, 50, 10));
    
    mapdefens_spawnPlan = [];
    var gameStartTick;

    gameStartTick = 3 * 60 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 30 * 50) {
        var spawnCount = Math.round(mapdefens_playersCount * 12 * (mapdefens_timeEnd - gameTick) / (mapdefens_timeEnd - gameStartTick));
        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Barbarian_Swordmen"
            }]
        });
    }

    gameStartTick = 7 * 60 * 50 + 10 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 30 * 50) {
        var spawnCount = Math.round(mapdefens_playersCount * (2 + 6 * (mapdefens_timeEnd - gameTick) / (mapdefens_timeEnd - gameStartTick)));
        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Barbarian_Archer"
            }]
        });
    }

    gameStartTick = 10 * 60 * 50 + 20 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 30 * 50) {
        var spawnCount = Math.round(mapdefens_playersCount * (3 + 10 * (gameTick - gameStartTick) / (mapdefens_timeEnd - gameStartTick)));
        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Barbarian_Heavymen"
            }]
        });
    }

    gameStartTick = 14 * 60 * 50 + 55 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 30 * 50) {
        var spawnCount = Math.round(mapdefens_playersCount * (2 + 5 * (gameTick - gameStartTick) / (mapdefens_timeEnd - gameStartTick)));
        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Barbarian_Archer_2"
            }]
        });
    }

    gameStartTick = 16 * 60 * 50 + 20 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 45 * 50) {
        var spawnCount = mapdefens_playersCount;
        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Barbarian_Raider"
            }]
        });
    }

    gameStartTick = 18 * 60 * 50 + 35 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 45 * 50) {
        var spawnCount = Math.round(mapdefens_playersCount * (1 + 1 * (mapdefens_timeEnd - gameStartTick) / (mapdefens_timeEnd - gameStartTick)));
        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Slavyane_Catapult"
            }]
        });
    }

    gameStartTick = 19 * 60 * 50 + 5 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 45 * 50) {
        var spawnCount = Math.round(mapdefens_playersCount * (1 + 1 * (mapdefens_timeEnd - gameStartTick) / (mapdefens_timeEnd - gameStartTick)));
        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Slavyane_Balista"
            }]
        });
    }

    gameStartTick = 25 * 60 * 50 + 15 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 50 * 50) {
        var spawnCount = 1;
        if (mapdefens_playersCount >= 5) {
            spawnCount = 3;
        } else if (mapdefens_playersCount >= 3) {
            spawnCount = 2;
        }

        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Mage_Mag_2"
            }]
        });
    }

    gameStartTick = 30 * 60 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 60 * 50) {
        var spawnCount = 0;
        if (mapdefens_playersCount >= 3) {
            spawnCount = 1;
        }
        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Mage_Villur"
            }]
        });
    }

    gameStartTick = 35 * 60 * 50 + 30 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 120 * 50) {
        var spawnCount = 1;
        if (mapdefens_playersCount >= 4) {
            spawnCount = 2;
        }
        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: [{
                count: spawnCount, cfgId: "UnitConfig_Mage_Olga"
            }]
        });
    }

    gameStartTick = 14 * 60 * 50;
    for (var gameTick = gameStartTick; gameTick < mapdefens_timeEnd; gameTick += 150 * 50) {
        var spawnCount = 1;
        if (mapdefens_playersCount >= 5) {
            spawnCount = 3;
        } else if (mapdefens_playersCount >= 3) {
            spawnCount = 2;
        }

        mapdefens_spawnPlan.push({
            gameTickNum: gameTick,
            units: []
        });
        for (var i = 0; i < spawnCount; i++) {
            mapdefens_spawnPlan[mapdefens_spawnPlan.length - 1].units.push({count: 1, cfgId: randomItem(mapdefens_legendaryUnitsCFGId)});
        }
    }

    // сортируем в порядке тиков
    mapdefens_spawnPlan.sort((a, b) => a.gameTickNum > b.gameTickNum ? 1 : -1);
}

} // namespace