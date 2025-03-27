
export class MaraSettlementControllerSettings {
    public UnitSearch: UnitSearchSettings = new UnitSearchSettings();
    public Timeouts: TimeoutsSettings = new TimeoutsSettings();
    public Squads: SquadsSettings = new SquadsSettings();
    public ControllerStates: ControllerStatesSettings = new ControllerStatesSettings();
    public ResourceMining: ResourceMiningSettings = new ResourceMiningSettings();
    public Combat: CombatSettings = new CombatSettings();
}

class UnitSearchSettings {
    public BuildingSearchRadius: number = 5;
    public ExpandEnemySearchRadius: number = 12;
}

class TimeoutsSettings {
    public MaxBuildUpProduction: number = 2 * 60 * 50;
    public MinBuildUpProduction: number = 0.5 * 60 * 50;

    public Exterminate: number = 5 * 60 * 50;
    public Develop: number = 2 * 60 * 50;
    
    public ExpandBuild: number = 1.5 * 60 * 50;
    public ExpandPrepare: number = 5 * 60 * 50;

    public StrategyActionSuccessMinCooldown = 30 * 50;
    public StrategyActionSuccessMaxCooldown = 1 * 60 * 50;

    public StrategyActionReattemptMinCooldown = 20 * 50;
    public StrategyActionReattemptMaxCooldown = 1 * 60 * 50;

    public SettlementEnhanceMinCooldown = 1.5 * 60 * 50;
    public SettlementEnhanceMaxCooldown = 6 * 60 * 50;
    
    public UnfinishedConstructionThreshold: number = 2 * 60 * 50;
}

class SquadsSettings {
    public MaxSpreadMultiplier: number = 2.8;
    public MinSpreadMultiplier: number = 2;
    public EnemySearchRadius: number = 10;
    public MinCombativityIndex: number = 0.25;
    public MinStrength: number = 100;
    public DefaultMovementPrecision: number = 3;
    public KiteTimeout: number = 8 * 50;
    public KiteThresholdPositionChangeDistance: number = 5;
    public GatherUpTimeout = 5 * 50;

    public DebugSquads: boolean = false;
}

class ControllerStatesSettings {
    public DefenceConstructionToAttackProbabilityRatio = 0.4;
    
    public ExterminatingLossRatioThreshold: number = 0.33;
    public MinAttackStrength: number = 100;

    public MaxHarvesterProductionBatch: number = 6;
    public MaxSameCfgIdProducerCount: number = 3;
}

class ResourceMiningSettings {
    public MinMinersPerMine: number = 3;
    public WoodcutterBatchSize: number = 5;
    public MinWoodcuttersPerSawmill: number = 3;
    public MaxWoodcuttersPerSawmill: number = 10;
    public HousingBatchSize: number = 3;

    public WoodcuttingRadius: number = 10;
    public MiningRadius: number = 15;

    public MinResourceClusterDistanceSpread: number = 10;
}

class CombatSettings {
    public PointDefenseBatchStrength: number = 100;
    public MaxCompositionUnitCount: number = 20;
    public MaxUsedOffensiveCfgIdCount: number = 4;
    public MaxUsedDefensiveCfgIdCount: number = 1;
    
    public OffensiveToDefensiveRatios: Array<number> = [1, 0.75, 0.5, 0.25, 0];
    public AttackStrengthToEnemyStrengthRatio: number = 1.5;
    public UnitSpeedClusterizationThresholds: Array<number> = [9, 14]; //this must be in ascending order
}