import { MaraCellDataHolder } from "../MaraCellDataHolder";
import { MaraPoint } from "../MaraPoint";

export class MaraCellIndex extends MaraCellDataHolder {
    Get(cell: any): any {
        let index = this.makeIndex(cell);
        return (this.data[index] ?? false);
    }

    Set(cell: any, value: any) {
        let index = this.makeIndex(cell);
        this.data[index] = value;
    }

    SetMany(cells: Array<MaraPoint>) {
        cells.forEach((v) => this.Set(v, true));
    }
}
