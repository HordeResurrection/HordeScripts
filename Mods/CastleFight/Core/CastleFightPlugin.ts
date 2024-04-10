import HordePluginBase from "plugins/base-plugin";
import { BalanceFindingSystem } from "./BalanceFindingSystem";
import { WordClearSystem, IncomeSystem, SpawnBuildingSystem, AttackingAlongPathSystem, ReviveSystem, UpgradableBuildingSystem_Stage1, BuffSystem, UpgradableBuildingSystem_Stage2, UnitProducedSystem, DiplomacySystem, UpgradableBuildingSystem, BuffSystem_v2 } from "./ESC_systems";
import { Polygon, Point } from "./Utils";
import { GameState, World } from "./World";

export var world = new World();

export class CastleFightPlugin extends HordePluginBase {
    /**
     * Конструктор.
     */
    public constructor() {
        super("Битва замков");
    }

    public onFirstRun() {
    }

    public onEveryTick(gameTickNum: number) {
        switch (world.state) {
            case GameState.INIT:
                {
                    var settlementsCount: number;
                    var settlements_field: Array<Polygon>;
                    var settlements_workers_revivePositions: Array<Array<Point>>;
                    var settlements_castle_position: Array<Point>;
                    var settlements_attack_paths: Array<Array<Array<Point>>>;

                    var scenaName = ActiveScena.GetRealScena().ScenaName;
                    if (scenaName == "Битва замков - лесная тропа с мостами (3х3)") {
                        settlementsCount                    = 6;
                        settlements_field                   = [
                            new Polygon([new Point(0, 0), new Point(45, 0), new Point(45, 63), new Point(0, 63)]),
                            new Polygon([new Point(0, 0), new Point(45, 0), new Point(45, 63), new Point(0, 63)]),
                            new Polygon([new Point(0, 0), new Point(45, 0), new Point(45, 63), new Point(0, 63)]),
                            new Polygon([new Point(162, 0), new Point(207, 0), new Point(207, 63), new Point(162, 63)]),
                            new Polygon([new Point(162, 0), new Point(207, 0), new Point(207, 63), new Point(162, 63)]),
                            new Polygon([new Point(162, 0), new Point(207, 0), new Point(207, 63), new Point(162, 63)])
                        ];
                        settlements_workers_revivePositions = [
                            [new Point(0, 31)],
                            [new Point(0, 31)],
                            [new Point(0, 31)],
                            [new Point(207, 31)],
                            [new Point(207, 31)],
                            [new Point(207, 31)]];
                        settlements_castle_position         = [
                            new Point(21, 30),
                            new Point(21, 30),
                            new Point(21, 30),
                            new Point(182, 30),
                            new Point(182, 30),
                            new Point(182, 30)];
                        settlements_attack_paths            = [
                            [[new Point(182, 30)]],
                            [[new Point(182, 30)]],
                            [[new Point(182, 30)]],
                            [[new Point(21, 30)]],
                            [[new Point(21, 30)]],
                            [[new Point(21, 30)]]
                        ];
                    } else if (scenaName == "Битва замков - лесная тропа (3х3)") {
                        settlementsCount                    = 6;
                        settlements_field                   = [
                            new Polygon([new Point(0, 0), new Point(45, 0), new Point(45, 63), new Point(0, 63)]),
                            new Polygon([new Point(0, 0), new Point(45, 0), new Point(45, 63), new Point(0, 63)]),
                            new Polygon([new Point(0, 0), new Point(45, 0), new Point(45, 63), new Point(0, 63)]),
                            new Polygon([new Point(162, 0), new Point(207, 0), new Point(207, 63), new Point(162, 63)]),
                            new Polygon([new Point(162, 0), new Point(207, 0), new Point(207, 63), new Point(162, 63)]),
                            new Polygon([new Point(162, 0), new Point(207, 0), new Point(207, 63), new Point(162, 63)])
                        ];
                        settlements_workers_revivePositions = [
                            [new Point(0, 31)],
                            [new Point(0, 31)],
                            [new Point(0, 31)],
                            [new Point(207, 31)],
                            [new Point(207, 31)],
                            [new Point(207, 31)]];
                        settlements_castle_position         = [
                            new Point(21, 30),
                            new Point(21, 30),
                            new Point(21, 30),
                            new Point(182, 30),
                            new Point(182, 30),
                            new Point(182, 30)];
                        settlements_attack_paths            = [
                            [[new Point(182, 30)]],
                            [[new Point(182, 30)]],
                            [[new Point(182, 30)]],
                            [[new Point(21, 30)]],
                            [[new Point(21, 30)]],
                            [[new Point(21, 30)]]
                        ];
                    } else if (scenaName == "Битва замков - две тропы (3х3)") {
                        settlementsCount                    = 6;
                        settlements_field                   = [
                            new Polygon([new Point(0, 0), new Point(48, 0), new Point(48, 95), new Point(0, 95)]),
                            new Polygon([new Point(0, 0), new Point(48, 0), new Point(48, 95), new Point(0, 95)]),
                            new Polygon([new Point(0, 0), new Point(48, 0), new Point(48, 95), new Point(0, 95)]),
                            new Polygon([new Point(207, 0), new Point(255, 0), new Point(255, 95), new Point(207, 95)]),
                            new Polygon([new Point(207, 0), new Point(255, 0), new Point(255, 95), new Point(207, 95)]),
                            new Polygon([new Point(207, 0), new Point(255, 0), new Point(255, 95), new Point(207, 95)])
                        ];
                        settlements_workers_revivePositions = [
                            [new Point(0, 47)],
                            [new Point(0, 47)],
                            [new Point(0, 47)],
                            [new Point(255, 47)],
                            [new Point(255, 47)],
                            [new Point(255, 47)]];
                        settlements_castle_position         = [
                            new Point(44, 46),
                            new Point(44, 46),
                            new Point(44, 46),
                            new Point(207, 46),
                            new Point(207, 46),
                            new Point(207, 46)];
                        settlements_attack_paths            = [
                            [
                                [new Point(60, 12), new Point(76, 27), new Point(99, 27), new Point(115, 12), new Point(140, 12), new Point(155, 27), new Point(180, 27), new Point(195, 12), new Point(207, 46)],
                                [new Point(60, 83), new Point(76, 68), new Point(99, 68), new Point(115, 83), new Point(140, 83), new Point(155, 68), new Point(180, 68), new Point(195, 83), new Point(207, 46)]
                            ],
                            [
                                [new Point(60, 12), new Point(76, 27), new Point(99, 27), new Point(115, 12), new Point(140, 12), new Point(155, 27), new Point(180, 27), new Point(195, 12), new Point(207, 46)],
                                [new Point(60, 83), new Point(76, 68), new Point(99, 68), new Point(115, 83), new Point(140, 83), new Point(155, 68), new Point(180, 68), new Point(195, 83), new Point(207, 46)]
                            ],
                            [
                                [new Point(60, 12), new Point(76, 27), new Point(99, 27), new Point(115, 12), new Point(140, 12), new Point(155, 27), new Point(180, 27), new Point(195, 12), new Point(207, 46)],
                                [new Point(60, 83), new Point(76, 68), new Point(99, 68), new Point(115, 83), new Point(140, 83), new Point(155, 68), new Point(180, 68), new Point(195, 83), new Point(207, 46)]
                            ],
                            [
                                [new Point(44, 46), new Point(60, 12), new Point(76, 27), new Point(99, 27), new Point(115, 12), new Point(140, 12), new Point(155, 27), new Point(180, 27), new Point(195, 12)].reverse(),
                                [new Point(44, 46), new Point(60, 83), new Point(76, 68), new Point(99, 68), new Point(115, 83), new Point(140, 83), new Point(155, 68), new Point(180, 68), new Point(195, 83)].reverse()
                            ],
                            [
                                [new Point(44, 46), new Point(60, 12), new Point(76, 27), new Point(99, 27), new Point(115, 12), new Point(140, 12), new Point(155, 27), new Point(180, 27), new Point(195, 12)].reverse(),
                                [new Point(44, 46), new Point(60, 83), new Point(76, 68), new Point(99, 68), new Point(115, 83), new Point(140, 83), new Point(155, 68), new Point(180, 68), new Point(195, 83)].reverse()
                            ],
                            [
                                [new Point(44, 46), new Point(60, 12), new Point(76, 27), new Point(99, 27), new Point(115, 12), new Point(140, 12), new Point(155, 27), new Point(180, 27), new Point(195, 12)].reverse(),
                                [new Point(44, 46), new Point(60, 83), new Point(76, 68), new Point(99, 68), new Point(115, 83), new Point(140, 83), new Point(155, 68), new Point(180, 68), new Point(195, 83)].reverse()
                            ]
                        ];
                    } else if (scenaName == "Битва замков - царь горы (2x2x2)") {
                        settlementsCount                    = 6;
                        settlements_field                   = [
                            new Polygon([new Point(68, 147), new Point(122, 148), new Point(135, 177), new Point(95, 187), new Point(55, 177)].reverse()),
                            new Polygon([new Point(68, 147), new Point(122, 148), new Point(135, 177), new Point(95, 187), new Point(55, 177)].reverse()),
                            new Polygon([new Point(63, 91), new Point(3, 89), new Point(16, 19), new Point(44, 19), new Point(64, 46)].reverse()),
                            new Polygon([new Point(63, 91), new Point(3, 89), new Point(16, 19), new Point(44, 19), new Point(64, 46)].reverse()),
                            new Polygon([new Point(126, 44), new Point(145, 19), new Point(174, 49), new Point(186, 89), new Point(154, 92)].reverse()),
                            new Polygon([new Point(126, 44), new Point(145, 19), new Point(174, 49), new Point(186, 89), new Point(154, 92)].reverse())
                        ];
                        settlements_workers_revivePositions = [
                            [new Point(95, 185)],
                            [new Point(95, 185)],
                            [new Point(17, 50)],
                            [new Point(17, 50)],
                            [new Point(172, 50)],
                            [new Point(172, 50)]];
                        settlements_castle_position         = [
                            new Point(93, 155),
                            new Point(93, 155),
                            new Point(40, 62),
                            new Point(40, 62),
                            new Point(148, 63),
                            new Point(148, 63)];
                        settlements_attack_paths            = [
                            [[new Point(42, 63),  new Point(150, 64)],
                                [new Point(150, 64), new Point(42, 63)]],
                            [[new Point(42, 63),  new Point(150, 64)],
                                [new Point(150, 64), new Point(42, 63)]],

                            [[new Point(150, 64), new Point(95, 156)],
                                [new Point(95, 156), new Point(150, 64)]],
                            [[new Point(150, 64), new Point(95, 156)],
                                [new Point(95, 156), new Point(150, 64)]],

                            [[new Point(95, 156), new Point(42, 63)],
                                [new Point(42, 63),  new Point(95, 156)]],
                            [[new Point(95, 156), new Point(42, 63)],
                                [new Point(42, 63),  new Point(95, 156)]]
                        ];
                    } else if (scenaName == "Битва замков - царь горы (1x1x1x1)") {
                        settlementsCount                    = 4;
                        settlements_field                   = [
                            new Polygon([new Point(73, 0), new Point(120, 0), new Point(120, 45), new Point(73, 45)]),
                            new Polygon([new Point(148, 72), new Point(194, 72), new Point(194, 120), new Point(148, 120)]),
                            new Polygon([new Point(72, 148), new Point(120, 148), new Point(120, 194), new Point(72, 194)]),
                            new Polygon([new Point(0, 72), new Point(45, 72), new Point(45, 120), new Point(0, 120)])
                        ];
                        settlements_workers_revivePositions = [
                            [new Point(96, 0)],
                            [new Point(194, 96)],
                            [new Point(97, 194)],
                            [new Point(0, 96)]];
                        settlements_castle_position         = [
                            new Point(95, 19),
                            new Point(171, 95),
                            new Point(95, 171),
                            new Point(19, 95)];
                        settlements_attack_paths            = [
                            [[new Point(173, 97), new Point(97, 173), new Point(21, 97)],
                                [new Point(21, 97),  new Point(97, 173), new Point(173, 97)]],

                            [[new Point(97, 173), new Point(21, 97),  new Point(97, 21)],
                                [new Point(97, 21),  new Point(21, 97),  new Point(97, 173)]],

                            [[new Point(21, 97),  new Point(97, 21),  new Point(173, 97)],
                                [new Point(173, 97), new Point(97, 21),  new Point(21, 97)]],

                            [[new Point(97, 21),  new Point(173, 97), new Point(97, 173)],
                                [new Point(97, 173), new Point(173, 97), new Point(97, 21)]]
                        ];
                    } else if (scenaName == "Битва замков - союзник в тылу врага (2x2x2)") {
                        settlementsCount                    = 6;
                        settlements_field                   = [
                            new Polygon([new Point(0, 135), new Point(63, 135), new Point(63, 72), new Point(0, 72)].reverse()),
                            new Polygon([new Point(288, 135), new Point(351, 135), new Point(351, 72), new Point(288, 72)].reverse()),
                            new Polygon([new Point(72, 63), new Point(135, 63), new Point(135, 0), new Point(72, 0)].reverse()),
                            new Polygon([new Point(216, 207), new Point(279, 207), new Point(280, 144), new Point(216, 144)].reverse()),
                            new Polygon([new Point(216, 63), new Point(279, 63), new Point(279, 0), new Point(216, 0)].reverse()),
                            new Polygon([new Point(72, 207), new Point(135, 207), new Point(135, 144), new Point(72, 144)].reverse())
                        ];
                        settlements_workers_revivePositions = [
                            [new Point(1, 103)],
                            [new Point(350, 103)],
                            [new Point(103, 1)],
                            [new Point(247, 206)],
                            [new Point(247, 1)],
                            [new Point(103, 206)]];
                        settlements_castle_position         = [
                            new Point(30, 102),
                            new Point(318, 102),
                            new Point(102, 30),
                            new Point(246, 174),
                            new Point(246, 30),
                            new Point(102, 174)];
                        settlements_attack_paths            = [
                            [[new Point(32, 32), new Point(102, 30), new Point(246, 30), new Point(318, 102), new Point(246, 174), new Point(102, 174)],
                                [new Point(102, 30), new Point(246, 30), new Point(318, 102), new Point(246, 174), new Point(102, 174), new Point(32, 175)].reverse()],

                            [[new Point(319, 32), new Point(246, 30), new Point(102, 30), new Point(30, 102), new Point(102, 174), new Point(246, 174)],
                                [new Point(246, 30), new Point(102, 30), new Point(30, 102), new Point(102, 174), new Point(246, 174), new Point(319, 175)].reverse()],

                            [[new Point(175, 32), new Point(246, 30), new Point(318, 102), new Point(246, 174), new Point(102, 174), new Point(30, 102)],
                                [new Point(246, 30), new Point(318, 102), new Point(246, 174), new Point(102, 174), new Point(30, 102), new Point(32, 32)].reverse()],

                            [[new Point(176, 175), new Point(102, 174), new Point(30, 102), new Point(102, 30), new Point(246, 30), new Point(318, 102)],
                                [new Point(102, 174), new Point(30, 102), new Point(102, 30), new Point(246, 30), new Point(318, 102), new Point(319, 175)].reverse()],

                            [[new Point(319, 32), new Point(318, 102), new Point(246, 174), new Point(102, 174), new Point(30, 102), new Point(102, 30)],
                                [new Point(318, 102), new Point(246, 174), new Point(102, 174), new Point(30, 102), new Point(102, 30), new Point(176, 32)].reverse()],

                            [[new Point(32, 175), new Point(30, 102), new Point(102, 30), new Point(246, 30), new Point(318, 102), new Point(246, 174)],
                                [new Point(30, 102), new Point(102, 30), new Point(246, 30), new Point(318, 102), new Point(246, 174), new Point(175, 175)].reverse()]
                        ];
                    } else if (scenaName == "Битва замков - царь горы (2-6)") {
                        settlementsCount                    = 6;
                        settlements_field                   = [
                            new Polygon([new Point(156, 157), new Point(156, 162), new Point(140, 164), new Point(140, 155)]),
                            new Polygon([new Point(159, 151), new Point(159, 156), new Point(153, 156), new Point(144, 145), new Point(155, 139)]),
                            new Polygon([new Point(166, 156), new Point(160, 156), new Point(160, 151), new Point(164, 139), new Point(175, 145)]),
                            new Polygon([new Point(163, 157), new Point(179, 155), new Point(179, 164), new Point(163, 162)]),
                            new Polygon([new Point(160, 163), new Point(166, 163), new Point(175, 174), new Point(165, 180), new Point(160, 168)]),
                            new Polygon([new Point(153, 163), new Point(159, 163), new Point(159, 168), new Point(155, 180), new Point(144, 173)])
                        ];
                        settlements_workers_revivePositions = [
                            [new Point(74, 160)],
                            [new Point(118, 88)],
                            [new Point(203, 85)],
                            [new Point(244, 160)],
                            [new Point(201, 231)],
                            [new Point(118, 229)]];
                        settlements_castle_position         = [
                            new Point(151, 158),
                            new Point(154, 152),
                            new Point(161, 152),
                            new Point(164, 158),
                            new Point(161, 164),
                            new Point(154, 164)];
                        settlements_attack_paths            = [
                            [[new Point(159, 159), new Point(151, 160), new Point(154, 152), new Point(165, 152), new Point(168, 160), new Point(165, 167), new Point(154, 167)]],
                            [[new Point(159, 159), new Point(151, 160), new Point(154, 152), new Point(165, 152), new Point(168, 160), new Point(165, 167), new Point(154, 167)]],
                            [[new Point(159, 159), new Point(151, 160), new Point(154, 152), new Point(165, 152), new Point(168, 160), new Point(165, 167), new Point(154, 167)]],
                            [[new Point(159, 159), new Point(151, 160), new Point(154, 152), new Point(165, 152), new Point(168, 160), new Point(165, 167), new Point(154, 167)]],
                            [[new Point(159, 159), new Point(151, 160), new Point(154, 152), new Point(165, 152), new Point(168, 160), new Point(165, 167), new Point(154, 167)]],
                            [[new Point(159, 159), new Point(151, 160), new Point(154, 152), new Point(165, 152), new Point(168, 160), new Point(165, 167), new Point(154, 167)]]
                        ];

                        world.castle_health_coeff = 2.0/3.0*5.0;
                    } else if (scenaName == "Битва замков - тест баланса") {
                        settlementsCount = 2;
                        settlements_field                   = [
                            new Polygon([]),
                            new Polygon([])
                        ];
                        settlements_workers_revivePositions = [
                            [new Point(247, 0)],
                            [new Point(255, 0)]];
                        settlements_castle_position         = [
                            new Point(249, 0),
                            new Point(249, 4)];
                        settlements_attack_paths            = [
                            [[new Point(0, 0)]],
                            [[new Point(0, 0)]]
                        ];
                    } else {
                        return;
                    }

                    this.log.info("Скрипты для битвы замков активированы");

                    world.Init(
                        settlementsCount,
                        settlements_field,
                        settlements_workers_revivePositions,
                        settlements_castle_position,
                        settlements_attack_paths);

                    world.RegisterSystem(WordClearSystem, "WordClearSystem");
                    world.RegisterSystem(IncomeSystem, "IncomeSystem");
                    world.RegisterSystem(SpawnBuildingSystem, "SpawnBuildingSystem");
                    world.RegisterSystem(AttackingAlongPathSystem, "AttackingAlongPathSystem");
                    world.RegisterSystem(ReviveSystem, "ReviveSystem");
                    world.RegisterSystem(UpgradableBuildingSystem, "UpgradableBuildingSystem");
                    world.RegisterSystem(BuffSystem, "BuffSystem");
                    //world.RegisterSystem(HeroAltarSystem, "HeroAltarSystem");
                    world.RegisterSystem(UnitProducedSystem, "UnitProducedSystem");
                    world.RegisterSystem(DiplomacySystem, "CheckGameEndSystem");
                    if (scenaName == "Битва замков - тест баланса") {
                        world.RegisterSystem(BalanceFindingSystem, "BalanceFindingSystem");
                    }
                    world.state = GameState.PLAY;
                }
                break;
            case GameState.PLAY:
                world.RunSystems(gameTickNum);
                if (gameTickNum % 15000 == 0) {
                    world.PrintTimeStat();
                }
                break;
            case GameState.CLEAR:
                this.log.info("Очистка мира");
                WordClearSystem(world, gameTickNum);
                break;
            case GameState.END:
                break;
        };
    }
};
