
/* 
    Class that controls the entire life of a single settlement
*/

import { Mara, MaraLogLevel } from "./Mara";
import { MaraSettlementControllerState } from "./SettlementControllerStates/MaraSettlementControllerState";
import { MiningSubcontroller } from "./Subcontrollers/MiningSubontroller";
import { MaraSubcontroller } from "./Subcontrollers/MaraSubcontroller";
import { ProductionSubcontroller } from "./Subcontrollers/ProductionSubcontroller";
import { MaraSquad } from "./Subcontrollers/Squads/MaraSquad";
import { StrategySubcontroller } from "./Subcontrollers/StrategySubcontroller";
import { TacticalSubcontroller } from "./Subcontrollers/TacticalSubcontroller";
import { eNext, enumerate } from "./Utils/Common";
import { MaraUtils, UnitComposition } from "./Utils/MaraUtils";
import { MaraSettlementControllerSettings } from "./SettlementControllerSettings";
import { SettlementControllerStateFactory } from "./SettlementControllerStateFactory";

export class SettlementLocation {
    Center: any;
    Radius: number;

    constructor(center: any, radius: number) {
        this.Center = center;
        this.Radius = radius;
    }
}

export class MaraSettlementController {
    public TickOffset: number = 0;
    
    public Settlement: any;
    public MasterMind: any;
    public Player: any;
    public Settings: MaraSettlementControllerSettings;

    public MiningController: MiningSubcontroller;
    public ProductionController: ProductionSubcontroller;
    public StrategyController: StrategySubcontroller;
    public TacticalController: TacticalSubcontroller;
    
    public HostileAttackingSquads: Array<MaraSquad> = [];
    public TargetUnitsComposition: UnitComposition | null = null;
    public AttackToDefenseUnitRatio: number | null = null;
    
    private subcontrollers: Array<MaraSubcontroller> = [];
    private state: MaraSettlementControllerState;
    private nextState: MaraSettlementControllerState | null;
    private currentUnitComposition: UnitComposition | null;
    private currentDevelopedUnitComposition: UnitComposition | null;
    private settlementLocation: SettlementLocation | null;

    constructor (settlement, settlementMM, player, tickOffset) {
        this.TickOffset = tickOffset;
        
        this.Settlement = settlement;
        this.Player = player;
        this.MasterMind = settlementMM;
        this.Settings = new MaraSettlementControllerSettings();

        if (!this.MasterMind.IsWorkMode) {
            this.Debug("Engaging MasterMind");
            this.MasterMind.IsWorkMode = true;
        }

        this.subcontrollers = [];

        this.MiningController = new MiningSubcontroller(this);
        this.subcontrollers.push(this.MiningController);

        this.ProductionController = new ProductionSubcontroller(this);
        this.subcontrollers.push(this.ProductionController);

        this.StrategyController = new StrategySubcontroller(this);
        this.subcontrollers.push(this.StrategyController);

        this.TacticalController = new TacticalSubcontroller(this);
        this.subcontrollers.push(this.TacticalController);

        this.State = SettlementControllerStateFactory.MakeDevelopingState(this);
    }

    public get State(): MaraSettlementControllerState {
        return this.State;
    }
    
    public set State(value: MaraSettlementControllerState) {
        this.nextState = value;
    }
    
    Tick(tickNumber: number): void {
        this.currentUnitComposition = null;
        this.currentDevelopedUnitComposition = null;
        this.settlementLocation = null;

        for (let subcontroller of this.subcontrollers) {
            subcontroller.Tick(tickNumber);
        }
        
        if (this.nextState) {
            if (this.state) {
                this.Debug("Leaving state " + this.state.constructor.name);
                this.state.OnExit();
            }
            
            this.state = this.nextState;
            this.nextState = null;
            this.Debug("Entering state " + this.state.constructor.name);
            this.state.OnEntry();
        }

        this.state.Tick(tickNumber);
    }

    Log(level: MaraLogLevel, message: string): void {
        let logMessage = `[${this.Player.Nickname}] ${message}`;
        Mara.Log(level, logMessage);
    }

    Debug(message: string): void {
        this.Log(MaraLogLevel.Debug, message);
    }

    Info(message: string): void {
        this.Log(MaraLogLevel.Info, message);
    }

    Warning(message: string): void {
        this.Log(MaraLogLevel.Warning, message);
    }

    Error(message: string): void {
        this.Log(MaraLogLevel.Error, message);
    }

    GetCurrentEconomyComposition(): UnitComposition {
        if (!this.currentUnitComposition) {
            this.currentUnitComposition = new Map<string, number>();
        
            let units = enumerate(this.Settlement.Units);
            let unit;
            
            while ((unit = eNext(units)) !== undefined) {
                if (!MaraUtils.IsMineConfig(unit.Cfg)) {
                    MaraUtils.IncrementMapItem(this.currentUnitComposition, unit.Cfg.Uid);
                }
            }
        }

        return new Map(this.currentUnitComposition);
    }

    GetCurrentDevelopedEconomyComposition(): UnitComposition {
        if (!this.currentDevelopedUnitComposition) {
            this.currentDevelopedUnitComposition = new Map<string, number>();
        
            let units = enumerate(this.Settlement.Units);
            let unit;
            
            while ((unit = eNext(units)) !== undefined) {
                if (unit.EffectsMind.BuildingInProgress || MaraUtils.IsMineConfig(unit.Cfg) || unit.IsNearDeath) {
                    continue;
                }
                
                MaraUtils.IncrementMapItem(this.currentDevelopedUnitComposition, unit.Cfg.Uid);
            }
        }

        return new Map(this.currentDevelopedUnitComposition);
    }

    GetSettlementLocation(): SettlementLocation | null {
        if (this.settlementLocation) {
            return this.settlementLocation;
        }
        
        let professionCenter = this.Settlement.Units.Professions;
        let centralProductionBuilding = professionCenter.ProducingBuildings.First();

        if (centralProductionBuilding) {
            let squads = MaraUtils.GetSettlementsSquadsFromUnits(
                [centralProductionBuilding], 
                [this.Settlement], 
                (unit) => {return unit.Cfg.BuildingConfig != null},
                this.Settings.UnitSearch.BuildingSearchRadius
            );
            
            if (!squads || squads.length == 0) {
                return null;
            }

            let location = squads[0].GetLocation();
            let radius = Math.round((location.Spread / 2)) + 10;
            this.settlementLocation = new SettlementLocation(location.Point, radius);

            return this.settlementLocation;
        }
        else {
            return null;
        }
    }
}