
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
import { MaraPoint } from "./Common/MaraPoint";
import { MaraUtils } from "./MaraUtils";
import { UnitComposition } from "./Common/UnitComposition";
import { MaraSettlementControllerSettings } from "./Common/Settlement/SettlementControllerSettings";
import { SettlementControllerStateFactory } from "./Common/Settlement/SettlementControllerStateFactory";
import { SettlementClusterLocation } from "./Common/Settlement/SettlementClusterLocation";
import { TargetExpandData } from "./Common/Settlement/TargetExpandData";
import { EconomySnapshotItem } from "./Common/Settlement/EconomySnapshotItem";
import { MaraRect } from "./Common/MaraRect";
import { MaraUnitCacheItem } from "./Common/Cache/MaraUnitCacheItem";
import { MaraUnitCache } from "./Common/Cache/MaraUnitCache";

class ReservedUnitsData {
    public ReservableUnits: Array<Map<number, MaraUnitCacheItem>>;
    private reservedUnits: Map<number, MaraUnitCacheItem>;

    constructor() {
        this.reservedUnits = new Map<number, MaraUnitCacheItem>();
        this.ReservableUnits = [];
        
        this.ReservableUnits.push(new Map<number, MaraUnitCacheItem>());
        this.ReservableUnits.push(new Map<number, MaraUnitCacheItem>());
    }

    public ReserveUnit(unit: MaraUnitCacheItem): void {
        for (let map of this.ReservableUnits) {
            if (map.has(unit.UnitId)) {
                map.delete(unit.UnitId);
            }
        }

        this.reservedUnits.set(unit.UnitId, unit);
    }

    public FreeUnit(unit: MaraUnitCacheItem): boolean {
        if (!this.reservedUnits.has(unit.UnitId)) {
            return false;
        }
        
        this.reservedUnits.delete(unit.UnitId);
        return true;
    }

    public AddReservableUnits(units: Array<MaraUnitCacheItem>, level: number): void {
        for (let unit of units) {
            for (let i = 0; i < this.ReservableUnits.length; i++) {
                this.ReservableUnits[i].delete(unit.UnitId);
            }
            
            this.ReservableUnits[level].set(unit.UnitId, unit);
        }
    }

    public IsUnitReserved(unit: MaraUnitCacheItem): boolean {
        return this.reservedUnits.has(unit.UnitId);
    }

    public Cleanup(): void {
        this.cleanupMap(this.reservedUnits);
        
        for (let i = 0; i < this.ReservableUnits.length; i++) {
            this.cleanupMap(this.ReservableUnits[i]);
        }
    }

    private cleanupMap(map: Map<number, MaraUnitCacheItem>): void {
        let keysToDelete: Array<number> = [];

        map.forEach(
            (value, key) => {
                if (!value.Unit.IsAlive) {
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
    public CanMineResources: boolean = true;
    
    private subcontrollers: Array<MaraSubcontroller> = [];
    private state: MaraSettlementControllerState;
    private nextState: MaraSettlementControllerState | null;
    private currentUnitComposition: UnitComposition | null;
    private currentDevelopedUnitComposition: UnitComposition | null;
    private settlementLocation: SettlementClusterLocation | null;

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
        return this.state;
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
                this.Debug(`Leaving state ${this.state.constructor.name}`);
                this.state.OnExit();
            }
            
            this.state = this.nextState;
            this.nextState = null;
            this.Debug(`Entering state ${this.state.constructor.name}, tick ${tickNumber}`);
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
            let units = MaraUtils.GetAllSettlementUnits(this.Settlement);
            
            for (let unit of units) {
                if (!MaraUtils.IsMineConfigId(unit.UnitCfgId)) {
                    MaraUtils.IncrementMapItem(this.currentUnitComposition, unit.UnitCfgId);
                }
            }
        }

        return new Map(this.currentUnitComposition);
    }

    GetCurrentEconomySnapshot(): Array<EconomySnapshotItem> {
        let result: Array<EconomySnapshotItem> = [];
        let units = MaraUtils.GetAllSettlementUnits(this.Settlement);
        
        for (let unit of units) {
            let snapshotItem = new EconomySnapshotItem(unit.UnitCfgId);
            
            if (MaraUtils.IsBuildingConfigId(unit.UnitCfgId)) {
                snapshotItem.Position = unit.UnitCell;
            }

            result.push(snapshotItem);
        }

        return result;
    }

    GetCurrentDevelopedEconomyComposition(): UnitComposition {
        if (!this.currentDevelopedUnitComposition) {
            this.currentDevelopedUnitComposition = new Map<string, number>();
        
            let units = MaraUtils.GetAllSettlementUnits(this.Settlement);
            
            for (let unit of units) {
                if (unit.Unit.EffectsMind.BuildingInProgress || MaraUtils.IsMineConfigId(unit.UnitCfgId) || unit.Unit.IsNearDeath) {
                    continue;
                }
                
                MaraUtils.IncrementMapItem(this.currentDevelopedUnitComposition, unit.UnitCfgId);
            }
        }

        return new Map(this.currentDevelopedUnitComposition);
    }

    GetSettlementLocation(): SettlementClusterLocation | null {
        if (this.settlementLocation) {
            return this.settlementLocation;
        }
        
        let professionCenter = this.Settlement.Units.Professions;
        let centralProductionBuilding = professionCenter.ProducingBuildings.First();

        if (centralProductionBuilding) {
            let productionBuildingCache = MaraUnitCache.GetUnitById(centralProductionBuilding.Id)!;

            let squads = MaraUtils.GetSettlementsSquadsFromUnits(
                [productionBuildingCache], 
                [this.Settlement], 
                (unit) => {return MaraUtils.IsBuildingConfigId(unit.UnitCfgId)},
                this.Settings.UnitSearch.BuildingSearchRadius
            );
            
            if (!squads || squads.length == 0) {
                return null;
            }

            let location = squads[0].GetLocation();
            let boundingRect = MaraUtils.GetUnitsBoundingRect(squads[0].Units);
            
            this.settlementLocation = new SettlementClusterLocation(
                location.Point,
                new MaraRect(
                    new MaraPoint(boundingRect.TopLeft.X - 10, boundingRect.TopLeft.Y - 10),
                    new MaraPoint(boundingRect.BottomRight.X + 10, boundingRect.BottomRight.Y + 10),
                )
            );

            return this.settlementLocation;
        }
        else {
            return null;
        }
    }

    СleanupExpands(): void {
        this.Expands = this.Expands.filter(
            (value) => {
                let expandBuildings = MaraUtils.GetSettlementUnitsAroundPoint(
                    value,
                    Math.max(this.Settings.ResourceMining.WoodcuttingRadius, this.Settings.ResourceMining.MiningRadius),
                    [this.Settlement],
                    (unit) => {return MaraUtils.IsBuildingConfigId(unit.UnitCfgId)}
                );

                return expandBuildings.length > 0;
            }
        )
    }
}