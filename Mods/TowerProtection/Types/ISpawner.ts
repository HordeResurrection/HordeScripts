import { UnitDirection } from "library/game-logic/horde-types";
import { GlobalVars } from "../GlobalData";
import { spawnUnits } from "../Utils";
import { Cell } from "./Geometry";
import { WaveUnit, Wave } from "./IAttackPlan";

export abstract class ISpawner {
    name: string;
    teamNum: number;
    queue: Array<WaveUnit>;
    waveNum: number;

    constructor (name: string, teamNum: number) {
        this.name    = name;
        this.teamNum = teamNum;
        this.queue   = new Array<WaveUnit>();
        this.waveNum = 0;
    }

    public Generator() : any {
        return {
            next: function() {
              return { value: new Cell(), done: true };
            }
        };
    }

    public SpawnWave(wave: Wave) {
        // оповещение в чат
        //let msg2 = createGameMessageWithSound(wave.message, createHordeColor(255, 140, 140, 140));
        //GlobalVars.teams[this.teamNum].settlement.Messages.AddMessage(msg2);

        // добавляем в очередь на спавн юнитов
        for (var i = 0; i < wave.waveUnits.length; i++) {
            if (wave.waveUnits[i].count == 0) {
                continue;
            }

            this.queue.push(new WaveUnit(wave.waveUnits[i].unitClass, wave.waveUnits[i].unitClass.GetSpawnCount(wave.waveUnits[i].count)));
        }
    }

    public SpawnUnit(waveUnit: WaveUnit) {
        if (waveUnit.count == 0) {
            return;
        }

        this.queue.push(new WaveUnit(waveUnit.unitClass, waveUnit.count));
    }

    public OnEveryTick (gameTickNum: number) {
        // переходим к следующей волне по времени
        if (this.waveNum < GlobalVars.attackPlan.waves.length && GlobalVars.attackPlan.waves[this.waveNum].gameTickNum < gameTickNum) {
            this.SpawnWave(GlobalVars.attackPlan.waves[this.waveNum++]);
        }

        // переходим к следующей волне как только умерли враги
        // if (this.waveNum == 0 && GlobalVars.attackPlan.waves[this.waveNum].gameTickNum < gameTickNum) {
        //     this.SpawnWave(GlobalVars.attackPlan.waves[this.waveNum++]);
        // } else if (0 < this.waveNum && this.waveNum < GlobalVars.attackPlan.waves.length) {
        //     // если враги умерли, то переходим к следующей волне
        //     var hasEnemy = false;
        //     for (var unitNum = 0; unitNum < GlobalVars.units.length; unitNum++) {
        //         if (GlobalVars.units[unitNum].unit.Id != GlobalVars.teams[this.teamNum].tower.unit.Id && GlobalVars.units[unitNum].teamNum == this.teamNum) {
        //             hasEnemy = true;
        //             break;
        //         }
        //     }

        //     if (!hasEnemy) {
        //         this.SpawnWave(GlobalVars.attackPlan.waves[this.waveNum++]);
        //     }
        // }

        // спавним врагов
        if (this.queue.length > 0) {
            var generator = this.Generator();

            for (var i = 0; i < this.queue.length; i++) {
                var spawnedUnits = spawnUnits(GlobalVars.teams[this.teamNum].teimurSettlement,
                    GlobalVars.configs[this.queue[i].unitClass.CfgUid],
                    this.queue[i].count,
                    UnitDirection.Down,
                    generator);

                for (var spawnedUnit of spawnedUnits) {
                    GlobalVars.units.push(new this.queue[i].unitClass(spawnedUnit, this.teamNum));
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
}
