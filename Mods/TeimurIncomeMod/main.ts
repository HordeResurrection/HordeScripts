import { activePlugins } from "active-plugins";
import { TeimurIncomePlugin } from "./teimur-income";

export function onInitialization() {
    // Инициализация плагинов
    activePlugins.register(new TeimurIncomePlugin());
}
