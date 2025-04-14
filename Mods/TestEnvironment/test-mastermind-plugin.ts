import { Settlement, UnitConfig } from "library/game-logic/horde-types";
import { MasterMind, ProductionDepartment } from "library/mastermind/mastermind-types";
import HordePluginBase from "plugins/base-plugin";


/**
 * Тестирование MasterMind.
 */
export class TestMastermindPlugin extends HordePluginBase {
    startTick: number;
    isEnabled: boolean = true;

    productionDepartament: ProductionDepartment;
    settlement: Settlement;
    buildingsRequestedFlag: boolean = false;

    public constructor() {
        super("Mastermind Test");
        this.startTick = DataStorage.gameTickNum;
    }

    public onFirstRun() {
        let realPlayer = Players["1"].GetRealPlayer();
        if (!this._activateMasterMind(realPlayer.MasterMind)) {
            this.isEnabled = false;
            return;
        }
        this.settlement = realPlayer.GetRealSettlement();        
        this.productionDepartament = realPlayer.MasterMind.ProductionDepartment;
        
        this.log.info("START", this.settlement);
    }

    public onEveryTick(gameTickNum: number) {
        if (!this.isEnabled) {
            return;
        }

        if (gameTickNum - this.startTick == 10) {
            // this.requestFarms(5);
            this.requestWorkers(5);
        }

        if (!this.buildingsRequestedFlag && (gameTickNum % 10 == 0) &&  this.settlement.Units.Professions.Workers.Count >= 1) {
            this.requestBuildings(3);
            this.buildingsRequestedFlag = true;
        }
    }

    // =================== //
    // Utils
    // ------------------- //

    private requestWorkers(num: number) {
        const workerCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Worker1");
        for (let i = 0; i < num; i++) {
            this._addRequest(workerCfg);
        }
        this.log.info(`Created (${num}) workers request for`, this.settlement);
    }

    private requestBuildings(num: number) {
        const farmCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Farm");
        const barrakCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Barrack");
        const millCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Mill");
        const stablesCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Stables");
        const mineCfg = HordeContentApi.GetUnitConfig("#UnitConfig_Slavyane_Mine");

        for (let i = 0; i < num; i++) {
            this._addRequest(farmCfg);
        }
        for (let i = 0; i < num; i++) {
            this._addRequest(barrakCfg);
        }
        for (let i = 0; i < num; i++) {
            this._addRequest(millCfg);
        }
        for (let i = 0; i < num; i++) {
            this._addRequest(stablesCfg);
        }
        for (let i = 0; i < num; i++) {
            this._addRequest(mineCfg);
        }

        this.log.info(`Created (${num}) buildings request for`, this.settlement);
    }

    private _addRequest(uCfg: UnitConfig) {
        this.productionDepartament.AddRequestToProduce(uCfg, 1, null, false);
    }
    
    private _activateMasterMind(masterMind: MasterMind): boolean {
        if (!masterMind) {
            this.log.info('Выбранный игрок не управляется MasterMind.');
            return false;
        }
        
        if (!masterMind.IsWorkMode) {
            masterMind.IsWorkMode = true;
            this.log.info('MasterMind активирован:', masterMind);
        } else {
            this.log.info('MasterMind уже был активирован:', masterMind);
        }

        return true;
    }
}
