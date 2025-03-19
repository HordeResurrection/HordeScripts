import { SettlementSubcontrollerTask } from "../SettlementSubcontrollerTasks/SettlementSubcontrollerTask";

export class SubcontrollerRequestResult {
    IsSuccess: boolean;
    Task: SettlementSubcontrollerTask | null;
}