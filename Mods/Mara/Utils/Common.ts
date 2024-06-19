import { BuildTrackerType, MaraUtils } from "./MaraUtils";

export abstract class FsmState {
    abstract OnEntry(): void;
    abstract OnExit(): void;
    abstract Tick(tickNumber: number): void;
}

export class MaraPoint {
    public readonly X: number;
    public readonly Y: number;

    constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }

    public ToString(): string {
        return `${this.X};${this.Y}`
    }

    public EqualsTo(other: MaraPoint): boolean {
        return this.X == other.X && this.Y == other.Y;
    }
}

export class MaraResources {
    public Wood: number;
    public Metal: number;
    public Gold: number;
    public People: number;

    constructor(wood: number, metal: number, gold: number, people: number) {
        this.Wood = wood;
        this.Metal = metal;
        this.Gold = gold;
        this.People = people;
    }

    public ToString(): string {
        return `W: ${this.Wood}, M: ${this.Metal}, G: ${this.Gold}, P: ${this.People}`;
    }
}

export class MaraProductionRequest {
    public ConfigId: string;
    public Point: MaraPoint | null;
    public Precision: number | null;
    public IsForce: boolean = false;
    public ProducedUnit: any = null;
    public Executor: any = null;
    
    public get MasterMindRequest(): any {
        return this.masterMindRequest;
    }

    public set MasterMindRequest(value: any) {
        this.masterMindRequest = value;

        if (value == null) {
            return;
        }

        let that = this;

        this.trackerChangedHandler = this.masterMindRequest.TrackerChanged.connect(
            function (sender, args) {
                let tracker = MaraUtils.GetPropertyValue(args, "NewTracker");
                let buildTracker;
                
                try {
                    buildTracker = MaraUtils.CastToType(tracker, BuildTrackerType);

                    if (!buildTracker) {
                        return;
                    }
                }
                catch (ex) {
                    return;
                }

                let unit = MaraUtils.GetPropertyValue(buildTracker, "TrackUnit");
                that.ProducedUnit = unit;
            }
        );
    }

    private masterMindRequest: any = null;
    private trackerChangedHandler: any = null;

    constructor(
        configId: string, 
        point: MaraPoint | null, 
        precision: number | null, 
        isForce?: boolean
    ) {
        this.ConfigId = configId;
        this.Point = point;
        this.Precision = precision;

        if (isForce != null) {
            this.IsForce = isForce;
        }
    }

    public get IsCompleted(): boolean {
        if (this.MasterMindRequest) {
            return !this.MasterMindRequest.State.IsUnfinished();
        }
        else {
            return false;
        }
    }

    public get IsSuccess(): boolean {
        if (this.MasterMindRequest) {
            return this.MasterMindRequest.State.IsSuccessfullyCompleted();
        }
        else {
            return false;
        }
    }

    public WipeResults(): void {
        this.ProducedUnit = null;
        this.masterMindRequest = null;
        this.Executor = null;
    }

    public OnProductionFinished(): void {
        if (this.trackerChangedHandler) {
            this.trackerChangedHandler.disconnect();
        }
    }

    public EqualsTo(other: MaraProductionRequest): boolean {
        return (
            this.ConfigId == other.ConfigId &&
            this.Point?.X == other.Point?.X &&
            this.Point?.Y == other.Point?.Y &&
            (this.Precision == null || this.Precision == other.Precision)
        );
    }

    public ToString(): string {
        let location: string; 
        
        if (this.Point) {
            location = this.Point.ToString();
        }
        else {
            location = "any location";
        }
        
        return `${this.ConfigId} at (${location}):${this.Precision}`;
    }
}

export abstract class MaraCellDataHolder {
    protected data: any;
    
    constructor () {
        this.Clear();
    }

    abstract Get(cell: any): any;
    abstract Set(cell: any, value: any): void;

    Clear(): void {
        this.data = {};
    }

    protected makeIndex(cell: any): string {
        return `(${cell.X},${cell.Y})`;
    }
}