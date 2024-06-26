
/**
 * Возвращает True, если проигрывается реплей.
 * 
 * Примечание:
 * Недоступно при инициализации сцены, т.е. в "onFirstRun()". Вместо этого можно проверить на первом такте в "everyTick()".
 */
export function isReplayMode() {
    const BattleControllerT = ScriptUtils.GetTypeByName("HordeResurrection.Engine.Logic.Battle.BattleController, HordeResurrection.Engine")
    let repl = ScriptUtils.GetValue(ReflectionUtils.GetStaticProperty(BattleControllerT, "ReplayModule").GetValue(BattleControllerT), "_mode");
    return repl.ToString() == "Play";
}

/**
 * Возвращает True, если в данный момент идет сетевое сражение.
 */
export function isNetworkGame() {
    return NetworkControllerT.NetWorker != null;
}
const NetworkControllerT = HordeEngine.HordeResurrection.Engine.Logic.Main.NetworkController;
