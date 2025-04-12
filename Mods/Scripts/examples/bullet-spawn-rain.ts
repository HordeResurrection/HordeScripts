import { broadcastMessage } from "library/common/messages";
import { createPF, createPoint, createHordeColor } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { BulletConfig, ShotParams, Unit, UnitMapLayer } from "library/game-logic/horde-types";
import HordeExampleBase from "./base-example";


const WAVES_MAX = 20;
const WAVES_PERIOD = 10;

/**
 * Пример создания большого количества снарядов
 */
export class Example_SpawnBulletsRain extends HordeExampleBase {
    private rnd: any;
    private waveNum: number = 0;

    private someUnit: Unit | undefined;
    private arrowCfg: BulletConfig;
    private arrowShotParams: ShotParams;
    private bombCfg: BulletConfig;
    private bombShotParams: ShotParams;

    public constructor() {
        super("Spawn bullets rain");

        // Игровой рандомизатор
        this.rnd = ActiveScena.Context.Randomizer;

        // Конфиги снарядов
        this.arrowCfg = HordeContentApi.GetBulletConfig("#BulletConfig_Arrow");
        this.bombCfg = HordeContentApi.GetBulletConfig("#BulletConfig_CatapultBomb");

        // Характеристики выстрела стрелы
        this.arrowShotParams = ShotParams.CreateInstance();
        ScriptUtils.SetValue(this.arrowShotParams, "Damage", 4);
        ScriptUtils.SetValue(this.arrowShotParams, "AdditiveBulletSpeed", createPF(0, 0));

        // Характеристики выстрела бомбы
        this.bombShotParams = ShotParams.CreateInstance();
        ScriptUtils.SetValue(this.bombShotParams, "Damage", 12);
        ScriptUtils.SetValue(this.bombShotParams, "AdditiveBulletSpeed", createPF(0, 0));
    }

    /**
     * Инициализация переменных
     */
    public onFirstRun() {
        this.logMessageOnRun();

        let settlement_0 = ActiveScena.Settlements.Item.get('0');  // Олег

        // Выбираем любой юнит, от имени которого будет отправлена стрела
        this.someUnit = settlement_0.Units.GetCastleOrAnyUnit();

        // А теперь развлекаемся!
        broadcastMessage("Внимание! По прогнозу дождь из стрел, местами град! O_O", createHordeColor(255, 255, 50, 10));

        // Снаряды полетят в методе EveryTick
    }

    /**
     * Постепенный запуск дождя из снарядов.
     */
    public onEveryTick(gameTickNum: number) {
        if (gameTickNum % WAVES_PERIOD != 0 || this.waveNum >= WAVES_MAX) {
            return;
        }

        let n = this.spawnBulletsRain();
        this.waveNum++;

        this.log.info(`Волна ${this.waveNum}. Создано ${n} снаряда(ов)`);
    }

    /**
     * Заспаунить волну из снарядов
     */
    private spawnBulletsRain() {
        if (!this.someUnit) {
            return;
        }

        let n = 0;
        for (let i = 0; i < 20; i++) {
            this.createBullRnd(this.someUnit, this.arrowCfg, this.arrowShotParams);
            n++;
        }
        for (let i = 0; i < 2; i++) {
            this.createBullRnd(this.someUnit, this.bombCfg, this.bombShotParams);
            n++;
        }
        return n;
    }

    /**
     * Функция для создания снаряда со случайным полетом
     */
    private createBullRnd(someUnit: Unit, bulletCfg: BulletConfig, shotParams: ShotParams) {
        // Старт снаряда генерируем наверху карты
        let start = createPoint(this.rnd.RandomNumber(0, 32 * 48), this.rnd.RandomNumber(0, 32));

        // Цель снаряда в квадрате (16; 16) - (32; 32)
        let finish = createPoint(this.rnd.RandomNumber(32 * 16, 32 * 32), this.rnd.RandomNumber(32 * 16, 32 * 32));

        // Создание снаряда
        let bull = spawnBullet(
            someUnit,  // Игра будет считать, что именно этот юнит запустил снаряд
            null,
            null,
            bulletCfg,
            shotParams,
            start,
            finish,
            UnitMapLayer.Main
        );
        return bull;
    }
}
