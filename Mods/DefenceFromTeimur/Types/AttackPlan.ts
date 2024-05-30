import { log } from "library/common/logging";
import { Teimur_Swordmen, Teimur_Archer, Teimur_Heavymen, Teimur_Archer_2, Teimur_Raider, TeimurLegendaryUnitsClass, Teimur_Catapult, Teimur_Balista, Teimur_Mag_2, Teimur_Villur, Teimur_Olga, Teimur_Legendary_SWORDMEN, Teimur_Legendary_HEAVYMAN, Teimur_Legendary_ARCHER, Teimur_Legendary_ARCHER_2, Teimur_Legendary_RAIDER, Teimur_Legendary_WORKER } from "../Units/Teimur_units";
import { ITeimurUnit } from "./ITeimurUnit";
import { IUnit, RandomUnit } from "./IUnit";
import { GlobalVars } from "../GlobalData";

export class WaveUnit {
    unitClass: typeof ITeimurUnit;
    count: number;

    constructor (unitClass: typeof ITeimurUnit, count: number) {
        this.unitClass = unitClass;
        this.count  = count;
    }
}

export class Wave {
    message: string;
    gameTickNum: number;
    waveUnits: Array<WaveUnit>;

    constructor (message: string, gameTickNum: number, units: Array<WaveUnit>) {
        this.message     = message;
        this.gameTickNum = gameTickNum;
        this.waveUnits       = units;
    }
}

export class IAttackPlan {
    static Description : string = "";

    public waves: Array<Wave>;
    public waveNum: number;

    public constructor () {
        this.waves   = new Array<Wave>();
        this.waveNum = 0;
    }

    public IsEnd() {
        return this.waveNum >= this.waves.length;
    }
}

export class AttackPlan_1 extends IAttackPlan {
    static Description : string = "15 волн, 1-ая на 1-ой минуте, сбалансированная армия врага.";

