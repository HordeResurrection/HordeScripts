import { GlobalVars } from "../GlobalData";
import { TeimurLegendaryUnitsClass, Teimur_Swordmen, Teimur_Archer, Teimur_Heavymen, Teimur_Archer_2, Teimur_Raider, Teimur_Catapult, Teimur_Balista, Teimur_Mag_2, Teimur_Villur, Teimur_Olga, Teimur_Legendary_SWORDMEN, Teimur_Legendary_HEAVYMAN, Teimur_Legendary_ARCHER, Teimur_Legendary_ARCHER_2, Teimur_Legendary_RAIDER, Teimur_Legendary_WORKER, Teimur_Legendary_HORSE, Teimur_Legendary_DARK_DRAIDER, Teimur_Legendary_FIRE_MAGE } from "./Teimur_units";
import { IAttackPlan, WaveUnit, Wave } from "../Types/IAttackPlan";
import { IUnit, RandomUnit } from "../Types/IUnit";
import { IIncomePlan } from "../Types/IIncomePlan";
import { IncomePlan_1 } from "./IncomePlans";
import { ITeimurUnit } from "../Types/ITeimurUnit";

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
            new Wave("Конец", 40 * 60 * 50, [])
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

        new Wave("Конец", timeEnd, [])

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

        new Wave("Конец", timeEnd, [])
    
        // сортируем в порядке тиков
        this.waves.sort((a, b) => a.gameTickNum > b.gameTickNum ? 1 : -1);
    }
}
export class AttackPlan_4 extends IAttackPlan {
    static Description: string = "Битва малых масштабов. Первая волна на 2-ой минуте.";
    static IncomePlanClass : typeof IIncomePlan = IncomePlan_1;
    
