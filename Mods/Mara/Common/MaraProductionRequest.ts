import { BuildTrackerType } from "library/mastermind/matermind-types";
import { MaraUtils } from "../MaraUtils";
import { MaraPoint } from "./MaraPoint";

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
        else {
            this.IsForce = false;
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
