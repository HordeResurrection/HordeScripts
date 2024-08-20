

export abstract class MaraCellDataHolder {
    protected data: any;

    constructor() {
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