    constructor () {
        super();

        this.waves = [];

        // 1 - 5 волны, 2, 4, 6, 8, 10 минут
        for (var waveNum = 0; waveNum < 5; waveNum++) {
            var unitType = GlobalVars.rnd.RandomNumber(0, waveNum < 2 ? 2 : 3);
            var waveStr  = "";
            var unitClass : any;
            var unitCount = 0;
            if (unitType == 0) {
                waveStr   = "Рыцари";
                unitClass = Teimur_Swordmen;
                unitCount = 10*GlobalVars.difficult;
            } else if (unitType == 1) {
                waveStr   = "Тяжелые рыцари";
                unitClass = Teimur_Heavymen;
                unitCount = 7*GlobalVars.difficult;
            } else if (unitType == 2) {
                waveStr   = "Лучники";
                unitClass = Teimur_Archer;
                unitCount = 10*GlobalVars.difficult;
            } else if (unitType == 3) {
                waveStr   = "Поджигатели";
                unitClass = Teimur_Archer_2;
                unitCount = 7*GlobalVars.difficult;
            }
            unitCount = Math.round(unitCount * Math.sqrt(waveNum + 1));

            this.waves.push(
                new Wave("Волна " + (waveNum + 1) + ". " + waveStr, (waveNum + 1) * 2 * 60 * 50, [
                    new WaveUnit(unitClass, unitCount)
                ])
            );
        }

        this.waves.push(
            new Wave("БОСС ВОЛНА 6", 12 * 60 * 50, [
                new WaveUnit(
                    RandomUnit<typeof ITeimurUnit>([
                            Teimur_Legendary_WORKER,
                            Teimur_Legendary_ARCHER,
                            Teimur_Legendary_HORSE,
                            Teimur_Legendary_DARK_DRAIDER]),
                        Math.max(Math.floor((GlobalVars.difficult + 1) / 2), 1))
            ])
        );
        
        // 7 - 11 волны, 15, 17, 19, 21, 23 минут
        for (var waveNum = 0; waveNum < 5; waveNum++) {
            var unitType = GlobalVars.rnd.RandomNumber(0, 2);
            var waveStr  = "";
            var unitClass : any;
            var unitCount = 0;
            if (unitType == 0) {
                waveStr   = "Всадники";
                unitClass = Teimur_Raider;
                unitCount = 12*GlobalVars.difficult;
            } else if (unitType == 1) {
                waveStr   = "Катапульты";
                unitClass = Teimur_Catapult;
                unitCount = 3*GlobalVars.difficult;
            } else if (unitType == 2) {
                waveStr   = "Баллисты";
                unitClass = Teimur_Balista;
                unitCount = 3*GlobalVars.difficult;
            }
            unitCount = Math.round(unitCount * Math.sqrt(waveNum + 1));

            this.waves.push(
                new Wave("Волна " + (waveNum + 7) + ". " + waveStr, waveNum * 2 * 60 * 50 + 15 * 60 * 50, [
                    new WaveUnit(unitClass, unitCount)
                ])
            );
        }

        this.waves.push(
            new Wave("БОСС ВОЛНА 12", 25 * 60 * 50, [
                new WaveUnit(RandomUnit<typeof ITeimurUnit>([
                        Teimur_Legendary_SWORDMEN,
                        Teimur_Legendary_ARCHER_2,
                        Teimur_Legendary_HEAVYMAN,
                        Teimur_Legendary_RAIDER,
                        Teimur_Legendary_HORSE,
                        Teimur_Legendary_DARK_DRAIDER]),
                    Math.max(Math.floor((GlobalVars.difficult + 1) / 2), 1))
            ])
        );

        // 13 - 17 волны, 27, 29, 31, 33, 35 минут
        for (var waveNum = 0; waveNum < 5; waveNum++) {
            var unitType = GlobalVars.rnd.RandomNumber(0, 2);
            var waveStr  = "";
            var unitClass : any;
            var unitCount = 0;
            if (unitType == 0) {
                waveStr   = "Фантомы";
                unitClass = Teimur_Mag_2;
                unitCount = 3*GlobalVars.difficult;
            } else if (unitType == 1) {
                waveStr   = "Виллуры";
                unitClass = Teimur_Villur;
                unitCount = 1.5*GlobalVars.difficult;
            } else if (unitType == 2) {
                waveStr   = "Ольги";
                unitClass = Teimur_Olga;
                unitCount = 1.5*GlobalVars.difficult;
            }
            unitCount = Math.round(unitCount * Math.sqrt(waveNum + 1));

            this.waves.push(
                new Wave("Волна " + (waveNum + 13) + ". " + waveStr, waveNum * 2 * 60 * 50 + 27 * 60 * 50, [
                    new WaveUnit(unitClass, unitCount)
                ])
            );
        }

        this.waves.push(
            new Wave("БОСС ВОЛНА 18", 37 * 60 * 50, [
                new WaveUnit(RandomUnit<typeof ITeimurUnit>([
                        Teimur_Legendary_ARCHER_2,
                        Teimur_Legendary_HEAVYMAN,
                        Teimur_Legendary_RAIDER,
                        Teimur_Legendary_HORSE,
                        Teimur_Legendary_DARK_DRAIDER]),
                    7*Math.max(Math.floor((GlobalVars.difficult + 1) / 2), 1))
            ])
        );

        // генерируем имена волнам
        this.AutoGenerateWaveNames();

        this.waves.push(
            new Wave("Конец", 42 * 60 * 50, [ ])
        );
    }
}

export class AttackPlan_test extends IAttackPlan {
    static Description : string = "Тестовая волна";

    constructor () {
        super();

        var waveUnits = new Array<WaveUnit>();
        waveUnits.push(new WaveUnit(Teimur_Legendary_HORSE, 1));

        this.waves = [];
        this.waves.push(
            new Wave("ТЕСТ", 0, waveUnits),
            new Wave("END", 20*60*50, [])
        );
    }
}

export const AttackPlansClass = [
    AttackPlan_1,
    AttackPlan_2,
    AttackPlan_3,
    AttackPlan_4,
    AttackPlan_test
];
