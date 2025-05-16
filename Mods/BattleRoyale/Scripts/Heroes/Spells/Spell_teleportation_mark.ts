import { generateCellInSpiral } from "library/common/position-tools";
import { Cell } from "../../Core/Cell";
import { IHero } from "../IHero";
import { ISpell, SpellState } from "./ISpell";
import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { createPoint, HordeColor } from "library/common/primitives";
import { spawnDecoration } from "library/game-logic/decoration-spawn";
import { Stride_Color, UnitCommandConfig } from "library/game-logic/horde-types";

export class Spell_teleportation_mark extends ISpell {
    protected static _CfgUid                : string = "Hero_Teleportation_mark";
    protected static _AnimationsCatalogRef  : string = "#AnimCatalog_Command_teleportation_mark";
    protected static _EffectStrideColor     : Stride_Color = new Stride_Color(122, 161, 233, 255);
    protected static _EffectHordeColor      : HordeColor = new HordeColor(255, 122, 161, 233);
    protected static _Name                  : string = "Телепортационная метка";
    protected static _Description           : string = "При первои использовании устанавливает метку. При повторном герой телепортируется в установленную метку.";

    private _mark : Cell;

    constructor (cell: Cell) {
        super(cell);

        this._charges = 2;
    }

    protected _OnEveryTickActivated(gameTickNum: number): boolean {
        super._OnEveryTickActivated(gameTickNum);

        var hero : IHero = this._hero as IHero;

        // первая активация
        if (this._charges == 2) {
            this._mark = Cell.ConvertHordePoint(hero.hordeUnit.Cell);
        }
        // вторая активация
        else {
            // выбираем свободную клетку
            var generator = generateCellInSpiral(this._mark.X, this._mark.Y);
            for (let position = generator.next(); !position.done; position = generator.next()) {
                var tpCell = createPoint(position.value.X, position.value.Y);

                if (unitCanBePlacedByRealMap(hero.hordeConfig, tpCell.X, tpCell.Y) && hero.hordeUnit.MapMind.CheckPathTo(tpCell, false).Found) {
                    hero.hordeUnit.MapMind.TeleportToCell(tpCell);
                    spawnDecoration(
                        ActiveScena.GetRealScena(),
                        HordeContentApi.GetVisualEffectConfig("#VisualEffectConfig_LittleDust"),
                        Cell.ConvertHordePoint(tpCell).Scale(32).Add(new Cell(16, 16)).ToHordePoint());
                    break;
                }
            }
        }

        return false;
    }
}
