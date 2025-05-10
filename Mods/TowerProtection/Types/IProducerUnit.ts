import { IUnit } from "./IUnit";
import { GlobalVars } from "../GlobalData";
import { UnitState } from "library/game-logic/horde-types";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { CfgAddUnitProducer, setUnitStateWorker } from "../Utils";

export type CallbackFunctionType = (unit: any) => void;

export class IProducerUnit extends IUnit {
    public static produceCallbacks : Array<CallbackFunctionType>;
    //public static TESTNUM : number = 0;

    constructor (unit: any, teamNum: number) {
        super(unit, teamNum);
    }

    public static InitConfig() {
        IUnit.InitConfig.call(this);

        this.produceCallbacks = new Array<CallbackFunctionType>();

        // даем профессию найма
        CfgAddUnitProducer(GlobalVars.configs[this.CfgUid]);
        // очищаем список построек
        var producerParams = GlobalVars.configs[this.CfgUid].GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        produceList.Clear();

        // задаем кастомный обработчик постройки
        var that = this;
        //var testNum = this.TESTNUM;
        //log.info("подписываемся на постройку у ", this.CfgUid, " class ", this.name, " TESTNUM = ", this.TESTNUM++);
        setUnitStateWorker(GlobalVars.plugin, GlobalVars.configs[this.CfgUid], UnitState.Produce, function (u: any) {
            //log.info("пошла стройка у ", u.Cfg.Uid, " class ", that.name, " testNum ", testNum);
            if(u.Owner.Resources.TakeResourcesIfEnough(u.OrdersMind.ActiveOrder.ProductUnitConfig.CostResources)) {
                //log.info("списали деньги, количество колбэков ", that.produceCallbacks.length);
                that.produceCallbacks.forEach(callback => {
                    //log.info("вызываем колбэк");
                    callback(u);
                });
                // отменяем приказы
                u.OrdersMind.CancelOrdersSafe(true);
            }
        });
    }
}
