
export class MaraSettlementControllerSettings {
    public UnitSearch: UnitSearchSettings = new UnitSearchSettings();
    public Timeouts: TimeoutsSettings = new TimeoutsSettings();
    public Squads: SquadsSettings = new SquadsSettings();
    public ControllerStates: ControllerStatesSettings = new ControllerStatesSettings();
}

class UnitSearchSettings {
    public BuildingSearchRadius: number = 5;
    public ExpandEnemySearchRadius: number = 10;
}

class TimeoutsSettings {
    public RebuildEstimationThreshold: number = 2 * 60 * 50;
    
    public MaxBuildUpProductionTimeout: number = 3 * 60 * 50;
    public MinBuildUpProductionTimeout: number = 1 * 60 * 50;

    public UnitProductionEstimationThreshold: number = 2 * 60 * 50; //2 min
    public ExterminatingTimeout: number = 5 * 60 * 50; //5 min
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