    constructor () {
        super();

        const RandomLegendaryUnits = () => {
            var res = new Array<WaveUnit>();
            var count = Math.max(Math.floor((GlobalVars.difficult + 1) / 2), 1);
            for (var i = 0; i < count; i++) {
                res.push(new WaveUnit(RandomUnit(TeimurLegendaryUnitsClass), 1));
            }
            return res;
        };

        this.waves = [];
        this.waves.push(
            new Wave("ВОЛНА 1", 1 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 5*GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 2*GlobalVars.difficult)
            ]),
            new Wave("ВОЛНА 2", 3 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 10 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 4 * GlobalVars.difficult)
            ]),
            new Wave("ВОЛНА 3", 5 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 10 * GlobalVars.difficult),
                new WaveUnit(Teimur_Heavymen, 3 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 4 * GlobalVars.difficult)
            ]),
            new Wave("ВОЛНА 4", 8 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 15 * GlobalVars.difficult),
                new WaveUnit(Teimur_Heavymen, 5 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 3 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer_2, 2 * GlobalVars.difficult)
            ]),
            new Wave("БОСС ВОЛНА 5", 10 * 60 * 50, [
                new WaveUnit(Teimur_Raider, 5 * GlobalVars.difficult),
                new WaveUnit(RandomUnit(TeimurLegendaryUnitsClass), 1)
            ]),
            new Wave("ВОЛНА 6", 13.5 * 60 * 50, [
                new WaveUnit(RandomUnit([Teimur_Swordmen, Teimur_Heavymen, Teimur_Archer, Teimur_Archer_2]), 20 * GlobalVars.difficult)
            ]),
            new Wave("ВОЛНА 7", 15 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 10 * GlobalVars.difficult),
                new WaveUnit(Teimur_Heavymen, 10 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 4 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer_2, 6 * GlobalVars.difficult)
            ]),
            new Wave("", 15.3 * 60 * 50, [
                new WaveUnit(Teimur_Raider, 5 * GlobalVars.difficult)
            ]),
            new Wave("ВОЛНА 8", 18 * 60 * 50, [
                new WaveUnit(RandomUnit([Teimur_Swordmen, Teimur_Heavymen, Teimur_Archer, Teimur_Archer_2]), 25 * GlobalVars.difficult)
            ]),
            new Wave("", 18.3 * 60 * 50, [
                new WaveUnit(Teimur_Raider, 5 * GlobalVars.difficult)
            ]),
            new Wave("БОСС ВОЛНА 9", 20 * 60 * 50, [
                new WaveUnit(Teimur_Catapult, 8 * GlobalVars.difficult),
                new WaveUnit(Teimur_Balista, 8 * GlobalVars.difficult)
            ]),
            new Wave("ВОЛНА 10", 23 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 15 * GlobalVars.difficult),
                new WaveUnit(Teimur_Heavymen, 15 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 5 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer_2, 8 * GlobalVars.difficult),
                new WaveUnit(Teimur_Catapult, 2 * GlobalVars.difficult),
                new WaveUnit(Teimur_Balista, 2 * GlobalVars.difficult)
            ]),
            new Wave("", 23.3 * 60 * 50, [
                new WaveUnit(Teimur_Raider, 6 * GlobalVars.difficult),
                ... RandomLegendaryUnits()
            ]),
            new Wave("ВОЛНА 11", 26 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 20 * GlobalVars.difficult),
                new WaveUnit(Teimur_Heavymen, 16 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 8 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer_2, 10 * GlobalVars.difficult),
                new WaveUnit(Teimur_Catapult, Math.round(3 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Balista, Math.round(3 * Math.sqrt(GlobalVars.difficult)))
            ]),
            new Wave("", 26.3 * 60 * 50, [
                new WaveUnit(Teimur_Raider, 10 * GlobalVars.difficult),
                ... RandomLegendaryUnits()
            ]),
            new Wave("БОСС ВОЛНА 12", 30 * 60 * 50, [
                new WaveUnit(Teimur_Mag_2, 3 * GlobalVars.difficult),
                new WaveUnit(Teimur_Villur, 1 * GlobalVars.difficult),
                new WaveUnit(Teimur_Olga, 1 * GlobalVars.difficult),
                new WaveUnit(RandomUnit(TeimurLegendaryUnitsClass), 1),
                ... RandomLegendaryUnits()
            ]),
            new Wave("ВОЛНА 13", 32 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 20 * GlobalVars.difficult),
                new WaveUnit(Teimur_Heavymen, 20 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 10 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer_2, 10 * GlobalVars.difficult),
                new WaveUnit(Teimur_Catapult, Math.round(3 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Balista, Math.round(3 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Mag_2, Math.round(3 * Math.sqrt(GlobalVars.difficult))),
                ... RandomLegendaryUnits()
            ]),
            new Wave("ВОЛНА 14", 34 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 25 * GlobalVars.difficult),
                new WaveUnit(Teimur_Heavymen, 25 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 12 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer_2, 12 * GlobalVars.difficult),
                new WaveUnit(Teimur_Catapult, Math.round(3 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Balista, Math.round(3 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Mag_2, Math.round(1 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Villur, Math.round(1 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Olga, Math.round(1 * Math.sqrt(GlobalVars.difficult))),
                ... RandomLegendaryUnits()
            ]),
            new Wave("ФИНАЛЬНАЯ ВОЛНА 15", 36 * 60 * 50, [
                new WaveUnit(Teimur_Swordmen, 100 * GlobalVars.difficult),
                new WaveUnit(Teimur_Heavymen, 30 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer, 10 * GlobalVars.difficult),
                new WaveUnit(Teimur_Archer_2, 20 * GlobalVars.difficult),
                new WaveUnit(Teimur_Catapult, Math.round(6 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Balista, Math.round(6 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Mag_2, Math.round(1 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Villur, Math.round(1 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Olga, Math.round(1 * Math.sqrt(GlobalVars.difficult))),
                new WaveUnit(Teimur_Legendary_SWORDMEN, 1),
                new WaveUnit(Teimur_Legendary_HEAVYMAN, 1),
                new WaveUnit(Teimur_Legendary_ARCHER, 1),
                new WaveUnit(Teimur_Legendary_ARCHER_2, 1),
                new WaveUnit(Teimur_Legendary_RAIDER, 1),
                new WaveUnit(Teimur_Legendary_WORKER, 1)
            ]),
            new Wave("", 40 * 60 * 50, [])
        );
    }
}
export class AttackPlan_2 extends IAttackPlan {
    static Description : string = "Враги идут непрерывно начиная с 3-ой минуты, сбалансированная армия врага.";

    constructor () {
        super();

        const timeEnd = 40*60*50;

        var gameStartTick = 3 * 60 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 30 * 50) {
            var spawnCount = Math.round(GlobalVars.difficult * 12 * (timeEnd - gameTick) / (timeEnd - gameStartTick));
            var spawnClass = Teimur_Swordmen;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 7 * 60 * 50 + 10 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 30 * 50) {
            var spawnCount = Math.round(GlobalVars.difficult * (2 + 6 * (timeEnd - gameTick) / (timeEnd - gameStartTick)));
            var spawnClass = Teimur_Archer;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 10 * 60 * 50 + 20 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 30 * 50) {
            var spawnCount = Math.round(GlobalVars.difficult * (3 + 10 * (gameTick - gameStartTick) / (timeEnd - gameStartTick)));
            var spawnClass = Teimur_Heavymen;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 14 * 60 * 50 + 55 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 30 * 50) {
            var spawnCount = Math.round(GlobalVars.difficult * (2 + 5 * (gameTick - gameStartTick) / (timeEnd - gameStartTick)));
            var spawnClass = Teimur_Archer_2;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 16 * 60 * 50 + 20 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 45 * 50) {
            var spawnCount = GlobalVars.difficult;
            var spawnClass = Teimur_Raider;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 18 * 60 * 50 + 35 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 45 * 50) {
            var spawnCoeff = Math.round(1 * Math.sqrt(GlobalVars.difficult));
            var spawnCount = Math.round(spawnCoeff * (1 + 1 * (timeEnd - gameStartTick) / (timeEnd - gameStartTick)));
            var spawnClass = Teimur_Catapult;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 19 * 60 * 50 + 5 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 45 * 50) {
            var spawnCoeff = Math.round(1 * Math.sqrt(GlobalVars.difficult));
            var spawnCount = Math.round(spawnCoeff * (1 + 1 * (timeEnd - gameStartTick) / (timeEnd - gameStartTick)));
            var spawnClass = Teimur_Balista;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 25 * 60 * 50 + 15 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 50 * 50) {
            var spawnCount = Math.round(1 * Math.sqrt(GlobalVars.difficult));
            var spawnClass = Teimur_Mag_2;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 30 * 60 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 60 * 50) {
            var spawnCount = Math.floor(GlobalVars.difficult / 4);
            var spawnClass = Teimur_Villur;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 35 * 60 * 50 + 30 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 120 * 50) {
            var spawnCount = 1;
            var spawnClass = Teimur_Olga;
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(spawnClass, spawnCount) ]));
        }

        gameStartTick = 14 * 60 * 50;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 150 * 50) {
            var spawnCount = Math.max(Math.floor((GlobalVars.difficult + 1) / 2), 1);
            for (var i = 0; i < spawnCount; i++) {
                this.waves.push(new Wave("", gameTick, [ new WaveUnit(RandomUnit(TeimurLegendaryUnitsClass), 1) ]));
            }
        }

        // сортируем в порядке тиков
        this.waves.sort((a, b) => a.gameTickNum > b.gameTickNum ? 1 : -1);
    }
}
export class AttackPlan_3 extends IAttackPlan {
    static Description : string = "Враги идут непрерывно начиная с 1-ой минуты, в составе армии только рыцари.";

