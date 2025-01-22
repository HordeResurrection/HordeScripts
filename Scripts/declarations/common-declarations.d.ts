
// Static Utils
declare function ForEach(enumerable: any, action: (item: any, i: number, sourceEnumerable: object) => void): void;
declare const ScriptUtils: typeof HordeClassLibrary.Scripting.ScriptApi.ScriptUtils;
declare const HordeContentApi: typeof HordeClassLibrary.Scripting.ScriptApi.HordeContentApi;
declare const ScriptExtensions: typeof HordeClassLibrary.Scripting.ScriptApi.ScriptExtensions;
declare const ScriptMachineDebugApi: HordeClassLibrary.Scripting.ScriptApi.ScriptMachineDebugApi;

// Global variables
declare const ActiveScena: HordeClassLibrary.World.ScenaComponents.Scena;
declare const Players: HordeResurrection.Engine.Logic.Main.Players.Player[];

// Global storages
declare const DataStorage: { [key: string]: any; };
declare const UnitWorkersRegistry: HordeClassLibrary.Scripting.Misc.ScriptWorkersRegistry;
declare const BulletWorkersRegistry: HordeClassLibrary.Scripting.Misc.ScriptWorkersRegistry;
// declare namespace DataStorage {
//     scriptWorkTicks: number;
//     reloadCounter: number;
//     gameTickNum: number;
// }

// DebugLogger
declare class DebugLogger {
    public static WriteLine(message: string): void;
}

// Host functions
declare const host: HostFunctions;
declare class HostFunctions {
    // Тут перечислены только некоторые методы.
    // Полный список: https://microsoft.github.io/ClearScript/Reference/html/Methods_T_Microsoft_ClearScript_HostFunctions.htm

    /**
     * Метод для создания DotNet-массивов.
     * После создания, необходимо вручную выполнить каст объекта через "as".
     * 
     * Пример:
     * ```
     * host.newArr(UnitIdLabel, ids.length) as UnitIdLabel[]
     * ```
     */
    public newArr(hostType: object, ...length: number[]): object[];

    /**
     * Метод для каста DotNet-объектов.
     * Поэтому, в коде TS, возвращаемое значение нужно дополнительно кастовать через "as".
     * 
     * Пример:
     * ```
     * (host.cast(IDisposableT, enumerator) as IDisposableT).Dispose();
     * ```
     */
    public cast(hostType: object, obj: any): any;

    /**
     * Метод для проверки типа DotNet-объектов.
     */
    public isType(hostType: object, obj: any): boolean;

    /**
     * Метод для создания ref-объектов для передачи в методы в качестве out/ref-аргументов.
     */
    public newVar(hostType: object, initValue?: any): refObject<any>;

    /**
     * Создаёт делегат на указанную функцию без возвращаемого значения.
     */
    public func(argCount: number, scriptFunc: (...arg: any[]) => void);

    /**
     * Создаёт делегат на указанную функцию с возвращаемым значением.
     */
    public func(returnHostType: object, argCount: number, scriptFunc: (...arg: any[]) => any);
    
    /**
     * Возвращает .Net-тип для указанного хост-типа.
     * Внимание! Метод работает только в unsafe-режиме скрипт-машины.
     */
    public typeOf(hostType: object): any;
}

/**
 * Ref-объект для работы с методами с out/ref-параметрами.
 */
declare class refObject<T> {
    public value: T;
    public readonly ref: T;
    public readonly out: T;
}

///////////////////////////////////
// Unsafe utils

declare class ScriptReflection {

}
declare class xHost {

}
