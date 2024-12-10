
/**
 * Возвращает True, если проигрывается реплей.
 * 
 * Примечание:
 * Недоступно при инициализации сцены, т.е. в "onFirstRun()". Вместо этого можно проверить на первом такте в "everyTick()".
 */
export function isReplayMode() {
    return HordeEngine.HordeResurrection.Engine.Logic.Battle.BattleController.IsReplayMode;
}

/**
 * Возвращает True, если в данный момент идет сетевое сражение.
 */
export function isNetworkGame() {
    return HordeEngine.HordeResurrection.Engine.Logic.Main.NetworkController.NetWorker != null;
}
