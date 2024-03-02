import { createPF, createPoint } from "library/common/primitives";
import { spawnBullet } from "library/game-logic/bullet-spawn";
import { BulletCombatParams, UnitMapLayer } from "library/game-logic/horde-types";
import HordeExampleBase from "./base-example";


/**
 * Пример создания снаряда
 */
export class Example_SpawnOneBullet extends HordeExampleBase {

    public constructor() {
        super("Spawn one bullet");
    }

    public onFirstRun() {
        this.logMessageOnRun();
        
        this._spawnBullet();
    }

    private _spawnBullet() {
        let realScena = ActiveScena.GetRealScena();
        let settlement_0 = realScena.Settlements.Item.get('0');  // Олег
    
        // Любой юнит, от имени которого будет отправлена стрела
        let someUnit = settlement_0.Units.GetCastleOrAnyUnit();
    
        // Конфиг снаряда
        let arrowCfg = HordeContentApi.GetBulletConfig("#BulletConfig_Arrow");
    
        // Характеристики выстрела
        let combatParams = BulletCombatParams.CreateInstance();
        ScriptUtils.SetValue(combatParams, "Damage", 4);
        ScriptUtils.SetValue(combatParams, "AdditiveBulletSpeed", createPF(0, 0));
    
        // Создание снаряда
        let bull = spawnBullet(someUnit, null, null, arrowCfg, combatParams, createPoint(10, 100), createPoint(1000, 800), UnitMapLayer.Main);
        this.log.info(`Создан снаряд: ${bull}`);
    }
}

