import HordeExampleBase from "./base-example";
import { BulletState, ShotParams, UnitMapLayer, TilePayload, BaseBullet, BulletEmittingArgs, BulletConfig, SoundsCatalog, VisualEffectConfig } from "library/game-logic/horde-types"
import { createPF, createPoint } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { spawnDecoration, spawnSound } from "library/game-logic/decoration-spawn";
import { setBulletInitializeWorker, setBulletProcessWorker } from "library/game-logic/workers-tools";
import { positionToCell } from "library/common/position-tools";


const WAVES_MAX = 5;


/**
 * Пример создания снаряда с кастомным обработчиком.
 * 
 * Для снарядов используется два обработчика:
 * - Иницилизатор - создаёт объект снаряда.
 * - EveryTick-обработчик - обрабатывает снаряд каждый такт.
 */
export class Example_CustomBullet extends HordeExampleBase {
    private smokeDecorationCfg: VisualEffectConfig;
    private hitSoundCatalog: SoundsCatalog;
    private customBullCfg: BulletConfig;
    private shotParams: ShotParams;
    private waveNum: number = 0;

    public constructor() {
        super("Custom bullet");
        this.smokeDecorationCfg = HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_ArrowSmoke");
        this.hitSoundCatalog = HordeContentApi.GetSoundsCatalog("#SoundsCatalog_Hits_Mele_Axe");
    }

    /**
     * Здесь выполняется создание кастомного снаряда и установка его обработчиков.
     */
    public onFirstRun() {
        this.logMessageOnRun();

        // Создаём конфиг снаряда
        this.customBullCfg = createBulletConfig();
        this.log.info('Конфиг снаряда для теста:', this.customBullCfg);

        // Установка функций-обработчиков для созданного снаряда
        setBulletInitializeWorker(this, this.customBullCfg, this.initializeWorker);
        setBulletProcessWorker(this, this.customBullCfg, this.processWorker);

        // Создаём характеристики выстрела
        this.shotParams = createShotParams();
    }

    /**
     * Демонстрация. Запуск снаряда каждые 50 тактов
     */
    public onEveryTick(gameTickNum: number) {
        if (this.waveNum >= WAVES_MAX || gameTickNum % 50 != 0)
            return;

        this.createBullet();
        this.waveNum++;
    }

    /**
     * Запускает созданный снаряд.
     */
    private createBullet() {

        // Любой юнит, от имени которого будет отправлена стрела
        let realScena = ActiveScena.GetRealScena();
        let settlement_0 = realScena.Settlements.Item.get('0');  // Олег
        let someUnit = settlement_0.Units.GetCastleOrAnyUnit();

        // Создание снаряда
        let bull = spawnBullet(someUnit, null, null, this.customBullCfg, this.shotParams, createPoint(250, 250), createPoint(500, 300), UnitMapLayer.Main);
        if (!bull) {
            this.log.warning(`Ошибка! Не удалось создать снаряд.`);
            return;
        }
        this.log.info(`Создан снаряд: ${bull}`);
    }

    /**
     * Функция-обработчик для инициализации объекта скриптового снаряда.
     */
    private initializeWorker(bull: BaseBullet, emitArgs: BulletEmittingArgs) {

        // Настройка анимации по данным из конфига
        bull.SetupAnimation();

        // Звук выстрела (берет из каталога заданного в конфиге снаряда)
        bull.UtterSound("Shot", bull.Position);

        // Скриптовые данные снаряда (тут так же можно поместить объект со множеством произвольных данных)
        bull.ScriptData.ExampleCustomCounter = 0;
    }

    /**
     * Функция-обработчик скриптового снаряда. Вызывается каждый такт.
     */
    private processWorker(bull: BaseBullet) {
        // Смена анимации
        bull.UpdateAnimation();

        // Кастомная обработка
        bull.ScriptData.ExampleCustomCounter++;
        bull.DistanceDecrease();
        bull.ProcessBallistic();

        // Создание графических эффектов
        if (bull.ScriptData.ExampleCustomCounter % 2 == 0) {
            let pos = createPoint(bull.Position.X, bull.Position.Y - Math.trunc(bull.Z));
            spawnDecoration(bull.Scena, this.smokeDecorationCfg, pos);
        }

        // Создание звуковых эффектов
        // Это пример запуска звуков, которые не прописаны в конфиге снаряда
        if (bull.ScriptData.ExampleCustomCounter % 5 == 0) {
            let pos = createPoint(bull.Position.X, bull.Position.Y - Math.trunc(bull.Z));
            spawnSound(bull.Scena, this.hitSoundCatalog, "HitMetal", pos, false);
        }

        // Обработка достижения цели или завершения lifetime (для примера)
        if (bull.ScriptData.ExampleCustomCounter >= 1000 || bull.IsTargetReached) {
            // Любое состояние кроме Flying ведет к удалению объекта
            ScriptUtils.SetValue(bull, "State", BulletState.ReachedTheGoal);

            // Снаряд успел долететь?
            if (bull.IsTargetReached) {
                bull.DamageArea(2);  // тут задаётся радиус, а урон был задан в ShotParams
                bull.UtterSound("Hit", bull.Position);

                // Примечание: Для нанесения урона по единственной клетке можно использовать метод "bull.DamageCell(bool magicDamage)".

                // Изменение тайлов земли при взрыве
                let explodeCenterCell = positionToCell(bull.Position);
                if (bull.Scena.PointInScena(explodeCenterCell)) {
                    bull.Scena.LandscapeMap.ChangeCellPayload(explodeCenterCell, TilePayload.Exploded);
                }
            }
        }
    }
}

/**
 * Создаёт конфиг снаряда.
 */
function createBulletConfig() {
    const exampleCfgUid = "#BulletConfig_ExampleScriptBullet";
    let customBullCfg: BulletConfig;
    if (HordeContentApi.HasBulletConfig(exampleCfgUid)) {
        // Конфиг уже был создан, берем предыдущий
        customBullCfg = HordeContentApi.GetBulletConfig(exampleCfgUid);
    } else {
        // Создание нового конфига
        const bullCfgTemplate = HordeContentApi.GetBulletConfig("#BulletConfig_ScriptBullet_Template");
        customBullCfg = HordeContentApi.CloneConfig(bullCfgTemplate, "#BulletConfig_ExampleScriptBullet") as BulletConfig;
    }

    // Установка параметров конфига
    ScriptUtils.SetValue(customBullCfg, "BaseBulletSpeed", createPF(8, 0));
    ScriptUtils.SetValue(customBullCfg, "IsBallistic", true);

    return customBullCfg;
}

/**
 * Создаёт характеристики выстрела.
 */
function createShotParams() {
    let shotParams = ShotParams.CreateInstance();
    ScriptUtils.SetValue(shotParams, "Damage", 4);
    ScriptUtils.SetValue(shotParams, "AdditiveBulletSpeed", createPF(0, 0));

    return shotParams;
}
