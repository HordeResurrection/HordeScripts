import { GlobalVars } from "../GlobalData";
import { TeimurLegendaryUnitsClass, Teimur_Swordmen, Teimur_Archer, Teimur_Heavymen, Teimur_Archer_2, Teimur_Raider, Teimur_Catapult, Teimur_Balista, Teimur_Mag_2, Teimur_Villur, Teimur_Olga, Teimur_Legendary_SWORDMEN, Teimur_Legendary_HEAVYMAN, Teimur_Legendary_ARCHER, Teimur_Legendary_ARCHER_2, Teimur_Legendary_RAIDER, Teimur_Legendary_WORKER, Teimur_Legendary_HORSE, Teimur_Legendary_DARK_DRAIDER, Teimur_Legendary_FIRE_MAGE, Teimur_Legendary_GREED_HORSE, Teimur_Scorpion } from "./Teimur_units";
import { IAttackPlan, WaveUnit, Wave } from "../Types/IAttackPlan";
import { RandomUnit } from "../Types/IUnit";
import { IIncomePlan } from "../Types/IIncomePlan";
import { IncomePlan_1 } from "./IncomePlans";
import { ITeimurUnit } from "../Types/ITeimurUnit";
import { log } from "library/common/logging";

export class AttackPlan_1 extends IAttackPlan {
    static Description: string = "Кармические волны";
    static IncomePlanClass : typeof IIncomePlan = IncomePlan_1;

