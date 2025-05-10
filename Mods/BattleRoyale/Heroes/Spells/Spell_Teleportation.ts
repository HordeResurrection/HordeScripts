import { generateCellInSpiral } from "library/common/position-tools";
import { Cell } from "../../Core/Cell";
import { IHero } from "../IHero";
import { ISpell, SpellState } from "./ISpell";
import { unitCanBePlacedByRealMap } from "library/game-logic/unit-and-map";
import { createPoint } from "library/common/primitives";
import { spawnDecoration } from "library/game-logic/decoration-spawn";

export class Spell_Teleportation extends ISpell {
    private static _MaxDistance : number = 6;

    protected _name        : string = "Телепортация";
    protected _description : string = "Телепортация героя в достижимую клетку, максимальное расстояние "
        + Spell_Teleportation._MaxDistance + " клеток.";

    public OnEveryTick(gameTickNum: number): boolean {
        if (!ISpell.prototype.OnEveryTick.call(this, gameTickNum)) {
            return false;
        }

        if (this._state == SpellState.ACTIVATED) {
            var hero     = this._hero as IHero;
            var heroCell = Cell.ConvertHordePoint(hero.hordeUnit.Cell);
            var moveVec  = this._targetCell.Minus(heroCell);
            var distance = moveVec.Length_Chebyshev();
    
            // максимальная дистанция телепорта
            if (distance > Spell_Teleportation._MaxDistance) {
                moveVec = moveVec.Scale(Spell_Teleportation._MaxDistance / distance).Round();
            }

            var targetCell = heroCell.Add(moveVec);
    
            // выбираем свободную клетку
            var generator = generateCellInSpiral(targetCell.X, targetCell.Y);
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

            this._state = SpellState.END;
        }

        return true;
    }
}
