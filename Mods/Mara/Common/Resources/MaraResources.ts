


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
