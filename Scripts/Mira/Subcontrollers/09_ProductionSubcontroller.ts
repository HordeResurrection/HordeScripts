
//TODO: implement proper removing of a building from a target list
//TODO: probably reorganize build list to a queue

class ProductionSubcontroller extends MiraSubcontroller {
    private productionList: Array<string> = [];
    private productionIndex: Map<string, Array<any>> = new Map<string, Array<any>>();

    constructor (parent: MiraSettlementController) {
        super(parent);
    }
    
    Tick(tickNumber: number): void {
        if (tickNumber % 10 > 0) {
            return;
        }

        this.updateProductionIndex();
        
        var mmProductionDepartament = this.parentController.MasterMind.ProductionDepartment;
        var producedUnits:Array<string> = []

        for (var unitConfig of this.productionList) {
            var freeProducer = this.getProducer(unitConfig);
            
            //!! most probably doesn't work as expected since worker is always free on this tick
            if (freeProducer) {
                if (MiraUtils.RequestMasterMindProduction(unitConfig, mmProductionDepartament)) {
                    this.parentController.Log(MiraLogLevel.Debug, "Added " + unitConfig + " to the production list");
                    producedUnits.push(unitConfig);
                }
            }
        }

        if (producedUnits.length > 0) {
            this.parentController.Log(MiraLogLevel.Debug, `Removed ${producedUnits.length} units from target production list`);

            for (var cfg of producedUnits) {
                const index = this.productionList.indexOf(cfg);

                if (index > -1) {
                    this.productionList.splice(index, 1);
                }
            }
        }
    }

    public get ProductionList(): Array<string> {
        return this.productionList;
    }

    RequestProduction(buildingConfig: string): void {
        this.productionList.push(buildingConfig);
        this.parentController.Log(MiraLogLevel.Debug, "Added " + buildingConfig + " to target production list");
    }

    CancelAllProduction(): void {
        this.productionList = [];
        this.parentController.Log(MiraLogLevel.Debug, "Cleared target production list");
    }

    private getProducer(unitConfig: string): any {
        //TODO: implement engagement of workers that are busy gathering resources
        var producers = this.productionIndex.get(unitConfig);

        if (producers) {
            for (var producer of producers) {
                if (producer.OrdersMind.OrdersCount === 0) {
                    return producer;
                }
            }
        }

        return null;
    }

    private updateProductionIndex(): void {
        this.productionIndex.clear();

        var units = enumerate(this.parentController.Settlement.Units);
        var unit;
        
        while ((unit = eNext(units)) !== undefined) {
            try {
                var producerParams = unit.Cfg.GetProfessionParams(UnitProducerProfessionParams, UnitProfession.UnitProducer);
            }
            catch (e) { //GetProfessionParams throws exception if there is no such profession
                continue;
            }
            
            if (producerParams) {
                var produceList = enumerate(producerParams.CanProduceList);
                var produceListItem;

                while ((produceListItem = eNext(produceList)) !== undefined) {
                    if (this.productionIndex.has(produceListItem.Uid)) {
                        var producers = this.productionIndex.get(produceListItem.Uid);
                        producers.push(unit);
                    }
                    else {
                        this.productionIndex.set(produceListItem.Uid, [unit]);
                    }
                }
            }
        }
    }
}