    constructor (endTick?: number) {
        super();
        this.waves = [];
        if (!endTick) {
            endTick = 50 * (50*60);
        }

        // тут можно оставить 12 всадников, так как всадники появляются примерно каждые 4 волны, 
        // и эти 12 всадников делают вызов игрокам
        var waveUnits = [
            // easy
            [
                new WaveUnit(Teimur_Swordmen, 10),
                new WaveUnit(Teimur_Archer,   10),
                new WaveUnit(Teimur_Raider,   4)
            ],
            // normal
            [
                new WaveUnit(Teimur_Heavymen, 7),
                new WaveUnit(Teimur_Catapult, 4),
                new WaveUnit(Teimur_Mag_2,    3.5),
                new WaveUnit(Teimur_Archer_2, 7),
                new WaveUnit(Teimur_Scorpion, 2)
            ],
            // hard
            [
                new WaveUnit(Teimur_Raider,   12),
                new WaveUnit(Teimur_Balista,  4),
                new WaveUnit(Teimur_Villur,   2),
                new WaveUnit(Teimur_Olga,     2),
                new WaveUnit(Teimur_Scorpion, 5)
            ]  
        ];

        var waveUnits_ProbabilityPerDifficult = new Array<number>(waveUnits.length);
        var waveUnits_ProbabilityPerUnit      = new Array<Array<number>>(waveUnits.length);
        for (var difficultNum = 0; difficultNum < waveUnits.length; difficultNum++) {
            if (difficultNum == 0) {
                waveUnits_ProbabilityPerDifficult[difficultNum] = 1.0;
            } else {
                waveUnits_ProbabilityPerDifficult[difficultNum] = 0.0;
            }

            waveUnits_ProbabilityPerUnit[difficultNum] = new Array<number>(waveUnits[difficultNum].length);
            for (var unitNum = 0; unitNum < waveUnits[difficultNum].length; unitNum++) {
                waveUnits_ProbabilityPerUnit[difficultNum][unitNum] = 1.0 / waveUnits[difficultNum].length;

                // test
                // var cfg = GlobalVars.configs[waveUnits[difficultNum][unitNum].unitClass.CfgUid];
                
                // var unitSpeed        = cfg.Speeds.Item(TileType.Grass);
                // var unitHp           = cfg.MaxHealth;
                // var unitShield       = cfg.Shield;
                // var unitDamage       = Math.max(cfg.MainArmament.ShotParams.Damage, 1);
                // var unitReloadTime   = cfg.ReloadTime;

                // var targetDistance   = 7*32;
                // var targetDamage     = 5;
                // var targetReloadTime = 25;

                // var dmg = ;
            }
        }

        var waveLegendaryUnits = [
            // easy
            [
                new WaveUnit(Teimur_Legendary_ARCHER,      1),
                new WaveUnit(Teimur_Legendary_WORKER,      1),
                new WaveUnit(Teimur_Legendary_GREED_HORSE, 1)
            ],
            // normal
            [
                new WaveUnit(Teimur_Legendary_HEAVYMAN,     1),
                new WaveUnit(Teimur_Legendary_ARCHER_2,     1),
                new WaveUnit(Teimur_Legendary_DARK_DRAIDER, 1)
            ],
            // hard
            [
                new WaveUnit(Teimur_Legendary_SWORDMEN,  1),
                new WaveUnit(Teimur_Legendary_RAIDER,    1),
                new WaveUnit(Teimur_Legendary_HORSE,     1),
                new WaveUnit(Teimur_Legendary_FIRE_MAGE, 1)
            ]
        ];

        var waveLegendaryUnits_ProbabilityPerDifficult = new Array<number>(waveLegendaryUnits.length);
        var waveLegendaryUnits_ProbabilityPerUnit      = new Array<Array<number>>(waveLegendaryUnits.length);
        for (var difficultNum = 0; difficultNum < waveLegendaryUnits.length; difficultNum++) {
            if (difficultNum == 0) {
                waveLegendaryUnits_ProbabilityPerDifficult[difficultNum] = 1.0;
            } else {
                waveLegendaryUnits_ProbabilityPerDifficult[difficultNum] = 0.0;
            }

            waveLegendaryUnits_ProbabilityPerUnit[difficultNum] = new Array<number>(waveLegendaryUnits[difficultNum].length);
            for (var unitNum = 0; unitNum < waveLegendaryUnits[difficultNum].length; unitNum++) {
                waveLegendaryUnits_ProbabilityPerUnit[difficultNum][unitNum] = 1.0 / waveLegendaryUnits[difficultNum].length;
            }
        }

        var difficult_waveTime = new Array<number>(3);
        difficult_waveTime[0] = 1.5*50*60;
        difficult_waveTime[1] = 2.0*50*60;
        difficult_waveTime[2] = 2.2*50*60;

        var difficult_unitsCountCoeffFunc = [
            (waveNum) => { return 1.0 + 0.25*(waveNum); },
            (waveNum) => { return 1.0 + 0.20*(waveNum); },
            (waveNum) => { return 1.0 + 0.15*(waveNum); }
        ];
        var difficult_legendaryUnitsCountCoeffFunc = [
            (waveNum) => { return 1.0 + 0.14*(waveNum); },
            (waveNum) => { return 1.0 + 0.14*(waveNum); },
            (waveNum) => { return 1.0 + 0.14*(waveNum); }
        ];

        var waveNum  = 0;
        var waveTime = 2.0*50*60;
        while (waveTime <= endTick) {
            // каждая 4-ая волна легендарная

            var isLegendaryWave              = (waveNum > 0 && waveNum % 4 == 0) || (waveTime >= 40.0*50*60);

            // определяем случайную сложность

            var wave_ProbabilityPerDifficult = isLegendaryWave ? waveLegendaryUnits_ProbabilityPerDifficult : waveUnits_ProbabilityPerDifficult;

            var randomNumber : number = GlobalVars.rnd.RandomNumber(0, 32766) * 0.00003051850947599719;
            var index        : number = 0;
            var accProb      : number = wave_ProbabilityPerDifficult[0];
            while (randomNumber > accProb && index < wave_ProbabilityPerDifficult.length) {
                index++;
                accProb += wave_ProbabilityPerDifficult[index];
            }

            // если номер волны <= 2, то не посылаем тяжелые волны
            var difficultNum : number =  Math.min(index, waveNum <= 2 ? 1 : index);

            // распределяем вероятности по другим сложностям

            for (var i = 0; i < wave_ProbabilityPerDifficult.length; i++) {
                if (i == difficultNum) {
                    continue;
                }
                wave_ProbabilityPerDifficult[i] += wave_ProbabilityPerDifficult[difficultNum] / (wave_ProbabilityPerDifficult.length - 1);
            }
            wave_ProbabilityPerDifficult[difficultNum] = 0.0;

            // определяем случайного юнита в сложности

            var wave_ProbabilityPerUnit = isLegendaryWave ? waveLegendaryUnits_ProbabilityPerUnit[difficultNum] : waveUnits_ProbabilityPerUnit[difficultNum];

            randomNumber = GlobalVars.rnd.RandomNumber(0, 32766) * 0.00003051850947599719;
            index        = 0;
            accProb      = wave_ProbabilityPerUnit[0];
            while (randomNumber > accProb && index < wave_ProbabilityPerUnit.length) {
                index++;
                accProb += wave_ProbabilityPerUnit[index];
            }

            var unitNum = index;

            // распределяем вероятности по другим юнитам

            for (var i = 0; i < wave_ProbabilityPerUnit.length; i++) {
                if (i == unitNum) {
                    continue;
                }
                wave_ProbabilityPerUnit[i] += wave_ProbabilityPerUnit[unitNum] / (wave_ProbabilityPerUnit.length - 1);
            }
            wave_ProbabilityPerUnit[unitNum] = 0.0;

            // генерируем волну

            var waveUnitsCountCoeff = isLegendaryWave ? difficult_legendaryUnitsCountCoeffFunc[difficultNum](waveNum) : difficult_unitsCountCoeffFunc[difficultNum](waveNum);

            var difficultName : string = "";
            switch (difficultNum) {
                case 0:
                    difficultName = "Легкая";
                    break;
                case 1:
                    difficultName = "Средняя";
                    break;
                case 2:
                    difficultName = "Сложная";
                    break;
            }
            this.waves.push(
                new Wave(difficultName + (isLegendaryWave ? " легендарная" : "") + " волна " + (waveNum + 1) + " - ", waveTime, [
                    new WaveUnit(
                        isLegendaryWave
                            ? waveLegendaryUnits[difficultNum][unitNum].unitClass
                            : waveUnits[difficultNum][unitNum].unitClass,
                        Math.max(Math.floor(isLegendaryWave
                                ? waveUnitsCountCoeff * waveLegendaryUnits[difficultNum][unitNum].count * (GlobalVars.difficult + 1) / 2
                                : waveUnitsCountCoeff * waveUnits[difficultNum][unitNum].count * GlobalVars.difficult)
                            , 1)
                    )
                ]
            ));

            log.info("waveNum = ", waveNum,
                " difficultNum = ", difficultNum,
                " unitNum = ", unitNum,
                " unitName = ", this.waves[waveNum].waveUnits[0].unitClass.CfgUid, " count = ", this.waves[waveNum].waveUnits[0].count);

            waveTime += difficult_waveTime[difficultNum];
            waveNum++;
        }

        // генерируем имена волнам
        this.AutoGenerateWaveNames();

        this.waves.push(
            new Wave("Конец", waveTime, [ ])
        );
    }
}

