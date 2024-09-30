import { MaraResourceType } from "./MaraResourceType";

export class MaraResources {
    public get Wood(): number {
        return this.resources.get(MaraResourceType.Wood)!;
    }

    public set Wood(value: number) {
        this.resources.set(MaraResourceType.Wood, value);
    }

    public get Metal(): number {
        return this.resources.get(MaraResourceType.Metal)!;
    }

    public set Metal(value: number) {
        this.resources.set(MaraResourceType.Metal, value);
    }

    public get Gold(): number {
        return this.resources.get(MaraResourceType.Gold)!;
    }

    public set Gold(value: number) {
        this.resources.set(MaraResourceType.Gold, value);
    }

    public get People(): number {
        return this.resources.get(MaraResourceType.People)!;
    }

    public set People(value: number) {
        this.resources.set(MaraResourceType.People, value);
    }

    public get Resources(): Map<MaraResourceType, number> {
        return this.resources;
    }

    private resources = new Map<MaraResourceType, number>();

    constructor(wood: number, metal: number, gold: number, people: number) {
        this.resources.set(MaraResourceType.Gold, gold);
        this.resources.set(MaraResourceType.Metal, metal);
        this.resources.set(MaraResourceType.People, people);
        this.resources.set(MaraResourceType.Wood, wood);
    }

    public ToString(): string {
        return `W: ${this.Wood}, M: ${this.Metal}, G: ${this.Gold}, P: ${this.People}`;
    }
}
