
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
import { MaraPoint, eNext, enumerate } from "./Utils/Common";
import { MaraUtils, UnitComposition } from "./Utils/MaraUtils";
import { MaraSettlementControllerSettings } from "./SettlementControllerSettings";
import { SettlementControllerStateFactory } from "./SettlementControllerStateFactory";
import { MaraResourceCluster, MaraResourceType } from "./MaraResourceMap";

export class SettlementLocation {
    Center: any;
    Radius: number;

    constructor(center: any, radius: number) {
        this.Center = center;
        this.Radius = radius;
    }
}

export class TargetExpandData {
    Cluster: MaraResourceCluster | null;
    ResourceType: MaraResourceType[] = [];
    BuildCenter: MaraPoint | null = null;

    constructor(cluster: MaraResourceCluster | null, resourceType: MaraResourceType[]) {
        this.Cluster = cluster;
        this.ResourceType = resourceType;
    }
}

export class EconomySnapshotItem {
    ConfigId: string;
    Position: MaraPoint | undefined;

    constructor(configId: string, position?: MaraPoint) {
        this.ConfigId = configId;
        this.Position = position;
    }
}

class ReservedUnitsData {
    public ReservableUnits: Array<Map<number, any>>;
    private reservedUnits: Map<number, any>;

    constructor() {
        this.reservedUnits = new Map<number, any>();
        this.ReservableUnits = [];
        
        this.ReservableUnits.push(new Map<number, any>());
        this.ReservableUnits.push(new Map<number, any>());
    }

    public ReserveUnit(unit: any): void {
        for (let map of this.ReservableUnits) {
            if (map.has(unit.Id)) {
                map.delete(unit.Id);
            }
        }

        this.reservedUnits.set(unit.Id, unit);
    }

    public FreeUnit(unit: any): boolean {
        if (!this.reservedUnits.has(unit.Id)) {
            return false;
        }
        
        this.reservedUnits.delete(unit.Id);
        return true;
    }

    public AddReservableUnits(units: Array<any>, level: number): void {
        for (let unit of units) {
            for (let i = 0; i < this.ReservableUnits.length; i++) {
                this.ReservableUnits[i].delete(unit.Id);
            }
            
            this.ReservableUnits[level].set(unit.Id, unit);
        }
    }

    public IsUnitReserved(unit: any): boolean {
        return this.reservedUnits.has(unit.Id);
    }

    public Cleanup(): void {
        this.cleanupMap(this.reservedUnits);
        
        for (let i = 0; i < this.ReservableUnits.length; i++) {
            this.cleanupMap(this.ReservableUnits[i]);
        }
    }

    private cleanupMap(map: Map<number, any>): void {
        let keysToDelete: Array<number> = [];

        map.forEach(
            (value, key) => {
                if (!value.IsAlive) {
                    keysToDelete.push(key);
                }
            }
        );

        for (let key of keysToDelete) {
            map.delete(key);
        }
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
    public TargetEconomySnapshot: Array<EconomySnapshotItem> | null = null;
    public AttackToDefenseUnitRatio: number | null = null;
    public TargetExpand: TargetExpandData | null = null;
    public Expands: Array<MaraPoint> = [];
    public ReservedUnitsData: ReservedUnitsData = new ReservedUnitsData();
    
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

        this.State = SettlementControllerStateFactory.MakeRoutingState(this);
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

        if (tickNumber % 50 == 0) {
            this.СleanupExpands();
        }

        if (tickNumber % 10 == 0) {
            this.ReservedUnitsData.Cleanup();
        }

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

    GetCurrentEconomySnapshot(): Array<EconomySnapshotItem> {
        let result: Array<EconomySnapshotItem> = [];
        
        let units = enumerate(this.Settlement.Units);
        let unit;
        
        while ((unit = eNext(units)) !== undefined) {
            let snapshotItem = new EconomySnapshotItem(unit.Cfg.Uid);
            
            if (MaraUtils.IsBuildingConfig(unit.Cfg)) {
                snapshotItem.Position = new MaraPoint(unit.Cell.X, unit.Cell.Y);
            }

            result.push(snapshotItem);
        }

        return result;
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
                (unit) => {return MaraUtils.IsBuildingConfig(unit.Cfg)},
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

    СleanupExpands(): void {
        this.Expands = this.Expands.filter(
            (value) => {
                let expandBuildings = MaraUtils.GetSettlementUnitsInArea(
                    value,
                    Math.max(this.Settings.ResourceMining.WoodcuttingRadius, this.Settings.ResourceMining.MiningRadius),
                    [this.Settlement],
                    (unit) => {return MaraUtils.IsBuildingConfig(unit.Cfg)}
                );

                return expandBuildings.length > 0;
            }
        )
    }
}