import { IComponent, COMPONENT_TYPE } from "./IComponent";

export class SpawnEvent extends IComponent {
    /** ид конфига юнита */
    spawnUnitConfigUid: string;
    /** такт с которого нужно спавнить юнитов */
    spawnTact: number;
    /** количество юнитов, которые спавнятся */
    spawnCount: number = 1;
    
    constructor(spawnUnitConfigUid: string, spawnTact: number, spawnCount: number) {
        super(COMPONENT_TYPE.SPAWN_EVENT);

        this.spawnUnitConfigUid = spawnUnitConfigUid;
        this.spawnTact          = spawnTact;
        this.spawnCount         = spawnCount;
    }

    public Clone() : SpawnEvent {
        return new SpawnEvent(this.spawnUnitConfigUid, this.spawnTact, this.spawnCount);
    }
}