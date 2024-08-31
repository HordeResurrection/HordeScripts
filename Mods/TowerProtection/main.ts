import { activePlugins } from "active-plugins";
import { TowerProtection } from "./TowerProtection";

/**
 * Вызывается до вызова "onFirstRun()" при первом запуске скрипт-машины, а так же при hot-reload
 */
export function onInitialization() {
    activePlugins.register(new TowerProtection());
}
