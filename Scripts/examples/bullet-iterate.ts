import HordeExampleBase from "./base-example";


// Количество обработанных событий, когда будут отключены обработчики
const HITS_TO_STOP_EVENT_HANDLERS = 20;

/**
 * Пример итерирования текущих снарядов на сцене.
 * Может пригодиться для кастомной обработки снарядов.
 * 
 * Тут жесткая рефлексия, т.к. идет работа с обобщенными типами, наследованием и private-полями.
 * Если это окажется полезным, то в дальнейшем будет сделан более простой доступ к снарядам.
 */
export class Example_IterateBullets extends HordeExampleBase {

    private eventHits = 0;
        
    public constructor() {
        super("Iterate bullets");
    }

    public onFirstRun() {
        this.logMessageOnRun();
        
        this.eventHits = 0;

        let bulletsRegistry = ActiveScena.Bullets;
        this.log.info('Реестр снарядов:', bulletsRegistry);
        
        let that = this;

        if (this.globalStorage.currentAddedHandler) {
            this.globalStorage.currentAddedHandler.disconnect();
        }
        this.globalStorage.currentAddedHandler = bulletsRegistry.ItemAdded.connect(function(sender, args) {
            try {
                that.eventHits++;
                let bull = args.Item;
                that.log.info('- Снаряд добавлен:', '[' + bull.State + ']', bull);
            } catch (ex) {
                that.log.exception(ex);
            }
        });
        
        if (this.globalStorage.currentRemovedHandler) {
            this.globalStorage.currentRemovedHandler.disconnect();
        }
        this.globalStorage.currentRemovedHandler = bulletsRegistry.ItemRemoved.connect(function(sender, args) {
            try {
                that.eventHits++;
                let bull = args.Item;
                that.log.info('- Снаряд удален:', '[' + bull.State + ']', bull);
            } catch (ex) {
                that.log.exception(ex);
            }
        });
    }

    public onEveryTick(gameTickNum: number): void {
        
        // Отписаться от обработки событий через некоторое время
        if (this.eventHits >= HITS_TO_STOP_EVENT_HANDLERS) {
            if (this.globalStorage.currentAddedHandler) {
                this.globalStorage.currentAddedHandler.disconnect();
                delete this.globalStorage.currentAddedHandler;
            }
            if (this.globalStorage.currentRemovedHandler) {
                this.globalStorage.currentRemovedHandler.disconnect();
                delete this.globalStorage.currentRemovedHandler;
            }
        }
    }
}
