import { log } from "library/common/logging";
import { MaraSettlementController } from "./MaraSettlementController";
import { MaraUtils } from "./MaraUtils";
import { MaraMap } from "./Common/MapAnalysis/MaraMap";
import { PathFinder } from "library/game-logic/path-find";
import { broadcastMessage } from "library/common/messages";
import { createHordeColor } from "library/common/primitives";
import { MaraUnitCache } from "./Common/Cache/MaraUnitCache";
import { MaraUnitConfigCache } from "./Common/Cache/MaraUnitConfigCache";
import { MaraProfiler } from "./Common/MaraProfiler";

export enum MaraLogLevel {
    Debug = 0,
    Info = 1,
    Warning = 2,
    Error = 3
}

/*
    Class organizes work of each settlement controller since we can have multiple 
    of them in one game. Also provides some helper functions.

    The class itself is static by its nature
*/

export class Mara {
    static Profilers: {[index: string]: MaraProfiler} = {};
    
    static LogLevel: MaraLogLevel = MaraLogLevel.Debug;
    static CanRun = true;
    
    private static controllers: Array<MaraSettlementController> = [];
    private static pathfinder: any;
    
    public static get Controllers(): Array<MaraSettlementController> {
        return Mara.controllers;
    }

    public static get Pathfinder(): any {
        if (!Mara.pathfinder) {
            Mara.pathfinder = new PathFinder(MaraUtils.GetScena());
        }

        return Mara.pathfinder;
    }
    
    static Tick(tickNumber: number): void {
        try {
            if (Mara.CanRun) {
                if (tickNumber < 10) { //doing nothing for first 10 ticks since not all core objects could be properly inited
                    return;
                }

                MaraMap.Tick();
                
                for (let controller of Mara.controllers) {
                    if (!controller.Settlement.Existence.IsTotalDefeat) {
                        Mara.Profilers["SettlementController"].Start();
                        controller.Tick(tickNumber - controller.TickOffset);
                        Mara.Profilers["SettlementController"].Stop();
                    }
                    else {
                        Mara.Log(MaraLogLevel.Info, `Controller '${controller.Player.Nickname}' lost the battle, but not the war!`);
                    }
                }

                if (tickNumber % 50 == 0) {
                    Mara.Debug(`============ PROFILING DATA ============`);

                    for (let profiler in Mara.Profilers) {
                        Mara.Profilers[profiler].Print();
                    }
                }

                if (tickNumber % 100 == 0) {
                    for (let profiler in Mara.Profilers) {
                        Mara.Profilers[profiler].Reset();
                    }
                }

                Mara.controllers = Mara.controllers.filter((controller) => {return !controller.Settlement.Existence.IsTotalDefeat});
            }
        }
        catch (ex) {
            log.exception(ex);
            broadcastMessage(`(Мара) Обнаружена ошибка. Мара остановлена.`, createHordeColor(255, 255, 0, 0));
            Mara.CanRun = false;
        }
    };

