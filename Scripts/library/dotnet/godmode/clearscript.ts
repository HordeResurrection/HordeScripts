import { ObjectT } from "../dotnet-types";
import { createArray, mergeFlags } from "../dotnet-utils";
import { BindingFlags } from "./reflection";


/**
 * Создаёт EventSource для закрытого события, чтобы можно было использовать "connect" для обработки события.
 */
export function makePrivateEventSource(targetObject: any, eventName: string, eventArgsType: object) {

    // Получение дескриптора события (EventInfo)
    let bindingFlags = mergeFlags(BindingFlags, BindingFlags.Public, BindingFlags.NonPublic, BindingFlags.Instance)
    let eventInfo = targetObject.GetType().GetEvent(eventName, bindingFlags);
    // log.info('  EventInfo:', eventInfo);

    // Составление типа для EventSource
    let eventHandlerT = ScriptReflection.GetTypeByName('System.EventHandler`1, System.Private.CoreLib');
    let eventSourceT = ScriptReflection.GetTypeByName('Microsoft.ClearScript.EventSource`1, ClearScript.Core');
    eventSourceT = eventSourceT.MakeGenericType(eventHandlerT.MakeGenericType(eventArgsType));
    // log.info('  EventSource type:', eventSourceT);

    // Объект JS-движка
    let scriptEngine = getCurrentJsEngine();
    // log.info('  ScriptEngine:', scriptEngine);

    // Создание EventSource-объекта
    let eventSourceCtor = eventSourceT.GetConstructors(mergeFlags(BindingFlags, BindingFlags.Public, BindingFlags.NonPublic, BindingFlags.Instance))[0];
    let eventSource = eventSourceCtor.Invoke(createArray(ObjectT, [scriptEngine, targetObject, eventInfo]));
    // log.info('  EventSource:', eventSource);

    return eventSource;
}


/**
 * Возвращает js-движок этого потока.
 */
export function getCurrentJsEngine() {
    let scriptEngineHT = xHost.type(ScriptReflection.GetTypeByName("Microsoft.ClearScript.ScriptEngine, ClearScript.Core"));
    let scriptEngine = scriptEngineHT.Current;
    return scriptEngine;
}
