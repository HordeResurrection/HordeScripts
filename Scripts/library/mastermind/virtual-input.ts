import { Point2D } from "library/common/primitives";
import { ListT } from "library/dotnet/dotnet-types";
import { Player, UnitCommand } from "library/game-logic/horde-types";

export const VirtualSelectUnitsMode = HordeResurrection.Engine.Logic.Battle.InputSystem.Enums.VirtualSelectUnitsMode;
export type VirtualSelectUnitsMode = HordeResurrection.Engine.Logic.Battle.InputSystem.Enums.VirtualSelectUnitsMode;
export const AssignOrderMode = HordeClassLibrary.UnitComponents.OrdersSystem.AssignOrderMode;
export type AssignOrderMode = HordeClassLibrary.UnitComponents.OrdersSystem.AssignOrderMode;
const UnitIdLabel = HordeClassLibrary.World.Objects.Units.UnitIdLabel;
type UnitIdLabel = HordeClassLibrary.World.Objects.Units.UnitIdLabel;

const AVirtualInputItem = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.AVirtualInputItem;
type AVirtualInputItem = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.AVirtualInputItem;
const VirtualSelectUnits = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualSelectUnits;
type VirtualSelectUnits = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualSelectUnits;
const VirtualSelectUnitsById = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualSelectUnitsById;
type VirtualSelectUnitsById = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualSelectUnitsById;
const VirtualSmartMouseClick = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualSmartMouseClick;
type VirtualSmartMouseClick = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualSmartMouseClick;
const VirtualPointBasedCommand = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualPointBasedCommand;
type VirtualPointBasedCommand = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualPointBasedCommand;
const VirtualOneClickCommand = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualOneClickCommand;
type VirtualOneClickCommand = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualOneClickCommand;
const VirtualProduceBuildingCommand = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualProduceBuildingCommand;
type VirtualProduceBuildingCommand = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualProduceBuildingCommand;
const VirtualProduceUnitCommand = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualProduceUnitCommand;
type VirtualProduceUnitCommand = HordeResurrection.Engine.Logic.Battle.InputSystem.InputItems.VirtualProduceUnitCommand;


export class PlayerVirtualInput {
	player: any;
	inputsList: any;
	private isEnabled: boolean;

	public constructor(player: Player) {
		this.player = player;
		this.isEnabled = this.player.IsLocal;
		this.inputsList = new ListT<AVirtualInputItem>(AVirtualInputItem);
	}

	public selectUnits(cellStart: Point2D, cellEnd: Point2D, selectMode = VirtualSelectUnitsMode.Select) {
		if (!this.isEnabled)
			return null;

		let vii = new VirtualSelectUnits(this.player, selectMode, cellStart, cellEnd);
		this.inputsList.Add(vii);
		return vii;
	}

	public selectUnitsById(ids: number[], selectMode = VirtualSelectUnitsMode.Select) {
		if (!this.isEnabled)
			return null;

		let csIds = host.newArr(UnitIdLabel, ids.length) as UnitIdLabel[];
		for (let i = 0; i < ids.length; i++) {
			csIds[i] = new UnitIdLabel(ids[i], this.player.GetRealSettlement().Uid);
		}

		let vii = new VirtualSelectUnitsById(this.player, selectMode, csIds);
		this.inputsList.Add(vii);
		return vii;
	}

	public smartClick(cell: Point2D, assignMode = AssignOrderMode.Replace) {
		if (!this.isEnabled)
			return null;

		let vii = new VirtualSmartMouseClick(this.player, cell, assignMode);
		this.inputsList.Add(vii);
		return vii;
	}

	public pointBasedCommand(cell: Point2D, cmd: UnitCommand, assignMode = AssignOrderMode.Replace, ignoreUnits = false) {
		if (!this.isEnabled)
			return null;

		let vii = new VirtualPointBasedCommand(this.player, cell, cmd, assignMode);
		vii.IgnoreUnits = ignoreUnits;
		this.inputsList.Add(vii);
		return vii;
	}

	public oneClickCommand(cmd: UnitCommand, assignMode = AssignOrderMode.Replace) {
		if (!this.isEnabled)
			return null;

		let vii = new VirtualOneClickCommand(this.player, cmd, assignMode);
		this.inputsList.Add(vii);
		return vii;
	}

	public produceBuildingCommand(productCfgUid: string, cellStart: Point2D, cellEnd: Point2D | null, assignMode = AssignOrderMode.Replace) {
		if (!this.isEnabled)
			return null;

		let vii = new VirtualProduceBuildingCommand(this.player);
		vii.CellStart = cellStart;
		vii.CellEnd = cellEnd;
		vii.ProductUnitConfigUid = productCfgUid;
		vii.AssignOrderMode = assignMode;
		if (cellEnd) { vii.CompoundStopOnNumber = 100; }
		this.inputsList.Add(vii);
		return vii;
	}

	public produceUnitCommand(productCfgUid: string, count: number, assignMode = AssignOrderMode.Replace) {
		if (!this.isEnabled)
			return null;

		let vii = new VirtualProduceUnitCommand(this.player);
		vii.ProductUnitConfigUid = productCfgUid;
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
