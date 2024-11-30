import { AllContent } from "library/game-logic/horde-types";
import { MaraUtils } from "../../MaraUtils";
import { ConfigPropertyType } from "./ConfigPropertyType";

class MaraUnitConfigCacheItem {
    Uid: string;
    Config: any;
    
    private configProperties: Map<string, ConfigPropertyType>;

    constructor(unitConfig: any) {
        this.Config = unitConfig;
        this.Uid = unitConfig.Uid;
        this.configProperties = new Map<string, ConfigPropertyType>();
    }

    GetConfigProperty(propertyCalculator: (config: any) => ConfigPropertyType, propertyName?: string): ConfigPropertyType {
        let propName = propertyName ?? propertyCalculator.name;
        let property = this.configProperties.get(propName);

        if (property != undefined) {
            return property;
        }
        else {
            let propertyValue = propertyCalculator(this.Config);
            this.configProperties.set(propName, propertyValue);

            return propertyValue;
        }
    }
}


export class MaraUnitConfigCache {
    private static configCache: Map<string, MaraUnitConfigCacheItem> = new Map<string, MaraUnitConfigCacheItem>();
    private static canAttackCache: Map<string, boolean> = new Map<string, boolean>();

    static Init(): void {
        ForEach(AllContent.UnitConfigs.Configs, kv => {
            this.addConfig(kv.Value);
        });
    }

    static GetConfigProperty(
        configId: string,
        propertyCalculator: (config: any) => ConfigPropertyType,
        propertyName?: string
    ): ConfigPropertyType {
        let cacheItem = MaraUnitConfigCache.configCache.get(configId);

        if (cacheItem) {
            return cacheItem.GetConfigProperty(propertyCalculator, propertyName);
        }
        else {
            let config = MaraUtils.GetUnitConfig(configId);
            cacheItem = MaraUnitConfigCache.addConfig(config);
            
            return cacheItem.GetConfigProperty(propertyCalculator, propertyName);
        }
    }

    static GetCanAttack(sourceConfigId: string, targetConfigId: string): boolean | undefined {
        return MaraUnitConfigCache.canAttackCache.get(sourceConfigId + targetConfigId);
    }

    static SetCanAttack(sourceConfigId: string, targetConfigId: string, value: boolean): void {
        MaraUnitConfigCache.canAttackCache.set(sourceConfigId + targetConfigId, value);
    }

    private static addConfig(unitConfig: any): MaraUnitConfigCacheItem {
        let cacheItem = new MaraUnitConfigCacheItem(unitConfig);
        MaraUnitConfigCache.configCache.set(cacheItem.Uid, cacheItem);

        return cacheItem;
    }
}