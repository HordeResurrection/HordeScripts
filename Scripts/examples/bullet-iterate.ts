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
    
    public constructor() {
        super("Iterate bullets");
        
        let realScena = ActiveScena.GetRealScena();

        this.bulletsRegistry = realScena.Bullets;
    }

    public onFirstRun() {
        this.logMessageOnRun();
        
        this.log.info('Реестр снарядов:', this.bulletsRegistry);
        
        let that = this;

        if (this.globalStorage.currentAddedHandler) {
            this.globalStorage.currentAddedHandler.disconnect();
        }
        this.globalStorage.currentAddedHandler = this.bulletsRegistry.ItemAdded.connect(function(sender, args) {
            try {
                let bull = args.Item;
                that.log.info('- Снаряд добавлен:', '[' + bull.State + ']', bull);
            } catch (ex) {
                that.log.exception(ex);
            }
        });
        
        if (this.globalStorage.currentRemovedHandler) {
            this.globalStorage.currentRemovedHandler.disconnect();
        }
        this.globalStorage.currentRemovedHandler =this.bulletsRegistry.ItemRemoved.connect(function(sender, args) {
            try {
                let bull = args.Item;
                that.log.info('- Снаряд удален:', '[' + bull.State + ']', bull);
            } catch (ex) {
                that.log.exception(ex);
            }
        });
    }
}
