import { ListT } from "library/dotnet/dotnet-types";

export const VirtualSelectUnitsMode = HordeEngine.HordeResurrection.Engine.Logic.Battle.InputSystem.Enums.VirtualSelectUnitsMode;
export const AssignOrderMode = HCL.HordeClassLibrary.UnitComponents.OrdersSystem.AssignOrderMode;
const UnitIdLabel = HCL.HordeClassLibrary.World.Objects.Units.UnitIdLabel;

const AVirtualInputItem = HordeEngine.HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.AVirtualInputItem;
const VirtualSelectUnits = HordeEngine.HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualSelectUnits;
const VirtualSelectUnitsById = HordeEngine.HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualSelectUnitsById;
const VirtualSmartMouseClick = HordeEngine.HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualSmartMouseClick;
const VirtualPointBasedCommand = HordeEngine.HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualPointBasedCommand;
const VirtualOneClickCommand = HordeEngine.HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualOneClickCommand;
const VirtualProduceBuildingCommand = HordeEngine.HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualProduceBuildingCommand;
const VirtualProduceUnitCommand = HordeEngine.HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualProduceUnitCommand;


export class PlayerVirtualInput {
	player: any;
	inputsList: any;
	private isEnabled: boolean;

	public constructor(player) {
		this.player = player;
		this.isEnabled = this.player.IsLocal;
		this.inputsList = new ListT(AVirtualInputItem);
	}

	public selectUnits(cellStart, cellEnd, selectMode = VirtualSelectUnitsMode.Select) {
		if (!this.isEnabled)
			return null;
	
		let vii = new VirtualSelectUnits(this.player, selectMode, cellStart, cellEnd);
		this.inputsList.Add(vii);
		return vii;
	}
	
	public selectUnitsById(ids, selectMode = VirtualSelectUnitsMode.Select) {
		if (!this.isEnabled)
			return null;
	
		let csIds = host.newArr(UnitIdLabel, ids.length);
		for(let i = 0; i < ids.length; i++) {
			csIds[i] = new UnitIdLabel(ids[i], this.player.GetRealSettlement().Uid);
		}
	
		let vii = new VirtualSelectUnitsById(this.player, selectMode, csIds);
		this.inputsList.Add(vii);
		return vii;
	}
	
	public smartClick(cell, assignMode = AssignOrderMode.Replace) {
		if (!this.isEnabled)
			return null;
	
		let vii = new VirtualSmartMouseClick(this.player, cell, assignMode);
		this.inputsList.Add(vii);
		return vii;
	}
	
	public pointBasedCommand(cell, cmd, assignMode = AssignOrderMode.Replace, ignoreUnits = false) {
		if (!this.isEnabled)
			return null;
	
		let vii = new VirtualPointBasedCommand(this.player, cell, cmd, assignMode);
		vii.IgnoreUnits = ignoreUnits;
		this.inputsList.Add(vii);
		return vii;
	}
	
	public oneClickCommand(cmd, assignMode = AssignOrderMode.Replace) {
		if (!this.isEnabled)
			return null;
	
		let vii = new VirtualOneClickCommand(this.player, cmd, assignMode);
		this.inputsList.Add(vii);
		return vii;
	}
	
	public produceBuildingCommand(productCfg, cellStart, cellEnd, assignMode = AssignOrderMode.Replace) {
		if (!this.isEnabled)
			return null;
	
		let vii = new VirtualProduceBuildingCommand(this.player);
		vii.CellStart = cellStart;
		vii.CellEnd = cellEnd;
		vii.ProductUnitConfigUid = productCfg;
		vii.AssignOrderMode = assignMode;
		if (cellEnd) {vii.CompoundStopOnNumber = 100;}
		this.inputsList.Add(vii);
		return vii;
	}
	
	public produceUnitCommand(productCfg, count, assignMode= AssignOrderMode.Replace) {
		if (!this.isEnabled)
			return null;
	
		let vii = new VirtualProduceUnitCommand(this.player);
		vii.ProductUnitConfigUid = productCfg;
		vii.Count = count;
		vii.AssignOrderMode = assignMode;
		this.inputsList.Add(vii);
		return vii;
	}
	
	public commit() {
		if (this.inputsList.Count == 0)
			return;
		
		this.player.VirtualInput.AddLocalScriptInputs(this.inputsList);
		this.inputsList.Clear();
	}
}
