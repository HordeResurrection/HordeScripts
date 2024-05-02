import HordePluginBase from "plugins/base-plugin";
import { BalanceFindingSystem } from "./BalanceFindingSystem";
import { WordClearSystem, IncomeSystem, SpawnBuildingSystem, AttackingAlongPathSystem, ReviveSystem, UpgradableBuildingSystem_Stage1, BuffSystem, UpgradableBuildingSystem_Stage2, UnitProducedSystem, DiplomacySystem, UpgradableBuildingSystem, BuffSystem_v2, AttackingAlongPathSystem2 } from "./ESC_systems";
import { Polygon, Cell, MetricType } from "./Utils";
import { AttackPathChoiser_NearDistance, AttackPathChoiser_Periodically, AttackPathChoiser_Periodically_WithCondCell, GameState, IAttackPathChoiser, World } from "./World";

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
                    var scenaName = ActiveScena.GetRealScena().ScenaName;
                    if (scenaName == "Битва замков - лесная тропа с мостами (3х3)") {
                        world.settlementsCount                    = 6;
                        world.settlements_field                   = [
                            new Polygon([new Cell(0, 0), new Cell(45, 0), new Cell(45, 63), new Cell(0, 63)]),
                            new Polygon([new Cell(0, 0), new Cell(45, 0), new Cell(45, 63), new Cell(0, 63)]),
                            new Polygon([new Cell(0, 0), new Cell(45, 0), new Cell(45, 63), new Cell(0, 63)]),
                            new Polygon([new Cell(162, 0), new Cell(207, 0), new Cell(207, 63), new Cell(162, 63)]),
                            new Polygon([new Cell(162, 0), new Cell(207, 0), new Cell(207, 63), new Cell(162, 63)]),
                            new Polygon([new Cell(162, 0), new Cell(207, 0), new Cell(207, 63), new Cell(162, 63)])
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(0, 31)],
                            [new Cell(0, 31)],
                            [new Cell(0, 31)],
                            [new Cell(207, 31)],
                            [new Cell(207, 31)],
                            [new Cell(207, 31)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(21, 30),
                            new Cell(21, 30),
                            new Cell(21, 30),
                            new Cell(182, 30),
                            new Cell(182, 30),
                            new Cell(182, 30)
                        ];
                        world.settlements_attack_paths            = [
                            [[new Cell(182, 30)]],
                            [[new Cell(182, 30)]],
                            [[new Cell(182, 30)]],
                            [[new Cell(21, 30)]],
                            [[new Cell(21, 30)]],
                            [[new Cell(21, 30)]]
                        ];
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_NearDistance();
                        }
                    } else if (scenaName == "Битва замков - лесная тропа (3х3)") {
                        world.settlementsCount                    = 6;
                        world.settlements_field                   = [
                            new Polygon([new Cell(0, 0), new Cell(45, 0), new Cell(45, 63), new Cell(0, 63)]),
                            new Polygon([new Cell(0, 0), new Cell(45, 0), new Cell(45, 63), new Cell(0, 63)]),
                            new Polygon([new Cell(0, 0), new Cell(45, 0), new Cell(45, 63), new Cell(0, 63)]),
                            new Polygon([new Cell(162, 0), new Cell(207, 0), new Cell(207, 63), new Cell(162, 63)]),
                            new Polygon([new Cell(162, 0), new Cell(207, 0), new Cell(207, 63), new Cell(162, 63)]),
                            new Polygon([new Cell(162, 0), new Cell(207, 0), new Cell(207, 63), new Cell(162, 63)])
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(0, 31)],
                            [new Cell(0, 31)],
                            [new Cell(0, 31)],
                            [new Cell(207, 31)],
                            [new Cell(207, 31)],
                            [new Cell(207, 31)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(21, 30),
                            new Cell(21, 30),
                            new Cell(21, 30),
                            new Cell(182, 30),
                            new Cell(182, 30),
                            new Cell(182, 30)
                        ];
                        world.settlements_attack_paths            = [
                            [[new Cell(182, 30)]],
                            [[new Cell(182, 30)]],
                            [[new Cell(182, 30)]],
                            [[new Cell(21, 30)]],
                            [[new Cell(21, 30)]],
                            [[new Cell(21, 30)]]
                        ];
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_NearDistance();
                        }
                    } else if (scenaName == "Битва замков - две тропы (3х3)") {
                        world.settlementsCount                    = 6;
                        world.settlements_field                   = [
                            new Polygon([new Cell(0, 0), new Cell(48, 0), new Cell(48, 95), new Cell(0, 95)]),
                            new Polygon([new Cell(0, 0), new Cell(48, 0), new Cell(48, 95), new Cell(0, 95)]),
                            new Polygon([new Cell(0, 0), new Cell(48, 0), new Cell(48, 95), new Cell(0, 95)]),
                            new Polygon([new Cell(207, 0), new Cell(255, 0), new Cell(255, 95), new Cell(207, 95)]),
                            new Polygon([new Cell(207, 0), new Cell(255, 0), new Cell(255, 95), new Cell(207, 95)]),
                            new Polygon([new Cell(207, 0), new Cell(255, 0), new Cell(255, 95), new Cell(207, 95)])
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(0, 47)],
                            [new Cell(0, 47)],
                            [new Cell(0, 47)],
                            [new Cell(255, 47)],
                            [new Cell(255, 47)],
                            [new Cell(255, 47)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(44, 46),
                            new Cell(44, 46),
                            new Cell(44, 46),
                            new Cell(207, 46),
                            new Cell(207, 46),
                            new Cell(207, 46)
                        ];
                        world.settlements_attack_paths            = [
                            [
                                [new Cell(60, 12), new Cell(76, 27), new Cell(99, 27), new Cell(115, 12), new Cell(140, 12), new Cell(155, 27), new Cell(180, 27), new Cell(195, 12), new Cell(207, 46)],
                                [new Cell(60, 83), new Cell(76, 68), new Cell(99, 68), new Cell(115, 83), new Cell(140, 83), new Cell(155, 68), new Cell(180, 68), new Cell(195, 83), new Cell(207, 46)]
                            ],
                            [
                                [new Cell(60, 12), new Cell(76, 27), new Cell(99, 27), new Cell(115, 12), new Cell(140, 12), new Cell(155, 27), new Cell(180, 27), new Cell(195, 12), new Cell(207, 46)],
                                [new Cell(60, 83), new Cell(76, 68), new Cell(99, 68), new Cell(115, 83), new Cell(140, 83), new Cell(155, 68), new Cell(180, 68), new Cell(195, 83), new Cell(207, 46)]
                            ],
                            [
                                [new Cell(60, 12), new Cell(76, 27), new Cell(99, 27), new Cell(115, 12), new Cell(140, 12), new Cell(155, 27), new Cell(180, 27), new Cell(195, 12), new Cell(207, 46)],
                                [new Cell(60, 83), new Cell(76, 68), new Cell(99, 68), new Cell(115, 83), new Cell(140, 83), new Cell(155, 68), new Cell(180, 68), new Cell(195, 83), new Cell(207, 46)]
                            ],
                            [
                                [new Cell(44, 46), new Cell(60, 12), new Cell(76, 27), new Cell(99, 27), new Cell(115, 12), new Cell(140, 12), new Cell(155, 27), new Cell(180, 27), new Cell(195, 12)].reverse(),
                                [new Cell(44, 46), new Cell(60, 83), new Cell(76, 68), new Cell(99, 68), new Cell(115, 83), new Cell(140, 83), new Cell(155, 68), new Cell(180, 68), new Cell(195, 83)].reverse()
                            ],
                            [
                                [new Cell(44, 46), new Cell(60, 12), new Cell(76, 27), new Cell(99, 27), new Cell(115, 12), new Cell(140, 12), new Cell(155, 27), new Cell(180, 27), new Cell(195, 12)].reverse(),
                                [new Cell(44, 46), new Cell(60, 83), new Cell(76, 68), new Cell(99, 68), new Cell(115, 83), new Cell(140, 83), new Cell(155, 68), new Cell(180, 68), new Cell(195, 83)].reverse()
                            ],
                            [
                                [new Cell(44, 46), new Cell(60, 12), new Cell(76, 27), new Cell(99, 27), new Cell(115, 12), new Cell(140, 12), new Cell(155, 27), new Cell(180, 27), new Cell(195, 12)].reverse(),
                                [new Cell(44, 46), new Cell(60, 83), new Cell(76, 68), new Cell(99, 68), new Cell(115, 83), new Cell(140, 83), new Cell(155, 68), new Cell(180, 68), new Cell(195, 83)].reverse()
                            ]
                        ];
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_NearDistance();
                        }
                    } else if (scenaName == "Битва замков - царь горы (2x2x2)") {
                        world.settlementsCount                    = 6;
                        world.settlements_field                   = [
                            new Polygon([new Cell(68, 147), new Cell(122, 148), new Cell(135, 177), new Cell(95, 187), new Cell(55, 177)].reverse()),
                            new Polygon([new Cell(68, 147), new Cell(122, 148), new Cell(135, 177), new Cell(95, 187), new Cell(55, 177)].reverse()),
                            new Polygon([new Cell(63, 91), new Cell(3, 89), new Cell(16, 19), new Cell(44, 19), new Cell(64, 46)].reverse()),
                            new Polygon([new Cell(63, 91), new Cell(3, 89), new Cell(16, 19), new Cell(44, 19), new Cell(64, 46)].reverse()),
                            new Polygon([new Cell(126, 44), new Cell(145, 19), new Cell(174, 49), new Cell(186, 89), new Cell(154, 92)].reverse()),
                            new Polygon([new Cell(126, 44), new Cell(145, 19), new Cell(174, 49), new Cell(186, 89), new Cell(154, 92)].reverse())
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(95, 185)],
                            [new Cell(95, 185)],
                            [new Cell(17, 50)],
                            [new Cell(17, 50)],
                            [new Cell(172, 50)],
                            [new Cell(172, 50)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(93, 155),
                            new Cell(93, 155),
                            new Cell(40, 62),
                            new Cell(40, 62),
                            new Cell(148, 63),
                            new Cell(148, 63)
                        ];
                        world.settlements_attack_paths            = [
                            [[new Cell(16, 142), new Cell(42, 63), new Cell(95, 4), new Cell(150, 64)],
                             [new Cell(175, 140), new Cell(150, 64), new Cell(95, 4), new Cell(42, 63)]],
                            [[new Cell(16, 142), new Cell(42, 63), new Cell(95, 4), new Cell(150, 64)],
                             [new Cell(175, 140), new Cell(150, 64), new Cell(95, 4), new Cell(42, 63)]],

                            [[new Cell(95, 4), new Cell(150, 64), new Cell(175, 140), new Cell(95, 156)],
                             [new Cell(16, 142), new Cell(95, 156), new Cell(175, 140), new Cell(150, 64)]],
                            [[new Cell(95, 4), new Cell(150, 64), new Cell(175, 140), new Cell(95, 156)],
                             [new Cell(16, 142), new Cell(95, 156), new Cell(175, 140), new Cell(150, 64)]],

                            [[new Cell(175, 140), new Cell(95, 156), new Cell(16, 142), new Cell(42, 63)],
                             [new Cell(95, 4), new Cell(42, 63), new Cell(16, 142),  new Cell(95, 156)]],
                            [[new Cell(175, 140), new Cell(95, 156), new Cell(16, 142), new Cell(42, 63)],
                             [new Cell(95, 4), new Cell(42, 63), new Cell(16, 142),  new Cell(95, 156)]]
                        ];
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_NearDistance(MetricType.L2);
                        }
                    } else if (scenaName == "Битва замков - царь горы (1x1x1x1)") {
                        world.settlementsCount                    = 4;
                        world.settlements_field                   = [
                            new Polygon([new Cell(73, 0), new Cell(120, 0), new Cell(120, 45), new Cell(73, 45)]),
                            new Polygon([new Cell(148, 72), new Cell(194, 72), new Cell(194, 120), new Cell(148, 120)]),
                            new Polygon([new Cell(72, 148), new Cell(120, 148), new Cell(120, 194), new Cell(72, 194)]),
                            new Polygon([new Cell(0, 72), new Cell(45, 72), new Cell(45, 120), new Cell(0, 120)])
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(96, 0)],
                            [new Cell(194, 96)],
                            [new Cell(97, 194)],
                            [new Cell(0, 96)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(95, 19),
                            new Cell(171, 95),
                            new Cell(95, 171),
                            new Cell(19, 95)
                        ];
                        world.settlements_attack_paths            = [
                            [[new Cell(173, 97), new Cell(97, 173), new Cell(21, 97)],
                                [new Cell(21, 97),  new Cell(97, 173), new Cell(173, 97)]],

                            [[new Cell(97, 173), new Cell(21, 97),  new Cell(97, 21)],
                                [new Cell(97, 21),  new Cell(21, 97),  new Cell(97, 173)]],

                            [[new Cell(21, 97),  new Cell(97, 21),  new Cell(173, 97)],
                                [new Cell(173, 97), new Cell(97, 21),  new Cell(21, 97)]],

                            [[new Cell(97, 21),  new Cell(173, 97), new Cell(97, 173)],
                                [new Cell(97, 173), new Cell(173, 97), new Cell(97, 21)]]
                        ];
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_NearDistance();
                        }
                    } else if (scenaName == "Битва замков - союзник в тылу врага (2x2x2)") {
                        world.settlementsCount                    = 6;
                        world.settlements_field                   = [
                            new Polygon([new Cell(0, 135), new Cell(63, 135), new Cell(63, 72), new Cell(0, 72)].reverse()),
                            new Polygon([new Cell(288, 135), new Cell(351, 135), new Cell(351, 72), new Cell(288, 72)].reverse()),
                            new Polygon([new Cell(72, 63), new Cell(135, 63), new Cell(135, 0), new Cell(72, 0)].reverse()),
                            new Polygon([new Cell(216, 207), new Cell(279, 207), new Cell(280, 144), new Cell(216, 144)].reverse()),
                            new Polygon([new Cell(216, 63), new Cell(279, 63), new Cell(279, 0), new Cell(216, 0)].reverse()),
                            new Polygon([new Cell(72, 207), new Cell(135, 207), new Cell(135, 144), new Cell(72, 144)].reverse())
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(1, 103)],
                            [new Cell(350, 103)],
                            [new Cell(103, 1)],
                            [new Cell(247, 206)],
                            [new Cell(247, 1)],
                            [new Cell(103, 206)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(30, 102),
                            new Cell(318, 102),
                            new Cell(102, 30),
                            new Cell(246, 174),
                            new Cell(246, 30),
                            new Cell(102, 174)
                        ];
                        world.settlements_attack_paths            = [
                            [[new Cell(32, 32), new Cell(102, 30), new Cell(246, 30), new Cell(318, 102), new Cell(246, 174), new Cell(102, 174)],
                                [new Cell(102, 30), new Cell(246, 30), new Cell(318, 102), new Cell(246, 174), new Cell(102, 174), new Cell(32, 175)].reverse()],

                            [[new Cell(319, 32), new Cell(246, 30), new Cell(102, 30), new Cell(30, 102), new Cell(102, 174), new Cell(246, 174)],
                                [new Cell(246, 30), new Cell(102, 30), new Cell(30, 102), new Cell(102, 174), new Cell(246, 174), new Cell(319, 175)].reverse()],

                            [[new Cell(175, 32), new Cell(246, 30), new Cell(318, 102), new Cell(246, 174), new Cell(102, 174), new Cell(30, 102)],
                                [new Cell(246, 30), new Cell(318, 102), new Cell(246, 174), new Cell(102, 174), new Cell(30, 102), new Cell(32, 32)].reverse()],

                            [[new Cell(176, 175), new Cell(102, 174), new Cell(30, 102), new Cell(102, 30), new Cell(246, 30), new Cell(318, 102)],
                                [new Cell(102, 174), new Cell(30, 102), new Cell(102, 30), new Cell(246, 30), new Cell(318, 102), new Cell(319, 175)].reverse()],

                            [[new Cell(319, 32), new Cell(318, 102), new Cell(246, 174), new Cell(102, 174), new Cell(30, 102), new Cell(102, 30)],
                                [new Cell(318, 102), new Cell(246, 174), new Cell(102, 174), new Cell(30, 102), new Cell(102, 30), new Cell(176, 32)].reverse()],

                            [[new Cell(32, 175), new Cell(30, 102), new Cell(102, 30), new Cell(246, 30), new Cell(318, 102), new Cell(246, 174)],
                                [new Cell(30, 102), new Cell(102, 30), new Cell(246, 30), new Cell(318, 102), new Cell(246, 174), new Cell(175, 175)].reverse()]
                        ];
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_NearDistance();
                        }
                    } else if (scenaName == "Битва замков - царь горы (2-6)") {
                        world.settlementsCount                    = 6;
                        world.settlements_field                   = [
                            new Polygon([new Cell(156, 157), new Cell(156, 162), new Cell(140, 164), new Cell(140, 155)]),
                            new Polygon([new Cell(159, 151), new Cell(159, 156), new Cell(153, 156), new Cell(144, 145), new Cell(155, 139)]),
                            new Polygon([new Cell(166, 156), new Cell(160, 156), new Cell(160, 151), new Cell(164, 139), new Cell(175, 145)]),
                            new Polygon([new Cell(163, 157), new Cell(179, 155), new Cell(179, 164), new Cell(163, 162)]),
                            new Polygon([new Cell(160, 163), new Cell(166, 163), new Cell(175, 174), new Cell(165, 180), new Cell(160, 168)]),
                            new Polygon([new Cell(153, 163), new Cell(159, 163), new Cell(159, 168), new Cell(155, 180), new Cell(144, 173)])
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(74, 160)],
                            [new Cell(118, 88)],
                            [new Cell(203, 85)],
                            [new Cell(244, 160)],
                            [new Cell(201, 231)],
                            [new Cell(118, 229)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(151, 158),
                            new Cell(154, 152),
                            new Cell(161, 152),
                            new Cell(164, 158),
                            new Cell(161, 164),
                            new Cell(154, 164)
                        ];
                        world.settlements_attack_paths            = [
                            [
                                [new Cell(139, 159), new Cell(153, 151), new Cell(166, 151), new Cell(170, 159), new Cell(166, 168), new Cell(153, 168)],
                                [new Cell(139, 159), new Cell(153, 168), new Cell(166, 168), new Cell(170, 159), new Cell(166, 151), new Cell(153, 151)]
                            ],
                            [
                                [new Cell(149, 141), new Cell(166, 151), new Cell(170, 159), new Cell(166, 168), new Cell(153, 168), new Cell(149, 159)],
                                [new Cell(149, 141), new Cell(149, 159), new Cell(153, 168), new Cell(166, 168), new Cell(170, 159), new Cell(166, 151)]
                            ],
                            [
                                [new Cell(170, 141), new Cell(170, 159), new Cell(166, 168), new Cell(153, 168), new Cell(149, 159), new Cell(153, 151)],
                                [new Cell(170, 141), new Cell(153, 151), new Cell(149, 159), new Cell(153, 168), new Cell(166, 168), new Cell(170, 159)]
                            ],
                            [
                                [new Cell(180, 159), new Cell(166, 168), new Cell(153, 168), new Cell(149, 159), new Cell(153, 151), new Cell(166, 151)],
                                [new Cell(180, 159), new Cell(166, 151), new Cell(153, 151), new Cell(149, 159), new Cell(153, 168), new Cell(166, 168)]
                            ],
                            [
                                [new Cell(170, 177), new Cell(153, 168), new Cell(149, 159), new Cell(153, 151), new Cell(166, 151), new Cell(170, 159)],
                                [new Cell(170, 177), new Cell(170, 159), new Cell(166, 151), new Cell(153, 151), new Cell(149, 159), new Cell(153, 168)]
                            ],
                            [
                                [new Cell(149, 177), new Cell(149, 159), new Cell(153, 151), new Cell(166, 151), new Cell(170, 159), new Cell(166, 168)],
                                [new Cell(149, 177), new Cell(166, 168), new Cell(170, 159), new Cell(166, 151), new Cell(153, 151), new Cell(149, 159)]
                            ]
                        ];
                        world.castle_health_coeff = 2.0/3.0*5.0;
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_Periodically();
                        }
                    } else if (scenaName == "Битва замков - тест баланса") {
                        world.settlementsCount = 2;
                        world.settlements_field                   = [
                            new Polygon([]),
                            new Polygon([])
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(247, 0)],
                            [new Cell(255, 0)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(249, 0),
                            new Cell(249, 4)
                        ];
                        world.settlements_attack_paths            = [
                            [[new Cell(0, 0)]],
                            [[new Cell(0, 0)]]
                        ];
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_NearDistance();
                        }
                    } else if (scenaName == "Битва замков - перекресток (1x1x1x1)") {
                        world.settlementsCount = 4;
                        world.settlements_field                   = [
                            new Polygon([new Cell(0, 0), new Cell(47, 0), new Cell(47, 47), new Cell(0, 47)]),
                            new Polygon([new Cell(191, 0), new Cell(191, 47), new Cell(144, 47), new Cell(144, 0)]),
                            new Polygon([new Cell(191, 191), new Cell(144, 191), new Cell(144, 144), new Cell(191, 144)]),
                            new Polygon([new Cell(0, 191), new Cell(0, 144), new Cell(47, 144), new Cell(47, 191)])
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(16, 16)],
                            [new Cell(175, 16)],
                            [new Cell(175, 175)],
                            [new Cell(16, 175)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(35, 36),
                            new Cell(152, 36),
                            new Cell(152, 152),
                            new Cell(35, 152)
                        ];
                        world.settlements_attack_paths            = [
                            [
                                [new Cell(156, 36)],
                                [new Cell(156, 155)],
                                [new Cell(35, 155)]
                            ],
                            [
                                [new Cell(156, 155)],
                                [new Cell(35, 155)],
                                [new Cell(35, 36)]
                            ],
                            [
                                [new Cell(35, 155)],
                                [new Cell(35, 36)],
                                [new Cell(156, 36)]
                            ],
                            [
                                [new Cell(35, 36)],
                                [new Cell(156, 36)],
                                [new Cell(156, 155)]
                            ]
                        ];
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_Periodically_WithCondCell([
                                [
                                    [new Cell(156, 36)],
                                    [new Cell(156, 155)],
                                    [new Cell(35, 155)]
                                ],
                                [
                                    [new Cell(156, 155)],
                                    [new Cell(35, 155)],
                                    [new Cell(35, 36)]
                                ],
                                [
                                    [new Cell(35, 155)],
                                    [new Cell(35, 36)],
                                    [new Cell(156, 36)]
                                ],
                                [
                                    [new Cell(35, 36)],
                                    [new Cell(156, 36)],
                                    [new Cell(156, 155)]
                                ]
                            ]);
                        }
                    } else if (scenaName == "Битва замков - перекресток (2x2x2)") {
                        world.settlementsCount = 6;
                        world.settlements_field                   = [
                            new Polygon([new Cell(96, 96), new Cell(159, 96), new Cell(159, 159), new Cell(96, 159)]),
                            new Polygon([new Cell(96, 96), new Cell(159, 96), new Cell(159, 159), new Cell(96, 159)]),

                            new Polygon([new Cell(32, 32), new Cell(63, 32), new Cell(63, 63), new Cell(32, 63)]),
                            new Polygon([new Cell(192, 32), new Cell(223, 32), new Cell(223, 63), new Cell(192, 63)]),

                            new Polygon([new Cell(32, 192), new Cell(63, 192), new Cell(63, 223), new Cell(32, 223)]),
                            new Polygon([new Cell(192, 192), new Cell(223, 192), new Cell(223, 223), new Cell(192, 223)])
                        ];
                        world.settlements_workers_reviveCells = [
                            [new Cell(128, 71)],
                            [new Cell(127, 184)],

                            [new Cell(31, 31)],
                            [new Cell(224, 41)],

                            [new Cell(31, 224)],
                            [new Cell(224, 224)]
                        ];
                        world.settlements_castle_cell         = [
                            new Cell(126, 126),
                            new Cell(126, 126),

                            new Cell(43, 44),
                            new Cell(208, 44),

                            new Cell(43, 208),
                            new Cell(208, 208)
                        ];
                        world.settlements_attack_paths            = [
                            [
                                [new Cell(47, 47)],
                                [new Cell(208, 47)],
                                [new Cell(208, 208)],
                                [new Cell(43, 208)]
                            ],
                            [
                                [new Cell(47, 47)],
                                [new Cell(208, 47)],
                                [new Cell(208, 208)],
                                [new Cell(43, 208)]
                            ],

                            [
                                [new Cell(126, 126), new Cell(208, 208)],
                                [new Cell(43, 208)]
                            ],
                            [
                                [new Cell(126, 126), new Cell(43, 208)],
                                [new Cell(208, 208)],
                            ],

                            [
                                [new Cell(126, 126), new Cell(208, 44)],
                                [new Cell(43, 44)]
                            ],
                            [
                                [new Cell(126, 126), new Cell(43, 44)],
                                [new Cell(208, 44)]
                            ]
                        ];
                        world.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(world.settlementsCount);
                        for (var settlementId = 0; settlementId < world.settlementsCount; settlementId++) {
                            world.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_Periodically_WithCondCell([
                                [
                                    [new Cell(47, 47)],
                                    [new Cell(208, 47)],
                                    [new Cell(208, 208)],
                                    [new Cell(43, 208)]
                                ],
                                [
                                    [new Cell(47, 47)],
                                    [new Cell(208, 47)],
                                    [new Cell(208, 208)],
                                    [new Cell(43, 208)]
                                ],
    
                                [
                                    [new Cell(126, 126), new Cell(208, 208)],
                                    [new Cell(43, 208)]
                                ],
                                [
                                    [new Cell(126, 126), new Cell(43, 208)],
                                    [new Cell(208, 208)],
                                ],
    
                                [
                                    [new Cell(126, 126), new Cell(208, 44)],
                                    [new Cell(43, 44)]
                                ],
                                [
                                    [new Cell(126, 126), new Cell(43, 44)],
                                    [new Cell(208, 44)]
                                ]
                            ]);
                        }
                    } else {
                        return;
                    }

                    this.log.info("Скрипты для битвы замков активированы");

                    world.Init();

                    world.RegisterSystem(WordClearSystem, "WordClearSystem");
                    world.RegisterSystem(IncomeSystem, "IncomeSystem");
                    world.RegisterSystem(SpawnBuildingSystem, "SpawnBuildingSystem");
                    //world.RegisterSystem(AttackingAlongPathSystem, "AttackingAlongPathSystem");
                    world.RegisterSystem(AttackingAlongPathSystem2, "AttackingAlongPathSystem");
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