export class AttackPlan_2 extends AttackPlan_1 {
    static Description: string = "Бесконечные кармические волны";
    static IncomePlanClass : typeof IIncomePlan = IncomePlan_1;

    constructor () {
        super(300 * (50*60));
    }
}

export class AttackPlan_3 extends IAttackPlan {
    static Description: string = "Малые волны";
    static IncomePlanClass : typeof IIncomePlan = IncomePlan_1;
    
    constructor () {
        super();

        this.waves = [];

        // 1 - 5 волны, 2, 4, 6, 8, 10 минут
        for (var waveNum = 0; waveNum < 5; waveNum++) {
            var unitType = GlobalVars.rnd.RandomNumber(0, waveNum <= 1 ? 1 : 3);
            var waveStr  = "";
            var unitClass : any;
            var unitCount = 0;
            if (unitType == 0) {
                waveStr   = "Рыцари";
                unitClass = Teimur_Swordmen;
                unitCount = 10*GlobalVars.difficult;
            } else if (unitType == 1) {
                waveStr   = "Лучники";
                unitClass = Teimur_Archer;
                unitCount = 10*GlobalVars.difficult;
            } else if (unitType == 2) {
                waveStr   = "Тяжелые рыцари";
                unitClass = Teimur_Heavymen;
                unitCount = 7*GlobalVars.difficult;
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
                            Teimur_Legendary_HORSE]),
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
                unitCount = 4*GlobalVars.difficult;
            } else if (unitType == 2) {
                waveStr   = "Баллисты";
                unitClass = Teimur_Balista;
                unitCount = 4*GlobalVars.difficult;
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
                        Teimur_Legendary_DARK_DRAIDER,
                        Teimur_Legendary_FIRE_MAGE,
                        Teimur_Legendary_GREED_HORSE
                    ]),
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
                unitCount = 3.5*GlobalVars.difficult;
            } else if (unitType == 1) {
                waveStr   = "Виллуры";
                unitClass = Teimur_Villur;
                unitCount = 2.0*GlobalVars.difficult;
            } else if (unitType == 2) {
                waveStr   = "Ольги";
                unitClass = Teimur_Olga;
                unitCount = 2.0*GlobalVars.difficult;
            }
            unitCount = Math.round(unitCount * Math.sqrt(waveNum + 1));

            this.waves.push(
                new Wave("Волна " + (waveNum + 13) + ". " + waveStr, waveNum * 2 * 60 * 50 + 27 * 60 * 50, [
                    new WaveUnit(unitClass, unitCount)
                ])
            );
        }

        // 18 - всадники алчности
        
        this.waves.push(
            new Wave("Волна 18", 37 * 60 * 50, [
                new WaveUnit(RandomUnit<typeof ITeimurUnit>([
                    Teimur_Legendary_GREED_HORSE
                    ]), Math.max(Math.floor((GlobalVars.difficult + 1) / 2), 1))
            ])
        );

        // 19 - финал

        this.waves.push(
            new Wave("ФИНАЛЬНАЯ ВОЛНА 30", 40 * 60 * 50, [
                new WaveUnit(RandomUnit<typeof ITeimurUnit>([
                        Teimur_Legendary_ARCHER_2,
                        Teimur_Legendary_HEAVYMAN,
                        Teimur_Legendary_RAIDER,
                        Teimur_Legendary_DARK_DRAIDER,
                        Teimur_Legendary_FIRE_MAGE
                    ]), 5*GlobalVars.difficult)
            ])
        );

        // генерируем имена волнам
        this.AutoGenerateWaveNames();

        this.waves.push(
            new Wave("Конец", 46 * 60 * 50, [ ])
        );
    }
}

