import { generateCellInSpiral } from "library/common/position-tools";
import { TileType, UnitCommand, UnitConfig, UnitFlags } from "library/game-logic/horde-types";
import { IUnit } from "./IUnit";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { GlobalVars } from "../GlobalData";
import { removeFlags, unitCanBePlacedByRealMap } from "../Utils";
import { Cell } from "./Geometry";
import { iterateOverUnitsInBox } from "library/game-logic/unit-and-map";
import { createHordeColor, createPoint, HordeColor } from "library/common/primitives";
import { UnitProfession } from "library/game-logic/unit-professions";
import { mergeFlags } from "library/dotnet/dotnet-utils";

const UnitQueryFlag = HordeClassLibrary.UnitComponents.Enumerations.UnitQueryFlag;

export namespace TeimurUnitsModificators {
    export enum Type {
        DEFENCE = 0,
        FIREIMMUNE,
        MAGICIMMUNE,
        DOUBLEHP,
        SPEED,
        NULL    
    }

    export function RandomModificator() : Type {
        if (GlobalVars.gameMode == 1) {
            return Type.NULL;
        } else {
            return GlobalVars.rnd.RandomNumber(Type.DEFENCE, Type.NULL - 1) as Type;
        }
    }

    export const Names : Array<string> = ["_defence", "_fireimmune", "_magicimmune", "_doublehp", "_speed"];

    export namespace Characteristics {
        export const NameSuf   : Array<string> = ["\n{защита}", "\n{имм огонь}", "\n{имм магия}", "\n{2*хп}", "\n{1.25 скорость}"];
        export const Shield    : Array<number> = [4, 0, 0, 0, 0];
        export const HPCoeff   : Array<number> = [1, 1, 1, 2, 1];
        export const Flag      : Array<UnitFlags | null> = [
            null,
            UnitFlags.FireResistant,
            UnitFlags.MagicResistant,
            null,
            null
        ];
        export const SpeedCoeff : Array<number> = [ 1, 1, 1, 1, 1.25];
        export const TintColor : Array<HordeColor | null> = [
            createHordeColor(255, 200, 200, 0),
            createHordeColor(255, 150, 80, 50),
            createHordeColor(255, 100, 100, 255),
            createHordeColor(255, 0, 220, 100),
            null
        ];
    }
}

export class ITeimurUnit extends IUnit {
    static canAttackBuilding : boolean = true;
    protected _canAttackBuilding : boolean;

    /** счет сколько раз подряд юнит стоял на месте при бездействии */
    protected _isIdleCounter: number;
    protected _unitPrevCell: Cell;

    constructor(unit: any, teamNum: number) {
        super(unit, teamNum);

        this._canAttackBuilding = this.constructor['canAttackBuilding'];
        this._isIdleCounter     = 0;
        this._unitPrevCell      = new Cell(0, 0);
    }

    public OnEveryTick(gameTickNum: number) : boolean {
        if (!super.OnEveryTick(gameTickNum)) {
            return false;
        }

        // защита от перекрытых заборов
        if (this._isIdleCounter > 10) {
            this._isIdleCounter = 0;

            // ищем позиции ближайших врагов
            var nearEnemyCells = new Array<Cell>();
            let unitsIter = iterateOverUnitsInBox(createPoint(this.unit.Cell.X, this.unit.Cell.Y), 2);
            for (let u = unitsIter.next(); !u.done; u = unitsIter.next()) {
                var _unit = u.value;
                if (Number.parseInt(_unit.Owner.Uid) == GlobalVars.teams[this.teamNum].teimurSettlementId) {
                    continue;
                }

                nearEnemyCells.push(new Cell(_unit.Cell.X, _unit.Cell.Y));
            }

            if (nearEnemyCells.length == 0) {
                return true;
            }

            // если юнит умеет атаковать, то атакуем любое строение, иначе отходим назад
            if (this._canAttackBuilding) {
                this.GivePointCommand(nearEnemyCells[0], UnitCommand.Attack, AssignOrderMode.Queue);
            } else {
                var unitCell = new Cell(this.unit.Cell.X, this.unit.Cell.Y);
                var moveVec  = new Cell(0, 0);
                for (var enemyCell of nearEnemyCells) {
                    moveVec.X += enemyCell.X - unitCell.X;
                    moveVec.Y += enemyCell.Y - unitCell.Y;
                }
                moveVec.X *= -10.0/nearEnemyCells.length;
                moveVec.Y *= -10.0/nearEnemyCells.length;
                
                this.GivePointCommand(new Cell(Math.round(unitCell.X + moveVec.X), Math.round(unitCell.Y + moveVec.Y)), UnitCommand.MoveToPoint, AssignOrderMode.Queue);
            }

            return true;
        }

        var unitCell = new Cell(this.unit.Cell.X, this.unit.Cell.Y);

        // проверяем, что юнит ничего не делает
        if (!this.unit_ordersMind.IsIdle()) {
            if (this._unitPrevCell.X != unitCell.X || this._unitPrevCell.Y != unitCell.Y) {
                this._isIdleCounter = 0;
            }
            return true;
        }
        this._isIdleCounter++;
        this._unitPrevCell = new Cell(this.unit.Cell.X, this.unit.Cell.Y);
        
        // атакуем замок
        //if (this._canAttackBuilding) {
        //    this.GivePointCommand(GlobalVars.teams[this.teamNum].castleCell, UnitCommand.Attack, AssignOrderMode.Queue);
        //} else {
            // позиция для атаки цели
            var goalPosition;
            {
                var generator = generateCellInSpiral(GlobalVars.teams[this.teamNum].castleCell.X, GlobalVars.teams[this.teamNum].castleCell.Y);
                for (goalPosition = generator.next(); !goalPosition.done; goalPosition = generator.next()) {
                    if (unitCanBePlacedByRealMap(this.unit.Cfg, goalPosition.value.X, goalPosition.value.Y)) {
                        break;
                    }
                }
            }
            this.GivePointCommand(goalPosition.value, UnitCommand.Attack, AssignOrderMode.Queue);
        //}

        return true;
    }

