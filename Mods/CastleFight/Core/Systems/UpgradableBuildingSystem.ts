import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { OpCfgUidToCfg } from "../Configs/IConfig";
import { World } from "../World";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { UnitComponent } from "../Components/UnitComponent";
import { UpgradableBuildingComponent } from "../Components/UpgradableBuildingComponent";
import { Entity } from "../Entity";

const ReplaceUnitParameters = HordeClassLibrary.World.Objects.Units.ReplaceUnitParameters;

export function UpgradableBuildingSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        // проверяем активацию улучшений
        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT) && entity.components.has(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT)) {
                var unitComponent          = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                if (!unitComponent.unit || unitComponent.unit.IsDead) {
                    continue;
                }
                var upgradableBuildingComponent = entity.components.get(COMPONENT_TYPE.UPGRADABLE_BUILDING_COMPONENT) as UpgradableBuildingComponent;

                // проверяем, что здание что-то строит
                if (unitComponent.unit.OrdersMind.ActiveAct.GetType().Name == "ActProduce" &&
                    unitComponent.unit.OrdersMind.ActiveAct.ActiveMotion.LeftTime < 100) {
                    var buildingCfg = unitComponent.unit.OrdersMind.ActiveOrder.ProductUnitConfig;
                    
                    // проверяем, что здание строит улучшение
                    for (var upgradeId = 0; upgradeId < upgradableBuildingComponent.upgradesCfgUid.length; upgradeId++) {
                        var iconUpgradeCfgId = UpgradableBuildingComponent.GetUpgradeCfgUid(upgradableBuildingComponent.upgradesCfgUid[upgradeId]);
                        
                        if (buildingCfg.Uid != OpCfgUidToCfg[iconUpgradeCfgId].Uid) {
                            continue;
                        }

                        // заменяем постройку на улучшенную
                        let replaceParams = new ReplaceUnitParameters();
                        replaceParams.OldUnit = unitComponent.unit;
                        replaceParams.NewUnitConfig = OpCfgUidToCfg[upgradableBuildingComponent.upgradesCfgUid[upgradeId]];
                        replaceParams.Cell = null;                   // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
                        replaceParams.PreserveHealthLevel = false;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
                        replaceParams.PreserveOrders = false;        // Нужно ли передать приказы?
                        replaceParams.Silent = true;                 // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
                        
                        let upgradedUnit = unitComponent.unit.Owner.Units.ReplaceUnit(replaceParams);

                        // регистрируем новую постройку
                        world.RegisterUnitEntity(upgradedUnit);

                        // создаем эффект улучшения
                        spawnDecoration(world.realScena, HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_BigDust"), upgradedUnit.Position);
                        break;
                    }
                }
            }
        }
    }
}