export class AttackPlan_4 extends IAttackPlan {
    static Description : string = "Большие волны";

    constructor () {
        super();

        const RandomLegendaryUnits = () => {
            var res = new Array<WaveUnit>();
            var count = Math.max(Math.floor((GlobalVars.difficult + 1) / 2), 1);
            for (var i = 0; i < count; i++) {
                res.push(new WaveUnit(RandomUnit(TeimurLegendaryUnitsClass) as typeof ITeimurUnit, 1));
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
                new WaveUnit(RandomUnit(TeimurLegendaryUnitsClass) as typeof ITeimurUnit, 1)
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
                new WaveUnit(RandomUnit(TeimurLegendaryUnitsClass) as typeof ITeimurUnit, 1),
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

export class AttackPlan_5 extends IAttackPlan {
    static Description : string = "Непрерывные волны";

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
                this.waves.push(new Wave("", gameTick, [ new WaveUnit(RandomUnit(TeimurLegendaryUnitsClass) as typeof ITeimurUnit, 1) ]));
            }
        }

        new Wave("Конец", timeEnd, [])

        // сортируем в порядке тиков
        this.waves.sort((a, b) => a.gameTickNum > b.gameTickNum ? 1 : -1);
    }
}

export class AttackPlan_6 extends IAttackPlan {
    static Description : string = "Непрерывные волны рыцарей";

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

export class AttackPlan_test extends IAttackPlan {
    static Description : string = "Тестовая волна";

    constructor () {
        super();

        var waveUnits = new Array<WaveUnit>();
        waveUnits.push(new WaveUnit(Teimur_Olga, 4));

        this.waves = [];
        this.waves.push(
            new Wave("ТЕСТ", 0, [new WaveUnit(Teimur_Legendary_RAIDER, 1)]),
            new Wave("END", 20*60*50, [])
        );
    }
}

export const AttackPlansClass = [
    AttackPlan_1,
    AttackPlan_2,
    AttackPlan_3,
    AttackPlan_4,
    AttackPlan_5,
    AttackPlan_6,
    AttackPlan_test
];
