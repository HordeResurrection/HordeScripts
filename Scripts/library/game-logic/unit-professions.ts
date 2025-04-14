import { log } from "library/common/logging";
import { UnitConfig } from "./horde-types";

// ===================================================
// --- Перечисление профессий (enum)

export const UnitProfession = HordeClassLibrary.UnitComponents.Enumerations.UnitProfession;
export type UnitProfession = HordeClassLibrary.UnitComponents.Enumerations.UnitProfession;

// ===================================================
// --- Параметры профессий (то что указывается в конфиге)

export const AUnitProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.AUnitProfessionParams;
export type AUnitProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.AUnitProfessionParams;
export const CapturableProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.CapturableProfessionParams;
export type CapturableProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.CapturableProfessionParams;
export const CompoundProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.CompoundProfessionParams;
export type CompoundProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.CompoundProfessionParams;
export const HarvesterProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.HarvesterProfessionParams;
export type HarvesterProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.HarvesterProfessionParams;
export const MetalStockProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.MetalStockProfessionParams;
export type MetalStockProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.MetalStockProfessionParams;
export const MineProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.MineProfessionParams;
export type MineProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.MineProfessionParams;
export const MovableProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.MovableProfessionParams;
export type MovableProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.MovableProfessionParams;
export const ReparableProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.ReparableProfessionParams;
export type ReparableProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.ReparableProfessionParams;
export const SawmillProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.SawmillProfessionParams;
export type SawmillProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.SawmillProfessionParams;
export const UnitProducerProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.UnitProducerProfessionParams;
export type UnitProducerProfessionParams = HordeClassLibrary.HordeContent.Configs.Units.ProfessionParams.UnitProducerProfessionParams;

// ===================================================
// --- Данные профессий (то что находится в самом юните на карте)

export const IUnitProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.IUnitProfessionData;
export type IUnitProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.IUnitProfessionData;
export const CapturableProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.CapturableProfessionData;
export type CapturableProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.CapturableProfessionData;
export const CompoundProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.CompoundProfessionData;
export type CompoundProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.CompoundProfessionData;
export const HarvesterProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.HarvesterProfessionData;
export type HarvesterProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.HarvesterProfessionData;
export const IUnitContainerProfession = HordeClassLibrary.UnitComponents.ProfessionData.Interfaces.IUnitContainerProfession;
export type IUnitContainerProfession = HordeClassLibrary.UnitComponents.ProfessionData.Interfaces.IUnitContainerProfession;
export const MetalStockProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.MetalStockProfessionData;
export type MetalStockProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.MetalStockProfessionData;
export const MineProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.MineProfessionData;
export type MineProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.MineProfessionData;
export const MovableProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.MovableProfessionData;
export type MovableProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.MovableProfessionData;
export const ReparableProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.ReparableProfessionData;
export type ReparableProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.ReparableProfessionData;
export const SawmillProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.SawmillProfessionData;
export type SawmillProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.SawmillProfessionData;
export const UnitProducerProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.UnitProducerProfessionData;
export type UnitProducerProfessionData = HordeClassLibrary.UnitComponents.ProfessionData.UnitProducerProfessionData;

// ===================================================
// --- Утилиты

export const TypeToProfession = HordeClassLibrary.UnitComponents.ProfessionData.TypeToProfession;
export type TypeToProfession = HordeClassLibrary.UnitComponents.ProfessionData.TypeToProfession;

/**
 * Берет параметры профессии из конфига юнита.
 * 
 * Почему-то не получилось просто взять значение по ключу из словаря (см. ниже)
 * Пришлось переделать через out-параметр.
 * 
 * @param uCfg - конфиг юнита
 * @param prof - профессия (значение из enum UnitProfession) (TODO: можно сделать парсинг из строки)
 * 
 * @return result - параметры профессии
 */
export function getUnitProfessionParams(uCfg: UnitConfig, prof: UnitProfession) {
    let profParams = host.newVar(AUnitProfessionParams);
    if (!uCfg.ProfessionParams.TryGetValue(prof, profParams.out)) {
        log.warning('Can\'t get profession params:', prof);
        return null;
    }
    return profParams.value;

    // Так почему-то не вышло:
    // let prof = uCfg.ProfessionParams.Item.get(prof);
}
