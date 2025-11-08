import { Point2D } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { UnitState, StateMotion, UnitAnimState, AnimatorScriptTasks, WorldConstants, SoundsCatalog, Unit, MotionHit } from "library/game-logic/horde-types";
import { setUnitStateWorker } from "library/game-logic/workers";
import HordePluginBase from "plugins/base-plugin";


/**
 * Плагин для обработки юнита "Воин с дубиной".
 */
export class BeammanPlugin extends HordePluginBase {
    private hitTable: HitTable;
    private hitSounds: SoundsCatalog;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Воин с дубиной");

        this.hitTable = createHitTable();
        this.hitSounds = HordeContentApi.GetSoundsCatalog("#SoundsCatalog_Hits_Mele_Dubina_02eb130f59b6");
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        // Установка обработчика удара
        let unitCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Beamman");

        let pluginWrappedWorker = (u: Unit) => this.stateWorker_Hit(u);
        setUnitStateWorker("Beamman", unitCfg, UnitState.Hit, pluginWrappedWorker);
    }

    /**
     * Обработчик состояния Hit для воина с дубиной
     */
    private stateWorker_Hit(u: Unit) {
        let motion = u.OrdersMind.ActiveMotion;
        if (!host.isType(MotionHit, motion)) {
            return;
        }
        let motionHit = motion as MotionHit;

        if (motionHit.IsUnprepared) {
            motionHit.State = StateMotion.InProgress;

            const stage = 0;
            const looped = false;
            u.VisualMind.SetAnimState(UnitAnimState.Attack, stage, looped);
        }

        // Произвести удар в момент, который задан анимацией (обычно, когда оружие достигает цели)
        if (u.VisualMind.Animator.HasTask(AnimatorScriptTasks.Hit)) {
            // Дубина бьёт три раза, начиная с 4-го кадра (задано в "beamman.ginf")

            // Вычисляем номер текущего удара
            let hitNum = (u.VisualMind.Animator.CurrentAnimFrame - 4);

            // Удар
            this.makeOneHit(u, motionHit, hitNum);

            // Звуки боя на первый удар
            if (hitNum == 0) {
                u.SoundsMind.UtterSound(this.hitSounds, "Hit", u.PositionInt);
            }

            // Устанавливаем время перезарядки
            u.ReloadCounter = u.Cfg.ReloadTime;

            // Отмечаем, что удар был произведен
            u.VisualMind.Animator.CompleteTask(AnimatorScriptTasks.Hit);
        }

        // Движение удара считается завершенным только на последнем кадре анимации
        if (u.VisualMind.Animator.IsAnimationCompleted) {
            motionHit.State = StateMotion.Done;

            u.VisualMind.SetAnimState(UnitAnimState.Stand);
        }
        else {
            motionHit.State = StateMotion.InProgress;
        }
    }


    /**
     * Выполняет один удар.
     */
    private makeOneHit(u: Unit, motion: MotionHit, hitNum: number) {
        // Смещения координат удара относительно центра воина в зависимости от направления
        let hits = this.hitTable[u.Direction.ToString()];
        if (!hits) {
            return;
        }

        // Смещение текущего удара
        let hitBias = hits[hitNum];
        if (!hitBias) {
            return;
        }

        // Координаты текущего удара
        let targetPosition = new Point2D(
            hitBias.X + u.PositionInt.X,
            hitBias.Y + u.PositionInt.Y
        );

        // Дружественным воинам урон не наносим
        let unitInCell = u.Scena.UnitsMap.GetUpperUnit(Math.floor(targetPosition.X / WorldConstants.CellSize),
            Math.floor(targetPosition.Y / WorldConstants.CellSize));
        if (unitInCell != null && unitInCell.Owner.Diplomacy.IsAllianceStatus(u.Owner)) {
            // Исключение - здания и те, кого юнит атакует умышленно
            if (!unitInCell.Cfg.IsBuilding && unitInCell != motion.Target) {
                return;
            }
        }

        // Создание снаряда
        let armament = u.BattleMind.SelectedArmament;
        spawnBullet(u, motion.Target, armament, armament.BulletConfig, armament.ShotParams, targetPosition, targetPosition, motion.TargetMapLayer);

        // В большинстве случаев для создания снаряда удобно использовать метод "Shot",
        // но он не позволяет задать SourcePosition, который необходим здесь для удара дубины
        //u.BattleMind.SelectedArmament.Shot(u, motion.Target, targetPosition, motion.TargetMapLayer);
    }
}


/**
 * Таблица смещений удара относительно центра воина по направлениям.
 */
function createHitTable(): HitTable {
    return {
        "Up": [
            new Point2D(25, -25),
            new Point2D(0, -25),
            new Point2D(-25, -25),
        ],
        "RightUp": [
            new Point2D(25, -3),
            new Point2D(25, -25),
            new Point2D(0, -25),
        ],
        "Right": [
            new Point2D(25, 25),
            new Point2D(25, -3),
            new Point2D(25, -25),
        ],
        "RightDown": [
            new Point2D(0, 20),
            new Point2D(25, 25),
            new Point2D(25, -3),
        ],
        "Down": [
            new Point2D(-25, 25),
            new Point2D(0, 20),
            new Point2D(25, 25),
        ],
        "LeftDown": [
            new Point2D(-25, 3),
            new Point2D(-25, 25),
            new Point2D(0, 20),
        ],
        "Left": [
            new Point2D(-25, -25),
            new Point2D(-25, 3),
            new Point2D(-25, 25),
        ],
        "LeftUp": [
            new Point2D(0, -25),
            new Point2D(-25, -25),
            new Point2D(-25, 3),
        ],
    };
}
interface HitTable {
    [key: string]: Point2D[];
}