    public static InitConfig() {
        super.InitConfig();
        
        var cfg : UnitConfig = GlobalVars.configs[this.CfgUid];

        if (cfg.AllowedCommands.ContainsKey(UnitCommand.Capture)) {
            cfg.AllowedCommands.Remove(UnitCommand.Capture);
        }
        // убираем требования
        cfg.TechConfig.Requirements.Clear();
        // убираем производство людей
        ScriptUtils.SetValue(cfg, "ProducedPeople", 0);
        // убираем налоги
        ScriptUtils.SetValue(cfg, "SalarySlots", 0);
        if (cfg.Flags.HasFlag(UnitFlags.Timid)) {
            // убираем флаг отступления
            ScriptUtils.SetValue(cfg, "Flags", removeFlags(UnitFlags, cfg.Flags, UnitFlags.Timid));
        }

        // проверяем, может ли юнит атаковать здания
        if (cfg.MainArmament && cfg.MainArmament.BulletConfig.DisallowedTargets.HasFlag(UnitQueryFlag.Buildings)) {
            this.canAttackBuilding = false;
        }

        // технику делаем незахватываемой
        if (cfg.ProfessionParams.ContainsKey(UnitProfession.Capturable)) {
            cfg.ProfessionParams.Remove(UnitProfession.Capturable);
        }
    }

    public static GetSpawnCount(spawnCount: number) {
        return spawnCount;
    }

    public static GetConfigWithModificator(modificator : TeimurUnitsModificators.Type) : UnitConfig {
        if (modificator == TeimurUnitsModificators.Type.NULL) {
            return GlobalVars.configs[this.CfgUid];
        }

        var cfgUid = this.CfgUid + TeimurUnitsModificators.Names[modificator];

        if (!GlobalVars.configs[cfgUid]) {
            var cfg : UnitConfig;
            if (HordeContentApi.HasUnitConfig(cfgUid)) {
                cfg = HordeContentApi.GetUnitConfig(cfgUid);
            } else {
                cfg = HordeContentApi.CloneConfig(HordeContentApi.GetUnitConfig(this.CfgUid), cfgUid) as UnitConfig;

                // настройка
                ScriptUtils.SetValue(cfg, "Name", cfg.Name + TeimurUnitsModificators.Characteristics.NameSuf[modificator]);
                if (TeimurUnitsModificators.Characteristics.Flag[modificator]) {
                ScriptUtils.SetValue(cfg, "Flags",
                    mergeFlags(UnitFlags,
                        removeFlags(UnitFlags, cfg.Flags, UnitFlags.MagicResistant, UnitFlags.FireResistant),
                        TeimurUnitsModificators.Characteristics.Flag[modificator]));
                }
                ScriptUtils.SetValue(cfg, "MaxHealth", cfg.MaxHealth * TeimurUnitsModificators.Characteristics.HPCoeff[modificator]);
                ScriptUtils.SetValue(cfg, "Shield", TeimurUnitsModificators.Characteristics.Shield[modificator]);
                if (TeimurUnitsModificators.Characteristics.TintColor[modificator]) {
                    ScriptUtils.SetValue(cfg, "TintColor", TeimurUnitsModificators.Characteristics.TintColor[modificator]);
                }
                if (TeimurUnitsModificators.Characteristics.SpeedCoeff[modificator] != 1) {
                    var tylesType = [
                        TileType.Grass,
                        TileType.Forest,
                        TileType.Water,
                        TileType.Marsh,
                        TileType.Sand,
                        TileType.Mounts,
                        TileType.Road,
                        TileType.Ice
                    ];
                    for (var tileNum = 0; tileNum < tylesType.length; tileNum++) {
                        cfg.Speeds.Item.set(tylesType[tileNum],
                            Math.round((cfg.Speeds.Item.get(tylesType[tileNum]) as number)
                            * TeimurUnitsModificators.Characteristics.SpeedCoeff[modificator]));
                    }
                }
            }

            GlobalVars.configs[cfgUid] = cfg;
        }

        return GlobalVars.configs[cfgUid];
    }

    public static IsLegendaryUnit() : boolean {
        return false;
    }
}
