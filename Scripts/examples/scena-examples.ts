import { createPoint } from "library/common/primitives";
import { UnitMapLayer, UnitEffectFlag } from "library/game-logic/horde-types";
import HordeExampleBase from "./base-example";

/**
 * Пример работы со сценой
 */
export class Example_ScenaWorks extends HordeExampleBase {

    public constructor() {
        super("Scena works");
    }

    public onFirstRun() {
        this.logMessageOnRun();
            
        // Глобальная переменная "scena" - это API для доступа к данным текущей сцены
        // Т.к. API ещё не разработано, ВРЕМЕННО прокинул объект реальной сцены
        // Здесь и далее в функии выполняется работа с реальными объектами (не API)
        let realScena = scena.GetRealScena();
        this.logi('Сцена:', '"' + realScena.ScenaName + '"');

        // Карта юнитов, ландшафта и ресурсов
        let unitsMap = realScena.UnitsMap;
        let landscapeMap = realScena.LandscapeMap;
        let resourcesMap = realScena.ResourcesMap;

        // Специальный объект для работы с координатами - Point2D
        let cell = createPoint(9, 9);

        // Получаем различные данные
        this.logi(`Информация по клетке ${cell.ToString()}`);
        let tile = landscapeMap.Item.get(cell);
        this.logi(`  Тип тайла: ${tile.Cfg.Type.ToString()}`);
        let res = resourcesMap.Item.get(cell);
        this.logi(`  Ресурс: ${res.ResourceType.ToString()}`);
        this.logi(`  Количество деревьев: ${res.TreesCount}`);
        let unit = unitsMap.GetUpperUnit(cell);
        if (unit) {
            this.logi(`  Юнит: ${unit.ToString()}`);
        } else {
            this.logi(`  Юнита нету`);
        }
        let unitAtFloor = unitsMap.Item.get(cell, UnitMapLayer.Floor);
        if (unitAtFloor) {
            if (unitAtFloor.IsNotDead && unitAtFloor.EffectsMind.HasEffect(UnitEffectFlag.Walkable)) {
                this.logi(`  Мост в клетке: ${unitAtFloor.ToString()}`);
            } else {
                this.logi(`  Юнит на нижнем слое в клетке: ${unitAtFloor.ToString()}`);
            }
        } else {
            this.logi(`  В этой клетке нет моста`);
        }

        // Некоторые методы могут работать без Point2D
        let x = 25, y = 25;
        this.logi(`Информация по клетке [${x}; ${y}]`);
        let tile2 = landscapeMap.Item.get(x, y);
        this.logi(`  Тип тайла: ${tile2.Cfg.Type.ToString()}`);
        let res2 = resourcesMap.Item.get(x, y);
        this.logi(`  Ресурс: ${res2.ResourceType.ToString()}`);
        this.logi(`  Количество деревьев: ${res2.TreesCount}`);
        let unit2 = unitsMap.GetUpperUnit(x, y);
        if (unit2) {
            this.logi(`  В клетке обнаружен ${unit2.ToString()}`);
        } else {
            this.logi(`  В клетке пусто`);
        }

        // Поселения на сцене
        let settlements = realScena.Settlements;

        // Модуль вИдения
        let settlement_0 = settlements.Item.get('0');  // Олег
        let settlement_2 = settlements.Item.get('2');  // Эйрик
        let vision_0 = settlement_0.Vision;
        let enemyUnit = settlement_2.Units.GetCastleOrAnyUnit();
        if (enemyUnit) {
            if (vision_0.CanSeeUnit(enemyUnit)) {
                this.logi(`${settlement_0.TownName} видит ${enemyUnit.ToString()}`);
            } else {
                this.logi(`${settlement_0.TownName} не видит ${enemyUnit.ToString()}`);
            }
        } else {
            this.logi(`Для этого примера нужен юнит`);
        }
    }
}
