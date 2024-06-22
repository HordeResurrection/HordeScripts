
export class MaraSettlementControllerSettings {
    public UnitSearch: UnitSearchSettings = new UnitSearchSettings();
    public Timeouts: TimeoutsSettings = new TimeoutsSettings();
    public Squads: SquadsSettings = new SquadsSettings();
    public ControllerStates: ControllerStatesSettings = new ControllerStatesSettings();
    public ResourceMining: ResourceMiningSettings = new ResourceMiningSettings();
    public CombatSettings: CombatSettings = new CombatSettings();
}

class UnitSearchSettings {
    public BuildingSearchRadius: number = 5;
    public ExpandEnemySearchRadius: number = 12;
}

class TimeoutsSettings {
    public RebuildEstimationThreshold: number = 2 * 60 * 50;
    
    public MaxBuildUpProduction: number = 3 * 60 * 50;
    public MinBuildUpProduction: number = 1 * 60 * 50;

    public UnitProductionEstimationThreshold: number = 2 * 60 * 50;
    public Exterminate: number = 5 * 60 * 50;
    
    public ExpandBuild: number = 3 * 60 * 50;
    public ExpandPrepare: number = 2 * 60 * 50;
}

class SquadsSettings {
    public MaxSpreadMultiplier: number = 2.8;
    public MinSpreadMultiplier: number = 2;
    public EnemySearchRadius: number = 10;
    public MinCombativityIndex: number = 0.25;
    public MinStrength: number = 100;
    public DefaultMovementPrecision: number = 3;
    public KiteTimeout: number = 8 * 50; // 8 sec
}

class ControllerStatesSettings {
    public ProducerProductionProbability: number = 66;
    public ExterminatingLossRatioThreshold: number = 0.33;
    public MinAttackStrength: number = 100;
    public AttackStrengthToEnemyStrengthRatio: number = 1.5;
}

class ResourceMiningSettings {
    public MinMinersPerMine: number = 3;
    public WoodcutterBatchSize: number = 5;
    public MinWoodcuttersPerSawmill: number = 3;
    public MaxWoodcuttersPerSawmill: number = 10;
    public HousingBatchSize: number = 3;

    public WoodcuttingRadius: number = 10;
    public MiningRadius: number = 15;
}

class CombatSettings {
    public ExpandDefenseStrength: number = 100;
    public MaxCompositionUnitCount: number = 40;
}