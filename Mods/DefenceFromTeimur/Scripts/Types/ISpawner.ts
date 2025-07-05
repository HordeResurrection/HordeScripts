import { Cell } from "./Geometry";
import { GlobalVars } from "../GlobalData";
import { createGameMessageWithSound } from "library/common/messages";
import { createHordeColor } from "library/common/primitives";
import { UnitDirection } from "library/game-logic/horde-types";
import { WaveUnit, Wave } from "./IAttackPlan";
import { spawnUnits } from "library/game-logic/unit-spawn";

export abstract class ISpawner {
    name: string;
    teamNum: number;
    queue: Array<WaveUnit>;

    constructor (name: string, teamNum: number) {
        this.name    = name;
        this.teamNum = teamNum;

        this.queue = new Array<WaveUnit>();
    }
 
    public Generator() : any {
        return {
            next: function() {
              return { value: new Cell(0 ,0), done: true };
            }
        };
    }

    public SpawnWave(wave: Wave) {
        for (var i = 0; i < wave.waveUnits.length; i++) {
            if (wave.waveUnits[i].count == 0) {
                continue;
            }

            this.queue.push(new WaveUnit(wave.waveUnits[i].unitClass, wave.waveUnits[i].unitClass.GetSpawnCount(wave.waveUnits[i].count), wave.waveUnits[i].modificator));
        }
    }

    public SpawnUnit(waveUnit: WaveUnit) {
        if (waveUnit.count == 0) {
            return;
        }

        this.queue.push(new WaveUnit(waveUnit.unitClass, waveUnit.count, waveUnit.modificator));
    }

    public OnEveryTick (gameTickNum: number) {
        var generator = this.Generator();

        for (var i = 0; i < this.queue.length; i++) {
            var modificator  = this.queue[i].modificator;
            var spawnedCfg   = this.queue[i].unitClass.GetConfigWithModificator(modificator);
            var spawnedUnits = spawnUnits(GlobalVars.teams[this.teamNum].teimurSettlement,
                spawnedCfg,
                this.queue[i].count,
                UnitDirection.Down,
                generator);

            for (var spawnedUnit of spawnedUnits) {
                GlobalVars.units.push(new this.queue[i].unitClass(spawnedUnit, this.teamNum));
            }

            if (spawnedUnits.length > 0 && this.queue[i].unitClass.IsLegendaryUnit()) {
                for (var settlement of GlobalVars.teams[this.teamNum].settlements) {
                    let msg1 = createGameMessageWithSound("Замечен " + spawnedCfg.Name, createHordeColor(255, 255, 165, 10));
                    settlement.Messages.AddMessage(msg1);
                    let msg2 = createGameMessageWithSound(spawnedCfg.Description, createHordeColor(255, 200, 130, 10));
                    settlement.Messages.AddMessage(msg2);
                }
            }

            if (spawnedUnits.length < this.queue[i].count) {
                this.queue[i].count -= spawnedUnits.length;
                return;
            } else {
                this.queue.splice(i--, 1);
            }
        }
    }
}
