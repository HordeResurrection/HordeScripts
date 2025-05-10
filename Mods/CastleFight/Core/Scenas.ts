import { AttackPathChoiser_NearDistance, AttackPathChoiser_Periodically, AttackPathChoiser_Periodically_WithCondCell, IAttackPathChoiser } from "./AttackPathChoisers";
import { Config_Castle } from "./Configs/Config_Castle";
import { Cell, MetricType } from "./Utils";

export class IScena {
    public static scenaName: string = "";

    /** количество поселений */
    public static settlementsCount: number;
    /** для каждого поселения хранится точка спавна рабочих */
    public static  settlements_workers_reviveCells: Array<Array<Cell>>;
    /** для каждого поселения хранится точка замка */
    public static  settlements_castle_cell: Array<Cell>;
    /** для каждого поселения хранится набор путей атаки */
    public static  settlements_attack_paths: Array<Array<Array<Cell>>>;
    /** для каждого поселения хранится селектор пути атаки */
    public static  settlements_attackPathChoiser: Array<IAttackPathChoiser>;

    constructor() {}

    public static Init() { }
}
export class Scena1 extends IScena {
    public static scenaName: string = "Битва замков - лесная тропа с мостами (3х3)";
    public static settlementsCount: number = 6;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(0, 31)],
        [new Cell(0, 31)],
        [new Cell(0, 31)],
        [new Cell(207, 31)],
        [new Cell(207, 31)],
        [new Cell(207, 31)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(21, 30),
        new Cell(21, 30),
        new Cell(21, 30),
        new Cell(182, 30),
        new Cell(182, 30),
        new Cell(182, 30)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
        [[new Cell(182, 30)]],
        [[new Cell(182, 30)]],
        [[new Cell(182, 30)]],
        [[new Cell(21, 30)]],
        [[new Cell(21, 30)]],
        [[new Cell(21, 30)]]
    ];
    public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = [
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance()
    ]
}
export class Scena2 extends IScena {
    public static scenaName: string = "Битва замков - лесная тропа (3х3)";
    public static settlementsCount: number = 6;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(0, 31)],
        [new Cell(0, 31)],
        [new Cell(0, 31)],
        [new Cell(207, 31)],
        [new Cell(207, 31)],
        [new Cell(207, 31)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(21, 30),
        new Cell(21, 30),
        new Cell(21, 30),
        new Cell(182, 30),
        new Cell(182, 30),
        new Cell(182, 30)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
        [[new Cell(182, 30)]],
        [[new Cell(182, 30)]],
        [[new Cell(182, 30)]],
        [[new Cell(21, 30)]],
        [[new Cell(21, 30)]],
        [[new Cell(21, 30)]]
    ];
    public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = [
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance()
    ];
}
export class Scena3 extends IScena {
    public static scenaName: string = "Битва замков - две тропы (3х3)";
    public static settlementsCount: number = 6;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(0, 47)],
        [new Cell(0, 47)],
        [new Cell(0, 47)],
        [new Cell(255, 47)],
        [new Cell(255, 47)],
        [new Cell(255, 47)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(44, 46),
        new Cell(44, 46),
        new Cell(44, 46),
        new Cell(207, 46),
        new Cell(207, 46),
        new Cell(207, 46)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
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
    public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = [
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance()
    ];
}
export class Scena4 extends IScena {
    public static scenaName: string = "Битва замков - царь горы (2x2x2)";
    public static settlementsCount: number = 6;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(95, 185)],
        [new Cell(95, 185)],
        [new Cell(17, 50)],
        [new Cell(17, 50)],
        [new Cell(172, 50)],
        [new Cell(172, 50)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(93, 155),
        new Cell(93, 155),
        new Cell(40, 62),
        new Cell(40, 62),
        new Cell(148, 63),
        new Cell(148, 63)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
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
    public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = [
        new AttackPathChoiser_NearDistance(MetricType.Euclid),
        new AttackPathChoiser_NearDistance(MetricType.Euclid),
        new AttackPathChoiser_NearDistance(MetricType.Euclid),
        new AttackPathChoiser_NearDistance(MetricType.Euclid),
        new AttackPathChoiser_NearDistance(MetricType.Euclid),
        new AttackPathChoiser_NearDistance(MetricType.Euclid)
    ];
}
export class Scena5 extends IScena {
    public static scenaName: string = "Битва замков - царь горы (1x1x1x1)";
    public static settlementsCount: number = 4;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(96, 0)],
        [new Cell(194, 96)],
        [new Cell(97, 194)],
        [new Cell(0, 96)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(95, 19),
        new Cell(171, 95),
        new Cell(95, 171),
        new Cell(19, 95)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
        [[new Cell(173, 97), new Cell(97, 173), new Cell(21, 97)],
            [new Cell(21, 97),  new Cell(97, 173), new Cell(173, 97)]],

        [[new Cell(97, 173), new Cell(21, 97),  new Cell(97, 21)],
            [new Cell(97, 21),  new Cell(21, 97),  new Cell(97, 173)]],

        [[new Cell(21, 97),  new Cell(97, 21),  new Cell(173, 97)],
            [new Cell(173, 97), new Cell(97, 21),  new Cell(21, 97)]],

        [[new Cell(97, 21),  new Cell(173, 97), new Cell(97, 173)],
            [new Cell(97, 173), new Cell(173, 97), new Cell(97, 21)]]
    ];
    public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = [
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance()
    ]
}
export class Scena6 extends IScena {
    public static scenaName: string = "Битва замков - союзник в тылу врага (2x2x2)";
    public static settlementsCount: number = 6;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(1, 103)],
        [new Cell(350, 103)],
        [new Cell(103, 1)],
        [new Cell(247, 206)],
        [new Cell(247, 1)],
        [new Cell(103, 206)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(30, 102),
        new Cell(318, 102),
        new Cell(102, 30),
        new Cell(246, 174),
        new Cell(246, 30),
        new Cell(102, 174)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
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
    public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = [
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance()
    ]
}
export class Scena7 extends IScena {
    public static scenaName: string = "Битва замков - царь горы (1х1х1х1х1х1)";
    public static settlementsCount: number = 6;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(1, 103)],
        [new Cell(350, 103)],
        [new Cell(103, 1)],
        [new Cell(247, 206)],
        [new Cell(247, 1)],
        [new Cell(103, 206)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(30, 102),
        new Cell(318, 102),
        new Cell(102, 30),
        new Cell(246, 174),
        new Cell(246, 30),
        new Cell(102, 174)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
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
    public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = [
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance()
    ];
}
export class Scena8 extends IScena {
    public static scenaName: string = "Битва замков - царь горы (2-6)";
    public static settlementsCount: number = 6;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(74, 160)],
        [new Cell(118, 88)],
        [new Cell(203, 85)],
        [new Cell(244, 160)],
        [new Cell(201, 231)],
        [new Cell(118, 229)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(151, 158),
        new Cell(154, 152),
        new Cell(161, 152),
        new Cell(164, 158),
        new Cell(161, 164),
        new Cell(154, 164)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
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
    public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = [
        new AttackPathChoiser_Periodically(),
        new AttackPathChoiser_Periodically(),
        new AttackPathChoiser_Periodically(),
        new AttackPathChoiser_Periodically(),
        new AttackPathChoiser_Periodically(),
        new AttackPathChoiser_Periodically()
    ];
    public static Init() {
        Config_Castle.HealthCoeff = 2.0/3.0*5.0;
    }
}
export class Scena9 extends IScena {
    public static scenaName: string = "Битва замков - перекресток (1x1x1x1)";
    public static settlementsCount: number = 4;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(16, 16)],
        [new Cell(175, 16)],
        [new Cell(175, 175)],
        [new Cell(16, 175)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(35, 36),
        new Cell(152, 36),
        new Cell(152, 152),
        new Cell(35, 152)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
        [
            [new Cell(95, 31), new Cell(156, 36)],
            [new Cell(95, 95), new Cell(156, 155)],
            [new Cell(31, 95), new Cell(35, 155)]
        ],
        [
            [new Cell(159, 95), new Cell(156, 155)],
            [new Cell(95, 95), new Cell(35, 155)],
            [new Cell(95, 31), new Cell(35, 36)]
        ],
        [
            [new Cell(95, 159), new Cell(35, 155)],
            [new Cell(95, 95), new Cell(35, 36)],
            [new Cell(159, 95), new Cell(156, 36)]
        ],
        [
            [new Cell(31, 95), new Cell(35, 36)],
            [new Cell(95, 95), new Cell(156, 36)],
            [new Cell(95, 159), new Cell(156, 155)]
        ]
    ];
    public static Init() {
        IScena.Init.call(this);
        this.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(this.settlementsCount);
        for (var settlementId = 0; settlementId < this.settlementsCount; settlementId++) {
            this.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_Periodically_WithCondCell([
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
    }
}
export class Scena10 extends IScena {
    public static scenaName: string = "Битва замков - перекресток (2x2x2)";
    public static settlementsCount: number = 6;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(128, 71)],
        [new Cell(127, 184)],

        [new Cell(31, 31)],
        [new Cell(224, 41)],

        [new Cell(31, 224)],
        [new Cell(224, 224)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(126, 126),
        new Cell(126, 126),

        new Cell(43, 44),
        new Cell(208, 44),

        new Cell(43, 208),
        new Cell(208, 208)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
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
    public static Init() {
        IScena.Init.call(this);
        this.settlements_attackPathChoiser = new Array<IAttackPathChoiser>(this.settlementsCount);
        for (var settlementId = 0; settlementId < this.settlementsCount; settlementId++) {
            this.settlements_attackPathChoiser[settlementId] = new AttackPathChoiser_Periodically_WithCondCell([
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
    }
}
export class ScenaTest extends IScena {
    public static scenaName: string = "Битва замков - тест баланса";
    public static settlementsCount: number = 2;
    public static settlements_workers_reviveCells: Array<Array<Cell>> = [
        [new Cell(247, 0)],
        [new Cell(255, 0)]
    ];
    public static settlements_castle_cell: Array<Cell> = [
        new Cell(249, 0),
        new Cell(249, 4)
    ];
    public static settlements_attack_paths: Array<Array<Array<Cell>>> = [
        [[new Cell(0, 0)]],
        [[new Cell(0, 0)]]
    ];
    public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = [
        new AttackPathChoiser_NearDistance(),
        new AttackPathChoiser_NearDistance()
    ]
    public static Init() {
        //ТУТ НУЖНО ДОБАВИТЬ СИСТЕМУ тестов
    }
}
// export class ScenaN extends IScena {
//     public static scenaName: string = 
//     public static settlementsCount: number = 
//     public static settlements_workers_reviveCells: Array<Array<Cell>> = 
//     public static settlements_castle_cell: Array<Cell> = 
//     public static settlements_attack_paths: Array<Array<Array<Cell>>> = 
//     public static settlements_attackPathChoiser: Array<IAttackPathChoiser> = 
// }

export var Scenas : Array<typeof IScena> = [
    Scena1,
    Scena2,
    Scena3,
    Scena4,
    Scena5,
    Scena6,
    Scena7,
    Scena8,
    Scena9,
    Scena10,

    ScenaTest
]