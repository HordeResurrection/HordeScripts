import { log } from "library/common/logging";
import HordePluginBase from "plugins/base-plugin";
import ScenaScriptBase from "plugins/base-scena-script";
import { AttentionOnSurfacePlugin } from "plugins/attention-on-surface";


/**
 * Здесь перечислены стандартные плагины, которые будут запущены автоматически.
 */
function getDefaultPlugins() {
    return [
        new AttentionOnSurfacePlugin(),
        //new PrintSelectedSquadOrdersPlugin(),
    ];
}


/**
 * Класс для работы с плагинами.
 */
export class HordePluginsCollection {
    private plugins: Array<HordePluginBase>;

    public constructor() {
        this.plugins = [];
    }

    public register(plugin: HordePluginBase) {
        this.plugins.push(plugin);
        log.info(`Plugin registered: "${plugin.displayName}"`);
    }
    
    public registerScenaScript(scenaPlugin: ScenaScriptBase) {
        let scenaName = ActiveScena.GetRealScena().ScenaName;
        if (scenaPlugin.scenaName != scenaName) {
            return;
        }

        this.plugins.push(scenaPlugin);
        log.info(`Scena script registered: "${scenaPlugin.displayName}" ("${scenaName}")`);
    }

    public registerDefaultPlugins() {
        for (let plugin of getDefaultPlugins()) {
            this.register(plugin);
        }
    }

    public clear() {
        this.plugins = [];
    }

    public onFirstRun() {
        for (let plugin of this.plugins) {
            plugin.onFirstRun();
        }
    }

    public onEveryTick(gameTickNum: number) {
        for (let plugin of this.plugins) {
            plugin.onEveryTick(gameTickNum);
        }
    }
}


/**
 * Объект с активными плагинами.
 */
export const activePlugins: HordePluginsCollection = new HordePluginsCollection();