    constructor () {
        super();

        const timeEnd = 40*60*50;
        var gameStartTick = 1 * 60 * 50;
        var spawnCount = 5;
        for (var gameTick = gameStartTick; gameTick < timeEnd; gameTick += 15 * 50) {
            this.waves.push(new Wave("", gameTick, [ new WaveUnit(Teimur_Swordmen, Math.round(GlobalVars.difficult*spawnCount)) ]));
            spawnCount *= 1.05;
        }
    
        // сортируем в порядке тиков
        this.waves.sort((a, b) => a.gameTickNum > b.gameTickNum ? 1 : -1);
    }
}

export class AttackPlan_test extends IAttackPlan {
    static Description : string = "Тестовая волна";

    constructor () {
        super();

        var waveUnits = new Array<WaveUnit>(TeimurLegendaryUnitsClass.length);
        for (var i = 0; i < TeimurLegendaryUnitsClass.length; i++) {
            waveUnits[i] = new WaveUnit(TeimurLegendaryUnitsClass[i], 1);
        }

        this.waves = [];
        this.waves.push(
            new Wave("ТЕСТ", 0, waveUnits),
            new Wave("END", 40*60*50, [])
        );
    }
}

export const AttackPlansClass = [
    AttackPlan_1,
    AttackPlan_2,
    AttackPlan_3,
    AttackPlan_test
];
