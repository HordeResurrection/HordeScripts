import { Cell } from "../Utils";
import { IComponent, COMPONENT_TYPE } from "./IComponent";

export class AttackingAlongPathComponent extends IComponent {
    /** номер выбранного пути атаки */
    selectedAttackPathNum: number;
    /** путь атаки */
    attackPath: Array<Cell>;
    /** номер точки в которую нужно сейчас идти */
    currentPathPointNum: number;

    public constructor(selectedAttackPathNum?: number, attackPath?: Array<Cell>, currentPathPointNum?: number) {
        super(COMPONENT_TYPE.ATTACKING_ALONG_PATH_COMPONENT);

        this.selectedAttackPathNum = selectedAttackPathNum ?? 0;
        if (attackPath) {
            this.attackPath = attackPath;
        }
        this.currentPathPointNum = currentPathPointNum ?? 0;
    }

    public Clone(): AttackingAlongPathComponent {
        return new AttackingAlongPathComponent(this.selectedAttackPathNum, this.attackPath, this.currentPathPointNum);
    }
}