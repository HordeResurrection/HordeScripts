import { generateCellInSpiral } from "library/common/position-tools";
import { createPoint } from "library/common/primitives";
import { TileType, UnitCommand } from "library/game-logic/horde-types";
import { iterateOverUnitsInBox } from "library/game-logic/unit-and-map";
import { UnitProfession } from "library/game-logic/unit-professions";
import { AssignOrderMode } from "library/mastermind/virtual-input";
import { GlobalVars, UnitQueryFlag } from "../GlobalData";
import { unitCanBePlacedByRealMap } from "../Utils";
import { Cell } from "./Geometry";
import { IUnit } from "./IUnit";

export class ITeimurUnit extends IUnit {
    // для усиления качества волн
    static MaxHealthBase : number; 
    static DamageBase    : number;
    static MaxSpawnCount : number;

    static canAttackBuilding : boolean = true;
    protected _canAttackBuilding : boolean;
    /** счет сколько раз подряд юнит стоял на месте при бездействии */
    protected _isIdleCounter: number;
    protected _unitPrevCell: Cell;

    constructor(unit: any, teamNum: number) {
        super(unit, teamNum);

        this._canAttackBuilding = this.constructor['canAttackBuilding'];
        this._isIdleCounter     = 0;
        this._unitPrevCell      = new Cell();
        this.needDeleted        = false;
    }

    public OnEveryTick(gameTickNum: number) {
        // защита от перекрытых заборов
        if (this._isIdleCounter > 10) {
            this._isIdleCounter = 0;

            // ищем позиции ближайших врагов
            var nearEnemyCells = new Array<Cell>();
            let unitsIter = iterateOverUnitsInBox(createPoint(this.unit.Cell.X, this.unit.Cell.Y), 2);
            for (let u = unitsIter.next(); !u.done; u = unitsIter.next()) {
                var _unit = u.value;
                if (_unit.Owner.Uid == GlobalVars.teams[this.teamNum].teimurSettlementId) {
                    continue;
                }

                nearEnemyCells.push(new Cell(_unit.Cell.X, _unit.Cell.Y));
            }

            if (nearEnemyCells.length == 0) {
                return;
            }

            // если юнит умеет атаковать, то атакуем любое строение, иначе отходим назад
            if (this._canAttackBuilding) {
                this.GivePointCommand(nearEnemyCells[0], UnitCommand.Attack, AssignOrderMode.Queue);
            } else {
                var unitCell = new Cell(this.unit.Cell.X, this.unit.Cell.Y);
                var moveVec  = new Cell();
                for (var enemyCell of nearEnemyCells) {
                    moveVec.X += enemyCell.X - unitCell.X;
                    moveVec.Y += enemyCell.Y - unitCell.Y;
                }
                moveVec.X *= -10.0/nearEnemyCells.length;
                moveVec.Y *= -10.0/nearEnemyCells.length;
                
                this.GivePointCommand(new Cell(Math.round(unitCell.X + moveVec.X), Math.round(unitCell.Y + moveVec.Y)), UnitCommand.MoveToPoint, AssignOrderMode.Queue);
            }

            return;
        }

        var unitCell = new Cell(this.unit.Cell.X, this.unit.Cell.Y);

        // проверяем, что юнит ничего не делает
        if (!this.unit_ordersMind.IsIdle()) {
            if (this._unitPrevCell.X != unitCell.X || this._unitPrevCell.Y != unitCell.Y) {
                this._isIdleCounter = 0;
            }
            return;
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
                var generator = generateCellInSpiral(GlobalVars.teams[this.teamNum].towerCell.X, GlobalVars.teams[this.teamNum].towerCell.Y);
                for (goalPosition = generator.next(); !goalPosition.done; goalPosition = generator.next()) {
                    if (unitCanBePlacedByRealMap(this.unit.Cfg, goalPosition.value.X, goalPosition.value.Y)) {
                        break;
                    }
                }
            }
            this.GivePointCommand(goalPosition.value, UnitCommand.Attack, AssignOrderMode.Queue);
        //}
    }

    public static InitConfig() {
        IUnit.InitConfig.call(this);
        
        if (GlobalVars.configs[this.CfgUid].AllowedCommands.ContainsKey(UnitCommand.Capture)) {
            GlobalVars.configs[this.CfgUid].AllowedCommands.Remove(UnitCommand.Capture);
        }
        // убираем требования
        GlobalVars.configs[this.CfgUid].TechConfig.Requirements.Clear();
        // убираем производство людей
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "ProducedPeople", 0);
        // убираем налоги
        GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "SalarySlots", 0);
        // уменьшаем скорость в 2 раза
        // var tylesType = [
        //     TileType.Grass,
        //     TileType.Forest,
        //     TileType.Water,
        //     TileType.Marsh,
        //     TileType.Sand,
        //     TileType.Mounts,
        //     TileType.Road,
        //     TileType.Ice
        // ];
        // for (var tileNum = 0; tileNum < tylesType.length; tileNum++) {
        //     var newSpeed = GlobalVars.configs[this.CfgUid].Speeds.Item.get(tylesType[tileNum]);
        //     if (newSpeed > 2) {
        //         newSpeed = Math.floor(newSpeed / 2);
        //     } else if (newSpeed > 0) {
        //         newSpeed = 1;
        //     }
        //     GlobalVars.configs[this.CfgUid].Speeds.Item.set(tylesType[tileNum], newSpeed);
        // }

        // проверяем, может ли юнит атаковать здания
        if (GlobalVars.configs[this.CfgUid].MainArmament && GlobalVars.configs[this.CfgUid].MainArmament.BulletConfig.DisallowedTargets.HasFlag(UnitQueryFlag.Buildings)) {
            this.canAttackBuilding = false;
        }

        // технику делаем незахватываемой
        if (GlobalVars.configs[this.CfgUid].ProfessionParams.ContainsKey(UnitProfession.Capturable)) {
            GlobalVars.configs[this.CfgUid].ProfessionParams.Remove(UnitProfession.Capturable);
        }
    }

    public static GetSpawnCount(spawnCount: number) {
        if (this.MaxSpawnCount < 0) {
            return spawnCount;
        }

        if (spawnCount <= this.MaxSpawnCount) {
            // задаем количество здоровья
            GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", Math.floor(this.MaxHealthBase));
            // задаем урон
            GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament.ShotParams, "Damage", Math.floor(this.DamageBase));
        } else {
            var coeff = spawnCount / this.MaxSpawnCount;
            // задаем количество здоровья
            GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid], "MaxHealth", Math.floor(this.MaxHealthBase * coeff));
            // задаем урон
            GlobalVars.ScriptUtils.SetValue(GlobalVars.configs[this.CfgUid].MainArmament.ShotParams, "Damage", Math.floor(this.DamageBase * coeff));
        }

        return Math.min(spawnCount, this.MaxSpawnCount);
    }

    public OnDead(gameTickNum: number) {
        //GlobalVars.teams[this.teamNum].incomeGold += Math.floor(this.unit.Cfg.MaxHealth * (1.0 + 0.1*this.unit.Cfg.Shield));
    }
}
