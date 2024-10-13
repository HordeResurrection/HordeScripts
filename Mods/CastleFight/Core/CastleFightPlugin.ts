import HordePluginBase from "plugins/base-plugin";
import { BalanceFindingSystem } from "./Systems/BalanceFindingSystem";
import { WordClearSystem, IncomeSystem, SpawnBuildingSystem, ReviveSystem, BuffSystem, UnitProducedSystem, DiplomacySystem, UpgradableBuildingSystem } from "./Systems/ESC_systems";
import { Cell, MetricType } from "./Utils";
import { AI_System } from "./Systems/AISystem";
import { AttackingAlongPathSystem_stage1, AttackingAlongPathSystem_stage2 } from "./Systems/AttackingAlongPathSystem";
import { GameState, World } from "./World";
import { IAttackPathChoiser, AttackPathChoiser_NearDistance, AttackPathChoiser_Periodically, AttackPathChoiser_Periodically_WithCondCell } from "./AttackPathChoisers";
import { Scenas } from "./Scenas";

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
                    var scenaNum : number;
                    for (scenaNum = 0; scenaNum < Scenas.length; scenaNum++) {
                        if (Scenas[scenaNum].scenaName == scenaName) {
                            break;
                        }
                    }
                    if (scenaNum == Scenas.length) {
                        return;
                    }

                    world.scena = Scenas[scenaNum];
                    world.scena.Init();
                    
                    this.log.info("Скрипты для битвы замков активированы");

                    world.Init();
                    
                    world.RegisterSystem(WordClearSystem, "WordClearSystem");
                    world.RegisterSystem(IncomeSystem, "IncomeSystem");
                    world.RegisterSystem(SpawnBuildingSystem, "SpawnBuildingSystem");
                    world.RegisterSystem(AttackingAlongPathSystem_stage1, "AttackingAlongPathSystem_stage1");
                    world.RegisterSystem(AttackingAlongPathSystem_stage2, "AttackingAlongPathSystem_stage2");
                    world.RegisterSystem(ReviveSystem, "ReviveSystem");
                    world.RegisterSystem(UpgradableBuildingSystem, "UpgradableBuildingSystem");

                    world.RegisterSystem(AI_System,  "AI_System");

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
