import { UnitProducerProfessionParams, UnitProfession } from "library/game-logic/unit-professions";
import { OpCfgUidToCfg } from "../Configs/IConfig";
import { CfgAddUnitProducer } from "../Utils";
import { IComponent, COMPONENT_TYPE } from "./IComponent";

/** Компонент для алтаря героя */
export class HeroAltarComponent extends IComponent {
    /** список ид всех героев */
    heroesCfgIdxs: Array<string>;
    /** номер выбранного героя */
    selectedHeroNum: number;

    public constructor (heroesCfgIdxs: Array<string>, selectedHeroNum?: number) {
        super(COMPONENT_TYPE.HERO_ALTAR_COMPONENT);

        this.heroesCfgIdxs = heroesCfgIdxs;
        if (selectedHeroNum) {
            this.selectedHeroNum = selectedHeroNum;
        } else {
            this.selectedHeroNum = -1;
        }
    }

    public Clone() : HeroAltarComponent {
        return new HeroAltarComponent(this.heroesCfgIdxs, this.selectedHeroNum);
    }

    public InitConfig(cfg : any) {
        super.InitConfig(cfg);

        // даем профессию найма юнитов
        CfgAddUnitProducer(cfg);

        var producerParams = cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
        var produceList    = producerParams.CanProduceList;
        for (var heroCfgId of this.heroesCfgIdxs) {
            produceList.Add(OpCfgUidToCfg[heroCfgId]);
        }
    }
};