    static FirstRun(): void {
        Mara.Info(`Engaging Mara...`);
        Mara.Info(`Failed to load library './Empathy/heart', reason: not found. Proceeding without it.`);
        Mara.Info(`Failed to load library './Empathy/soul', reason: not found. Proceeding without it.`);
        Mara.Info(`Empathy subsystem is not responding`);

        Mara.Profilers["SettlementController"] = new MaraProfiler("Settlement controller tick", false);
        Mara.Profilers["MiningSubcontroller"] = new MaraProfiler("Mining subcontroller tick", false);
        
        Mara.Profilers["ProductionSubcontroller"] = new MaraProfiler("Production subcontroller tick", false);
        Mara.Profilers["ProductionSubcontroller.Maintenance"] = new MaraProfiler("ProductionSubcontroller.Maintenance tick", false);
        Mara.Profilers["ProductionSubcontroller.queuedRequests"] = new MaraProfiler("ProductionSubcontroller.queuedRequests tick", false);
        Mara.Profilers["ProductionSubcontroller.executingRequests"] = new MaraProfiler("ProductionSubcontroller.executingRequests tick", false);

        Mara.Profilers["StrategySubcontroller"] = new MaraProfiler("Strategy subcontroller tick", false);
        Mara.Profilers["TacticalSubcontroller"] = new MaraProfiler("Tactical subcontroller tick", false);

        Mara.Profilers["BuildingUpState"] = new MaraProfiler("BuildingUpState tick", false);
        Mara.Profilers["DefendingState"] = new MaraProfiler("DefendingState tick", false);
        Mara.Profilers["DevelopingState"] = new MaraProfiler("DevelopingState tick", false);
        Mara.Profilers["ExpandBuildState"] = new MaraProfiler("ExpandBuildState tick", false);
        Mara.Profilers["ExpandPrepareState"] = new MaraProfiler("ExpandPrepareState tick", false);
        Mara.Profilers["ExpandSecureState"] = new MaraProfiler("ExpandSecureState tick", false);
        Mara.Profilers["ExterminatingState"] = new MaraProfiler("ExterminatingState tick", false);
        Mara.Profilers["IdleState"] = new MaraProfiler("IdleState tick", false);
        Mara.Profilers["RebuildState"] = new MaraProfiler("RebuildState tick", false);
        Mara.Profilers["RoutingState"] = new MaraProfiler("RoutingState tick", false);

        try {
            Mara.CanRun = true;
            Mara.controllers = [];

            MaraMap.Init();
            MaraUnitCache.Init();
            MaraUnitConfigCache.Init();

            let tickOffset = 0;
            let processedSettlements: Array<any> = [];

            for (let item of MaraUtils.GetAllPlayers()) {
                Mara.AttachToPlayer(item.index, processedSettlements, tickOffset);
                tickOffset ++;
            }
        }
        catch (ex) {
            log.exception(ex);
            broadcastMessage(`(Мара) Обнаружена ошибка. Мара остановлена.`, createHordeColor(255, 255, 0, 0));
            Mara.CanRun = false;
            return;
        }

        Mara.Info(`Mara successfully engaged. Have fun! ^^`);
    };

    static AttachToPlayer(playerId: string, processedSettlements: Array<any>, tickOffset: number = 0): void {
        Mara.Debug(`Begin attach to player ${playerId}`);
        let settlementData = MaraUtils.GetSettlementData(playerId);

        if (!settlementData) {
            return;
        }

        if (processedSettlements.find((v) => v == settlementData.Settlement)) {
            Mara.Info(`Skipping player ${playerId}: settlement is already bound to another controller`);
            return;
        }

        if (!settlementData.Player.IsLocal) {
            Mara.Info(`Skipping player ${playerId}: player is not local`);
            return;
        }

        if (!settlementData.MasterMind) {
            Mara.Info(`Unable to attach to player ${playerId}: player is not controlled by MasterMind`);
            return;
        }

        let controller = new MaraSettlementController(
            settlementData.Settlement, 
            settlementData.MasterMind, 
            settlementData.Player,
            tickOffset
        );
        
        Mara.controllers.push(controller);
        processedSettlements.push(settlementData.Settlement);
        
        Mara.Info(`Successfully attached to player ${playerId}`);
    };

    //#region logging helpers
    static Log(level: MaraLogLevel, message: string) {
        if (Mara.LogLevel > level) {
            return;
        }

        let logMessage = "(Mara) " + message;

        switch (level) {
            case MaraLogLevel.Debug:
                logMessage = "(Mara) D " + message;
                log.info(logMessage);
                break;
            case MaraLogLevel.Info:
                log.info(logMessage);
                break;
            case MaraLogLevel.Warning:
                log.warning(logMessage);
                break;
            case MaraLogLevel.Error:
                log.error(logMessage);
                break;
        }
    }
    static Debug(message: string): void {
        Mara.Log(MaraLogLevel.Debug, message);
    }
    static Info(message: string): void {
        Mara.Log(MaraLogLevel.Info, message);
    }
    static Warning(message: string): void {
        Mara.Log(MaraLogLevel.Warning, message);
    }
    static Error(message: string): void {
        Mara.Log(MaraLogLevel.Error, message);
    }
    //#endregion
}