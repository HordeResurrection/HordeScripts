import { IUnit } from "./IUnit";
import { ReplaceUnitParameters, TileType, UnitFlags } from "library/game-logic/horde-types";
import { mergeFlags } from "library/dotnet/dotnet-utils";
import { IHero } from "./IHero";
import { BuildingTemplate } from "../Configs/IFactory";
import { IConfig } from "./IConfig";

export class Hero_Scorpion extends IHero {
    protected static CfgUid      : string = this.CfgPrefix + "HeroScorpion";
    protected static BaseCfgUid  : string = "#UnitConfig_Nature_ScorpionMed";

    private _scorpions : Array<IUnit>;

    constructor(hordeUnit: HordeClassLibrary.World.Objects.Units.Unit) {
        super(hordeUnit);

        this.formationStartRadius = 2;
        this.formationDestiny = 2 / 3;

        this._scorpions = new Array<IUnit>();
    }

    protected static _InitHordeConfig() {
        IHero._InitHordeConfig.call(this);

        ScriptUtils.SetValue(this.Cfg, "Name", "Герой скорпион");
        ScriptUtils.SetValue(this.Cfg, "MaxHealth", 11);
        ScriptUtils.SetValue(this.Cfg, "Shield", 0);
        ScriptUtils.SetValue(this.Cfg.MainArmament.ShotParams, "Damage", 3);
        this.Cfg.Speeds.Item.set(TileType.Forest, 4);
        this.Cfg.Speeds.Item.set(TileType.Grass, 13);
    }

    public OnDestroyBuilding(buildingTemplate: BuildingTemplate, rarity: number, spawnUnitConfig: IConfig, spawnCount: number): [IConfig, number] {
        return [new IConfig(Scorpion.GetHordeConfig()), rarity + 1 + 1];    
    }

    public OnAddToFormation(unit: IUnit): void {
        IHero.prototype.OnAddToFormation.call(this, unit);

        if (unit.hordeConfig.Uid == Scorpion.GetHordeConfig().Uid) {
            this._scorpions.push(unit);
        }
    }

    public IsDead(): boolean {
        return this.hordeUnit.IsDead && this._scorpions.length == 0;
    }

    public OnEveryTick(gameTickNum: number): boolean {
        if (!IHero.prototype.OnEveryTick.call(this, gameTickNum)) {
            return false;
        }

        // удаляем мертвых скорпов
        for (var i = 0; i < this._scorpions.length; i++) {
            if (this._scorpions[i].hordeUnit.IsDead) {
                this._scorpions.splice(i--, 1);
            }
        }

        // выбираем нового вожака
        if (this.hordeUnit.IsDead && this._scorpions.length > 0) {
            // Параметры замены
            let replaceParams           = new ReplaceUnitParameters();
            replaceParams.OldUnit       = this._scorpions[0].hordeUnit;
            replaceParams.NewUnitConfig = Hero_Scorpion.GetHordeConfig();
            replaceParams.Cell = null;                  // Можно задать клетку, в которой должен появиться новый юнит. Если null, то центр создаваемого юнита совпадет с предыдущим
            replaceParams.PreserveHealthLevel = true;   // Нужно ли передать уровень здоровья? (в процентном соотношении)
            replaceParams.PreserveExperience = true;    // Нужно ли передать опыт?
            replaceParams.PreserveOrders = true;        // Нужно ли передать приказы?
            replaceParams.PreserveKillsCounter = true;  // Нужно ли передать счетчик убийств?
            replaceParams.Silent = true;                // Отключение вывода в лог возможных ошибок (при регистрации и создании модели)
    
            // Замена
            this.hordeUnit = this._scorpions[0].hordeUnit.Owner.Units.ReplaceUnit(replaceParams);
            this._scorpions.splice(0, 1);

            // удаляем из формации
            this.formation.RemoveUnits([ this ]);
        }

        return true;
    }
}

class Scorpion extends IUnit {
    protected static CfgUid      : string = this.CfgPrefix + "Scorpion";
    protected static BaseCfgUid  : string = "#UnitConfig_Nature_ScorpionMed";

    constructor(hordeUnit: any) {
        super(hordeUnit);
    }

    protected static _InitHordeConfig() {
        IUnit._InitHordeConfig.call(this);

        ScriptUtils.SetValue(this.Cfg, "Name", "Скорпион");
        ScriptUtils.SetValue(this.Cfg, "MaxHealth", 7);
        ScriptUtils.SetValue(this.Cfg, "Shield", 0);
        ScriptUtils.SetValue(this.Cfg.MainArmament.ShotParams, "Damage", 3);
        ScriptUtils.SetValue(this.Cfg, "Flags", mergeFlags(UnitFlags, this.Cfg.Flags, UnitFlags.NotChoosable));
        this.Cfg.Speeds.Item.set(TileType.Forest, 4);
        this.Cfg.Speeds.Item.set(TileType.Grass, 13);
    }
}
