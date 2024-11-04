import { log } from "library/common/logging";
import { MaraSettlementController } from "./MaraSettlementController";
import { MaraUtils } from "./MaraUtils";
import { MaraMap } from "./Common/MapAnalysis/MaraMap";
import { PathFinder } from "library/game-logic/path-find";

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
    static LogLevel: MaraLogLevel = MaraLogLevel.Debug;
    static CanRun = true;
    static IsNetworkMode = true;
    
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
                MaraMap.Tick();
                
                if (tickNumber < 10) { //doing nothing for first 10 ticks since not all core objects could be properly inited
                    return;
                }
                
                for (let controller of Mara.controllers) {
                    if (!controller.Settlement.Existence.IsTotalDefeat) {
                        controller.Tick(tickNumber - controller.TickOffset);
                    }
                    else {
                        Mara.Log(MaraLogLevel.Info, `Controller '${controller.Player.Nickname}' lost the battle, but not the war!`);
                    }
                }

                Mara.controllers = Mara.controllers.filter((controller) => {return !controller.Settlement.Existence.IsTotalDefeat});
            }
        }
        catch (ex) {
            log.exception(ex);
            Mara.CanRun = false;
        }
    };

    static FirstRun(): void {
        Mara.Info(`Engaging Mara...`);
        Mara.Info(`Failed to load library './Empathy/heart', reason: not found. Proceeding without it.`);
        Mara.Info(`Failed to load library './Empathy/soul', reason: not found. Proceeding without it.`);
        Mara.Info(`Empathy subsystem is not responding`);

        try {            
            Mara.CanRun = true;
            Mara.IsNetworkMode = MaraUtils.IsNetworkMode();
            Mara.controllers = [];

            Mara.Debug(`Building resource map...`);
            MaraMap.Init();
            Mara.Debug(`Done!`);

            let tickOffset = 0;

            for (let item of MaraUtils.GetAllPlayers()) {
                Mara.AttachToPlayer(item.index, tickOffset);
                tickOffset++;
            }
        }
        catch (ex) {
            log.exception(ex);
            Mara.CanRun = false;
            return;
        }

        Mara.Info(`Mara successfully engaged. Have fun! ^^`);
    };

    static AttachToPlayer(playerId: string, tickOffset: number = 0): void {
        Mara.Debug(`Begin attach to player ${playerId}`);
        let settlementData = MaraUtils.GetSettlementData(playerId);

        if (!settlementData) {
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