import { log } from "library/common/logging";
import { generateCellInSpiral } from "library/common/position-tools";
import { createHordeColor, createPF } from "library/common/primitives";
import { mergeFlags } from "library/dotnet/dotnet-utils";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { UnitSpecification, UnitFlags, UnitDirection } from "library/game-logic/horde-types";
import { OpCfgUidToEntity } from "../Configs/IConfig";
import { CreateUnitConfig, spawnUnits, UnitDisallowCommands } from "../Utils";
import { World } from "../World";
import { BuffableComponent, BUFF_TYPE } from "../Components/BuffableComponent";
import { BuffComponent } from "../Components/BuffComponent";
import { COMPONENT_TYPE } from "../Components/IComponent";
import { UnitComponent } from "../Components/UnitComponent";
import { Entity } from "../Entity";

const ReplaceUnitParameters = HordeClassLibrary.World.Objects.Units.ReplaceUnitParameters;

export function BuffSystem(world: World, gameTickNum: number) {
    for (var settlementId = 0; settlementId < world.scena.settlementsCount; settlementId++) {
        if (!world.IsSettlementInGame(settlementId)) {
            continue;
        }

        for (var i = 0; i < world.settlements_entities[settlementId].length; i++) {
            var entity = world.settlements_entities[settlementId][i] as Entity;
            if (!entity.components.has(COMPONENT_TYPE.BUFF_COMPONENT) ||
                !entity.components.has(COMPONENT_TYPE.UNIT_COMPONENT)) {
                continue;
            }

            var unitComponent = entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            var buffComponent = entity.components.get(COMPONENT_TYPE.BUFF_COMPONENT) as BuffComponent;
            
            // проверяем, что юнит кого-то бьет
            if (!unitComponent.unit.OrdersMind.ActiveOrder.Target) {
                continue;
            }

            var target_CfgUid = unitComponent.unit.OrdersMind.ActiveOrder.Target.Cfg.Uid;

            // проверяем, что цель можно баффать
            if (!OpCfgUidToEntity.has(target_CfgUid)) {
                continue;
            }
            var targetBaseEntity = OpCfgUidToEntity.get(target_CfgUid) as Entity;
            if (!targetBaseEntity.components.has(COMPONENT_TYPE.BUFFABLE_COMPONENT)) {
                continue;
            }
            var targetBuffableComponent = targetBaseEntity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;
            if (targetBuffableComponent.buffType != BUFF_TYPE.EMPTY) {
                continue;
            }
            if (!targetBuffableComponent.buffMask[buffComponent.buffType]) {
                continue;
            }

            var target_settlementId = unitComponent.unit.OrdersMind.ActiveOrder.Target.Owner.Uid;

            // ищем сущность цели
            var target_entityId : number = -1;
            for (var k = 0; k < world.settlements_entities[target_settlementId].length; k++) {
                var tentity = world.settlements_entities[target_settlementId][k] as Entity;
                if (tentity.components.has(COMPONENT_TYPE.UNIT_COMPONENT) &&
                    tentity.components.has(COMPONENT_TYPE.BUFFABLE_COMPONENT)) {
                    var tunitComponent = tentity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
                    if (tunitComponent.unit.Id == unitComponent.unit.OrdersMind.ActiveOrder.Target.Id) {
                        target_entityId = k;
                        break;
                    }
                }
            }
            if (target_entityId == -1) {
                continue;
            }

            // все юнита можно бафать

            // убиваем духа
            {
                unitComponent.unit.Delete();
            }

            var target_entity            = world.settlements_entities[target_settlementId][target_entityId] as Entity;
            var target_unitComponent     = target_entity.components.get(COMPONENT_TYPE.UNIT_COMPONENT) as UnitComponent;
            var target_buffableComponent = target_entity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;

            // бафаем цель

            // обновляем конфиг баффнутого юнита
            var buffUnitCfg : any;
            var buffUnitCfgUid : string = target_unitComponent.cfgUid + BuffableComponent.BuffCfgUidSuffix[buffComponent.buffType];
            if (HordeContentApi.HasUnitConfig(buffUnitCfgUid)) {
                buffUnitCfg = HordeContentApi.GetUnitConfig(buffUnitCfgUid);
            } else {
                buffUnitCfg    = CreateUnitConfig(target_unitComponent.cfgUid, buffUnitCfgUid);
                switch (buffComponent.buffType) {
                    case BUFF_TYPE.ATTACK:
                        ScriptUtils.SetValue(buffUnitCfg, "Name", buffUnitCfg.Name + "\n{атака}");
                        ScriptUtils.SetValue(buffUnitCfg, "TintColor", createHordeColor(150, 150, 0, 0));
                        // техника или маг
                        if (buffUnitCfg.Specification.HasFlag(UnitSpecification.Machine) || 
                            buffUnitCfg.Specification.HasFlag(UnitSpecification.Mage)) {
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament.ShotParams, "Damage", Math.min(1000, 5*buffUnitCfg.MainArmament.ShotParams.Damage));
                        }
                        // дальник
                        else if (buffUnitCfg.MainArmament.Range > 1) {
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament.ShotParams, "Damage", Math.min(1000, 5*buffUnitCfg.MainArmament.ShotParams.Damage));
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament, "EmitBulletsCountMin", Math.min(5, buffUnitCfg.MainArmament.EmitBulletsCountMin + 2));
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament, "EmitBulletsCountMax", Math.min(5, buffUnitCfg.MainArmament.EmitBulletsCountMax + 2));
                        }
                        // ближник
                        else {
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament.ShotParams, "Damage", 5*buffUnitCfg.MainArmament.ShotParams.Damage);
                        }
                        break;
                    case BUFF_TYPE.ACCURACY:
                        ScriptUtils.SetValue(buffUnitCfg, "Name", buffUnitCfg.Name + "\n{меткость}");
                        ScriptUtils.SetValue(buffUnitCfg, "TintColor", createHordeColor(150, 148, 0, 211));
                        ScriptUtils.SetValue(buffUnitCfg, "Sight", Math.min(14, buffUnitCfg.Sight + 4));
                        if (buffUnitCfg.MainArmament.Range > 1) {
                            ScriptUtils.SetValue(buffUnitCfg, "ReloadTime", 2*buffUnitCfg.ReloadTime);
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament, "ReloadTime", 2*buffUnitCfg.MainArmament.ReloadTime);
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament, "Range", 2*buffUnitCfg.MainArmament.Range);
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament, "ForestRange", 2*buffUnitCfg.MainArmament.ForestRange);
                            ScriptUtils.SetValue(buffUnitCfg, "OrderDistance", 2*buffUnitCfg.OrderDistance);
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament, "DisableDispersion", true);
                            ScriptUtils.SetValue(buffUnitCfg.MainArmament.ShotParams, "AdditiveBulletSpeed", createPF(30, 0));
                        }
                        break;
                    case BUFF_TYPE.HEALTH:
                        ScriptUtils.SetValue(buffUnitCfg, "Name",      buffUnitCfg.Name + "\n{здоровье}");
                        ScriptUtils.SetValue(buffUnitCfg, "TintColor", createHordeColor(150, 0, 150, 0));
                        ScriptUtils.SetValue(buffUnitCfg, "MaxHealth", 5*buffUnitCfg.MaxHealth);
                        break;
                    case BUFF_TYPE.DEFFENSE:
                        ScriptUtils.SetValue(buffUnitCfg, "Name",      buffUnitCfg.Name + "\n{защита}");
                        ScriptUtils.SetValue(buffUnitCfg, "TintColor", createHordeColor(150, 255, 215, 0));
                        ScriptUtils.SetValue(buffUnitCfg, "MaxHealth", 2*buffUnitCfg.MaxHealth);
                        ScriptUtils.SetValue(buffUnitCfg, "Shield",    Math.max(390, buffUnitCfg.Shield));
                        ScriptUtils.SetValue(buffUnitCfg, "Flags",     mergeFlags(UnitFlags, buffUnitCfg.Flags, UnitFlags.FireResistant, UnitFlags.MagicResistant));
                        break;
                    case BUFF_TYPE.CLONING:
                        ScriptUtils.SetValue(buffUnitCfg, "Name", buffUnitCfg.Name + "\n{клонирован}");
                        ScriptUtils.SetValue(buffUnitCfg, "TintColor", createHordeColor(150, 255, 255, 255));
                        break;
                }
            }

            // количество юнитов
            var spawnCount     = 1;
            if (buffComponent.buffType == BUFF_TYPE.CLONING) {
                spawnCount = 12;
            }
            
            // создаем дополнительных баффнутых юнитов
            if (spawnCount > 1) {
                var generator    = generateCellInSpiral(target_unitComponent.unit.Cell.X, target_unitComponent.unit.Cell.Y);
                var spawnedUnits = spawnUnits(world.settlements[target_settlementId], buffUnitCfg, spawnCount - 1, UnitDirection.Down, generator);
                log.info("Заспавнено юнитов ", spawnedUnits.length);
                for (var spawnedUnit of spawnedUnits) {
                    var newEntity              = world.RegisterUnitEntity(spawnedUnit, target_entity);
                    // устанавливаем информацию о баффе и о бафнутом конфиге
                    var buffableComponent      = newEntity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;
                    buffableComponent.buffType = buffComponent.buffType;
                    buffableComponent.buffCfg  = null;
                    // запрещаем команды
                    UnitDisallowCommands(spawnedUnit);
                    // создаем эффект появления
                    spawnDecoration(world.realScena, HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), spawnedUnit.Position);
                }
            }

            // заменяем текущего юнита на баффнутого
            if (target_unitComponent.unit.IsAlive) {
                let replaceParams = new ReplaceUnitParameters();
                replaceParams.OldUnit = target_unitComponent.unit;
                replaceParams.NewUnitConfig = buffUnitCfg;
                replaceParams.Cell = null;                   // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
                replaceParams.PreserveHealthLevel = false;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
                replaceParams.PreserveOrders = false;        // Нужно ли передать приказы?
                replaceParams.Silent = true;                 // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
                target_unitComponent.unit = target_unitComponent.unit.Owner.Units.ReplaceUnit(replaceParams);
                // записываем инфу о баффе (конфиг записывает только для 1-ого, чтобы корректно удалился он)
                target_buffableComponent.buffType = buffComponent.buffType;
                target_buffableComponent.buffCfg  = buffUnitCfg;
                // запрещаем команды
                UnitDisallowCommands(target_unitComponent.unit);
                // создаем эффект появления
                spawnDecoration(world.realScena, HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), target_unitComponent.unit.Position);
            } else {
                var generator    = generateCellInSpiral(target_unitComponent.unit.Cell.X, target_unitComponent.unit.Cell.Y);
                var spawnedUnits = spawnUnits(world.settlements[target_settlementId], buffUnitCfg, 1, UnitDirection.Down, generator);
                for (var spawnedUnit of spawnedUnits) {
                    var newEntity              = world.RegisterUnitEntity(spawnedUnit, target_entity);
                    // устанавливаем информацию о баффе и о бафнутом конфиге
                    var buffableComponent      = newEntity.components.get(COMPONENT_TYPE.BUFFABLE_COMPONENT) as BuffableComponent;
                    buffableComponent.buffType = buffComponent.buffType;
                    buffableComponent.buffCfg  = buffUnitCfg;
                    // запрещаем команды
                    UnitDisallowCommands(spawnedUnit);
                    // создаем эффект появления
                    spawnDecoration(world.realScena, HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"), spawnedUnit.Position);
                }
            }
        }
    }
}