import { MaraUtils } from "../../MaraUtils";
import { MaraPoint } from "../MaraPoint";

export class MaraPath {
    Nodes: Array<MaraPoint>;
    Length: number;

    constructor(nodes: Array<MaraPoint>) {
        this.Nodes = nodes;

        let length = 0;

        for (let i = 0; i < nodes.length - 1; i ++) {
            length += MaraUtils.ChebyshevDistance(nodes[i], nodes[i + 1]);
        }

        this.Length = length;
    }
}