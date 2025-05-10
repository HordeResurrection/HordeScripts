// function HeroAltarSystem(gameTickNum: number) {
//     for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
//         if (!world.IsSettlementInGame(settlementId)) {
//             continue;
//         }

//         for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
//             var entity = world.settlements_entities[settlementId][i] as Entity;
//             if (!entity.components.has(COMPONENT_TYPE.HERO_ALTAR_COMPONENT)) {
//                 continue;
//             }
//             var heroAltarComponent = entity.components.get(COMPONENT_TYPE.HERO_ALTAR_COMPONENT) as HeroAltarComponent;
//             var unitComponent      = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;

//             // если герой не выбран
//             if (heroAltarComponent.selectedHeroNum < 0) {
//                 // проверяем, что алтарь что-то строит
//                 if (unitComponent.unit.OrdersMind.ActiveAct.GetType().Name == "ActProduce") {
//                     // выбираем героя
//                     var productUnitCfg = unitComponent.unit.OrdersMind.ActiveOrder.ProductUnitConfig;
                    
//                     for (var heroNum = 0; heroNum < heroAltarComponent.heroesCfgIdxs.length; heroNum++) {
//                         if (OpCfgUidToCfg[heroAltarComponent.heroesCfgIdxs[heroNum]].Uid == productUnitCfg.Uid) {
//                             heroAltarComponent.selectedHeroNum = heroNum;
//                             break;
//                         }
//                     }
                    
//                     // отменяем постройку
//                     unitComponent.unit.OrdersMind.CancelOrders(true);

//                     // запрещаем постройку
//                     var commandsMind       = unitComponent.unit.CommandsMind;
//                     var disallowedCommands = ScriptUtils.GetValue(commandsMind, "DisallowedCommands");
//                     if (disallowedCommands.ContainsKey(UnitCommand.Produce)) disallowedCommands.Remove(UnitCommand.Produce);
//                     disallowedCommands.Add(UnitCommand.Produce, 1);
//                     //log.info(disallowedCommands.Item.get(UnitCommand.Produce));
//                     ScriptUtils.GetValue(unitComponent.unit, "Model").ProfessionsData.Remove(UnitProfession.UnitProducer)

//                     // регистрируем героя
//                     OpCfgUidToCfg["hero_" + settlementId] = HordeContentApi.CloneConfig(OpCfgUidToCfg[heroAltarComponent.heroesCfgIdxs[heroAltarComponent.selectedHeroNum]]);
//                     // делаем подходящий цвет
//                     log.info("делаем подходящий цвет героя");
                    
//                     // точка спавна относительно юнита
//                     var emergePoint = OpCfgUidToCfg[unitComponent.cfgId].BuildingConfig.EmergePoint;

//                     // регистрируем героя
//                     var heroEntity = new Entity();
//                     heroEntity.components.set(COMPONENT_TYPE.UNIT_COMPONENT, new UnitComponent(null, "hero_" + settlementId));
//                     heroEntity.components.set(COMPONENT_TYPE.HERO_COMPONENT, new HeroComponent(entity));
//                     heroEntity.components.set(COMPONENT_TYPE.REVIVE_COMPONENT,
//                         new ReviveComponent(new Point(unitComponent.unit.Cell.X + emergePoint.X, unitComponent.unit.Cell.Y + emergePoint.Y),
//                         50*60, gameTickNum));
//                     world.settlements_entities[settlementId].push(heroEntity);

//                     // делаем ссылку
//                     heroAltarComponent.heroEntity = heroEntity;
//                 }
//             } else {

//             }
//         }
//     }
// }
