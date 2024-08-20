import { MaraPoint } from "../MaraPoint";
import { MaraResourceCluster } from "../Resources/MaraResourceCluster";
import { MaraResourceType } from "../Resources/MaraResourceType";


export class TargetExpandData {
    Cluster: MaraResourceCluster | null;
    ResourceType: MaraResourceType[] = [];
    BuildCenter: MaraPoint | null = null;

    constructor(cluster: MaraResourceCluster | null, resourceType: MaraResourceType[]) {
        this.Cluster = cluster;
        this.ResourceType = resourceType;
    }
}
