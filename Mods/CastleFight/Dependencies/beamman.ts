import { createPoint } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { UnitState, StateMotion, UnitAnimState, AnimatorScriptTasks, WorldGlobals } from "library/game-logic/horde-types";
import { setUnitStateWorker } from "library/game-logic/workers-tools";
import HordePluginBase from "plugins/base-plugin";


/**
 * Плагин для обработки юнита "Воин с дубиной".
 */
export class BeammanPlugin extends HordePluginBase {
    private hitTable;
    private hitSounds: any;

    /**
     * Конструктор.
     */
    public constructor() {
        super("Воин с дубиной");
    }

    /**
     * Метод вызывается при загрузке сцены и после hot-reload.
     */
    public onFirstRun() {
        this.hitTable = createHitTable();
        this.hitSounds = HordeContentApi.GetSoundsCatalog("#SoundsCatalog_Hits_Mele_Dubina_02eb130f59b6");
        
        // Установка обработчика удара
        let unitCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Beamman");
        setUnitStateWorker(this, unitCfg, UnitState.Hit, this.stateWorker_Hit);
    }

    /**
     * Обработчик состояния Hit для воина с дубиной
     */
    private stateWorker_Hit(u) {
        let motion = u.OrdersMind.ActiveMotion;  // Здесь MotionHit
        if (motion.IsUnprepared)
        {
            motion.State = StateMotion.InProgress;

            const stage = 0;
            const looped = false;
            u.VisualMind.SetAnimState(UnitAnimState.Attack, stage, looped);
        }

        // Произвести удар в момент, который задан анимацией (обычно, когда оружие достигает цели)
        if (u.VisualMind.Animator.HasTask(AnimatorScriptTasks.Hit))
        {
            // Дубина бьёт три раза, начиная с 4-го кадра (задано в "beamman.ginf")

            // Вычисляем номер текущего удара
            let hitNum = (u.VisualMind.Animator.CurrentAnimFrame - 4);

            // Удар
            this.makeOneHit(u, motion, hitNum);

            // Звуки боя на первый удар
            if (hitNum == 0) {
                u.SoundsMind.UtterSound(this.hitSounds, "Hit", u.Position);
            }

            // Устанавливаем время перезарядки
            u.ReloadCounter = u.Cfg.ReloadTime;

            // Отмечаем, что удар был произведен
            u.VisualMind.Animator.CompleteTask(AnimatorScriptTasks.Hit);
        }

        // Движение удара считается завершенным только на последнем кадре анимации
        if (u.VisualMind.Animator.IsAnimationCompleted)
        {
            motion.State = StateMotion.Done;

            u.VisualMind.SetAnimState(UnitAnimState.Stand);
        }
        else
        {
            motion.State = StateMotion.InProgress;
        }
    }

    
    /**
     * Выполняет один удар.
     */
    private makeOneHit(u, motion, hitNum) {
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
        let targetPosition = createPoint(hitBias.X + u.Position.X,
                                         hitBias.Y + u.Position.Y);

        // Дружественным воинам урон не наносим
        let unitInCell = u.Scena.UnitsMap.GetUpperUnit(Math.floor(targetPosition.X / WorldGlobals.CellSize),
                                                       Math.floor(targetPosition.Y / WorldGlobals.CellSize));
        if (unitInCell != null && unitInCell.Owner.Diplomacy.IsAllianceStatus(u.Owner)) {
            // Исключение - здания и те, кого юнит атакует умышленно
            if (!unitInCell.Cfg.IsBuilding && unitInCell != motion.Target) {
                return;
            }
        }

        // Создание снаряда
        let armament = u.BattleMind.SelectedArmament;
        spawnBullet(u, motion.Target, armament, armament.BulletConfig, armament.BulletCombatParams, targetPosition, targetPosition, motion.TargetMapLayer);

        // В большинстве случаев для создания снаряда удобно использовать метод "Shot",
        // но он не позволяет задать SourcePosition, который необходим здесь для удара дубины
        //u.BattleMind.SelectedArmament.Shot(u, motion.Target, targetPosition, motion.TargetMapLayer);
    }
}


/**
 * Таблица смещений удара относительно центра воина по направлениям.
 */
function createHitTable() {
    return {
        "Up": [
            createPoint(25,-25),
            createPoint(0,-25),
            createPoint(-25,-25),
        ],
        "RightUp": [
            createPoint(25, -3),
            createPoint(25,-25),
            createPoint(0,-25),
        ],
        "Right": [
            createPoint(25, 25),
            createPoint(25, -3),
            createPoint(25,-25),
        ],
        "RightDown": [
            createPoint(0, 20),
            createPoint(25, 25),
            createPoint(25, -3),
        ],
        "Down": [
            createPoint(-25, 25),
            createPoint(0, 20),
            createPoint(25, 25),
        ],
        "LeftDown": [
            createPoint(-25,  3),
            createPoint(-25, 25),
            createPoint(0, 20),
        ],
        "Left": [
            createPoint(-25,-25),
            createPoint(-25,  3),
            createPoint(-25, 25),
        ],
        "LeftUp": [
            createPoint(0,-25),
            createPoint(-25,-25),
            createPoint(-25,  3),
        ],
    };
}
