//TODO: these are obsolete, get rid of this in the future

export function* enumerate(enumerable) {
    var IEnumeratorT = xHost.type('System.Collections.IEnumerator');
    var enumerator = xHost.cast(IEnumeratorT, enumerable.GetEnumerator());
    while (enumerator.MoveNext()) {
        yield enumerator.Current;
    }
    
    var IDisposableT = xHost.type('System.IDisposable');
    xHost.cast(IDisposableT, enumerator).Dispose();
}

export function eNext(enumerated) {
    var next = enumerated.next();
    if (next.done)
        return undefined;
    return next.value;
}

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