import { mergeFlags } from "library/dotnet/dotnet-utils";
import { BindingFlags } from "library/dotnet/godmode/reflection";
import { BaseBullet } from "library/game-logic/horde-types";
import HordeExampleBase from "./base-example";


/**
 * Пример итерирования текущих снарядов на сцене.
 * Может пригодиться для кастомной обработки снарядов.
 * 
 * Тут жесткая рефлексия, т.к. идет работа с обобщенными типами, наследованием и private-полями.
 * Если это окажется полезным, то в дальнейшем будет сделан более простой доступ к снарядам.
 */
export class Example_IterateBullets extends HordeExampleBase {

    private bulletsRegistry : any;
    private bulletsIdProvider : any;
    private lastNextBulletId = 0;
    
    public constructor() {
        super("Iterate bullets");
        
        let realScena = scena.GetRealScena();

        this.bulletsRegistry = realScena.Bullets;
        this.logi('Реестр снарядов:', this.bulletsRegistry.ToString());

        this.bulletsIdProvider = this._getIdProvider();
        this.logi('IdProvider для снарядов:', this.bulletsIdProvider.ToString());
    }

    public onFirstRun() {
        this.logMessageOnRun();
    }

    public onEveryTick(gameTickNum: number) {
    
        // Следующий ID снаряда
        let currentNextId = HordeUtils.getValue(this.bulletsIdProvider, "TotalIds");
    
        // Итерируем новые снаряды на сцене
        let bullVar = host.newVar(BaseBullet);
        for (let i = this.lastNextBulletId; i < currentNextId; i++) {
            if(!this.bulletsRegistry.TryGet(i, bullVar.out))
                continue;
                let bull = bullVar.value;
            this.logi('- Новый снаряд:', '[' + bull.State.ToString() + ']', bull.ToString());
    
            // Внимание! Здесь будут только те снаряды, которые имеются на сцене в данный момент.
            // Т.е. здесь не найти снаряды, которые уже завершили своё движение. Это актуально для снарядов ближнего боя.
        }
    
        // Запоминаем на каком снаряде остановились в этот раз
        this.lastNextBulletId = currentNextId;
    }

    /**
     * Магия рефлексии для получения доступа к IdProvider 
     */
    private _getIdProvider() {
        let BaseBulletT = HordeUtils.GetTypeByName("HordeClassLibrary.World.Objects.Bullets.BaseBullet, HordeClassLibrary");
        let ScenaObjectsRegistryT = HordeUtils.GetTypeByName("HordeClassLibrary.World.ScenaComponents.Intrinsics.ScenaObjectsRegistry`1").MakeGenericType(BaseBulletT);
        let propIdProvider = ScenaObjectsRegistryT.GetProperty("IdProvider", mergeFlags(BindingFlags, BindingFlags.Instance, BindingFlags.Public, BindingFlags.NonPublic));
        let bulletsIdProvider = propIdProvider.GetValue(this.bulletsRegistry);
        return bulletsIdProvider;
    }
}
