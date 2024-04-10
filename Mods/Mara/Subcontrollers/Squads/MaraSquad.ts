import { MaraUtils } from "Mara/Utils/MaraUtils";

export class MaraSquadLocation {
    Point: {
        X: number;
        Y: number;
    };
    
    Spread: number;

    constructor(x: number, y: number, spread: number) {
        this.Point = {X: x, Y: y};
        this.Spread = spread;
    }
}

export class MaraSquad {
    Units: Array<any>; //but actually Unit
    protected location: MaraSquadLocation | null;

    public get Strength(): number {
        this.cleanup();
        
        let strength = 0;
        
        for (let unit of this.Units) {
            strength += MaraUtils.GetUnitStrength(unit);
        }
        
        return strength;
    }
    
    constructor(units:Array<any>) {
        this.Units = units;
    }

    protected cleanup(): void {
        this.Units = this.Units.filter((unit) => {return unit != null && unit.IsAlive});
    }

    Tick(tickNumber: number): void {
        if (tickNumber % 10 != 0) {
            return;
        }
        
        this.location = null;
        this.cleanup();
    }

    GetLocation(): MaraSquadLocation {
        if (!this.location) {
            this.cleanup();
            
            if (this.Units.length > 0) {
                let uppermostUnit: any = null;
                let lowermostUnit: any = null;
                let leftmostUnit: any = null;
                let rightmostUnit: any = null;

                let avgPosition = {X: 0, Y: 0};
                
                for (let unit of this.Units) {
                    avgPosition.X += unit.Cell.X;
                    avgPosition.Y += unit.Cell.Y;
                    
                    if (uppermostUnit == null) {
                        uppermostUnit = unit;
                    }

                    if (lowermostUnit == null) {
                        lowermostUnit = unit;
                    }

                    if (leftmostUnit == null) {
                        leftmostUnit = unit;
                    }

                    if (rightmostUnit == null) {
                        rightmostUnit = unit;
                    }

                    if (unit !== uppermostUnit && unit.Cell.Y < uppermostUnit.Cell.Y) {
                        uppermostUnit = unit;
                    }

                    if (unit !== lowermostUnit && unit.Cell.Y > lowermostUnit.Cell.Y) {
                        lowermostUnit = unit;
                    }

                    if (unit !== leftmostUnit && unit.Cell.X < leftmostUnit.Cell.X) {
                        leftmostUnit = unit;
                    }

                    if (unit !== rightmostUnit && unit.Cell.X > rightmostUnit.Cell.X) {
                        rightmostUnit = unit;
                    }
                }

                let verticalSpread = lowermostUnit.Cell.Y - uppermostUnit.Cell.Y;
                let horizontalSpread = rightmostUnit.Cell.X - leftmostUnit.Cell.X;
                let spread = Math.max(verticalSpread, horizontalSpread);

                this.location = new MaraSquadLocation(
                    Math.round(avgPosition.X / this.Units.length),
                    Math.round(avgPosition.Y / this.Units.length),
                    spread
                );
            }
            else {
                this.location = new MaraSquadLocation(0, 0, 0);
            }
        }

        return this.location;
    }

    IsAllUnitsIdle(): boolean {
        this.cleanup();

        for (let unit of this.Units) {
            if (!unit.OrdersMind.IsIdle()) {
                return false;
            }
        }

        return true;
    }

    AddUnits(units: Array<any>): void {
        this.cleanup();

        this.Units.push(...units);
        this.location = null;

        this.onUnitsAdded();
    }

    protected onUnitsAdded(): void {
        //do nothing
    }
}