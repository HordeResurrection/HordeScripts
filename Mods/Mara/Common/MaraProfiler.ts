import { Mara } from "../Mara";

export class MaraProfiler {
    private message: string;
    private callCount: number;
    private executionTime: number;
    private startTime: number;

    constructor(message: string, start: boolean = false) {
        this.message = message;
        this.callCount = 0;
        this.executionTime = 0;

        if (start) {
            this.Start();
        }
    }

    public Print(): void {
        Mara.Debug(`${this.message} took ${this.executionTime} ms, call count: ${this.callCount}`);
    }

    public Profile(call: () => void): void {
        this.Start();
        try {
            call();
        }
        finally {
            this.Stop();
        }
    }

    public Start(): void {
        this.startTime = Date.now();
    }

    public Stop(print: boolean = false) {
        this.executionTime += Date.now() - this.startTime;
        this.callCount++;

        if (print) {
            this.Print();
        }
    }
}
