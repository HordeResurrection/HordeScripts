import { setUnitStateWorker } from "library/game-logic/workers-tools";
import { IUnit } from "./IUnit";
import { GlobalVars } from "../GlobalData";
import { UnitCommand, UnitState } from "library/game-logic/horde-types";
import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { CfgAddUnitProducer } from "../Utils";

export type CallbackFunctionType = (unit: any) => void;

export class IProducerUnit extends IUnit {
    public static produceCallbacks : Array<CallbackFunctionType>;

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
        setUnitStateWorker(GlobalVars.plugin, GlobalVars.configs[this.CfgUid], UnitState.Produce, function (u: any) {
            if(u.Owner.Resources.TakeResourcesIfEnough(u.OrdersMind.ActiveOrder.ProductUnitConfig.CostResources)) {
                that.produceCallbacks.forEach(callback => {
                    callback(u);
                });
                // отменяем приказы
                u.OrdersMind.CancelOrdersSafe(true);
            }
        });
    }
}