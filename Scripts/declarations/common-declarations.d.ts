
// =============================================================================================
// === Глобальные игровые переменные
// =============================================================================================

//#region Game variables

/**
 * Сцена, на которой происходит текущее сражение.
 */
declare const ActiveScena: HordeClassLibrary.World.ScenaComponents.Scena;

/**
 * Массив игроков-участников текущего сражения.
 */
declare const Players: HordeResurrection.Engine.Logic.Main.Players.Player[];

/**
 * Здесь хранятся обработчики юнитов.
 */
declare const UnitWorkersRegistry: HordeClassLibrary.Scripting.Misc.ScriptWorkersRegistry;

/**
 * Здесь хранятся обработчики снарядов.
 */
declare const BulletWorkersRegistry: HordeClassLibrary.Scripting.Misc.ScriptWorkersRegistry;

/**
 * Различные данные, которые НЕ будут очищаться при hot-reload.
 */
declare const DataStorage: DataStorageT;
declare class DataStorageT {
    [key: string]: any;
    plugins: { [key: string]: any };
    scriptWorkTicks: number;
    reloadCounter: number;
    gameTickNum: number;
}

//#endregion

// =============================================================================================
// === Утилиты скрипт-машины
// =============================================================================================

//#region Utilities

/**
 * ForEach - специальная функция для перечисления .Net-объектов.
 * Примеры см. рядом с декларацией ForEach в "common-declarations.d.ts".
 */
declare function ForEach(enumerable: object, action: (item: any, i: number, sourceEnumerable: object) => void): void;
/**
 * Примеры для ForEach:
```
    ForEach(someList, item => {
        log.info('-', item);
    });

    ForEach(someList, (item, i, source) => {
        log.info('#' + i, item, 'from', source);
    });
```
 */

/**
 * Различные методы-утилиты.
 */
declare const ScriptUtils: typeof ScriptUtilsT;
declare class ScriptUtilsT extends HordeClassLibrary.Scripting.ScriptApi.ScriptUtils {
    public static ForEach(enumerable: object, action: (item: any, i: number, sourceEnumerable: object) => void): void;
    public static RemoveAll(list: object, item: any): void;
}

/**
 * Доступ и работа с конфигами игровых объектов.
 */
declare const HordeContentApi: typeof HordeClassLibrary.Scripting.ScriptApi.HordeContentApi;

/**
 * Управление отладочными переменными скрипт-машины.
 */
declare const ScriptMachineDebugApi: HordeClassLibrary.Scripting.ScriptApi.ScriptMachineDebugApi;

/**
 * Вывод логов.
 */
declare class DebugLogger {
    public static WriteLine(message: string): void;
}

/**
 * Утилиты для работы с ядром (с хостом) скрипт-машины.
 * Полная документация: https://microsoft.github.io/ClearScript/Reference/html/Methods_T_Microsoft_ClearScript_HostFunctions.htm
 * 
 * Примечание:
 * Здесь декларации прописаны через статические методы, чтобы в IDE было цветовове выделение host,
 * как специального класса, а не как простой глобальной переменной.
 */
declare const host: typeof HostFunctions;
declare class HostFunctions {
    /**
     * Метод для создания DotNet-массивов.
     * После создания, необходимо вручную выполнить каст объекта через "as".
     * 
     * Пример:
    ```
        let ids = host.newArr(UnitIdLabel, ids.length) as UnitIdLabel[];
    ```
     */
    public static newArr(hostType: object, ...length: number[]): object[];

    /**
     * Метод для каста DotNet-объектов.
     * Поэтому, в коде TS, возвращаемое значение нужно дополнительно кастовать через "as".
     * 
     * Пример:
    ```
        (host.cast(IDisposableT, enumerator) as IDisposableT).Dispose();
    ```
     */
    public static cast(hostType: object, obj: any): any;

    /**
     * Метод для проверки типа DotNet-объектов.
     */
    public static isType(hostType: object, obj: any): boolean;

    /**
     * Метод для создания ref-объектов для передачи в методы в качестве out/ref-аргументов.
     */
    public static newVar(hostType: object, initValue?: any): refObject<any>;

    /**
     * Создаёт делегат на указанную функцию без возвращаемого значения.
     */
    public static func(argCount: number, scriptFunc: (...arg: any[]) => void): any;

    /**
     * Создаёт делегат на указанную функцию с возвращаемым значением.
     */
    public static func(returnHostType: object, argCount: number, scriptFunc: (...arg: any[]) => any): any;

    /**
     * Возвращает .Net-тип для указанного хост-типа.
     * Внимание! Метод работает только в unsafe-режиме скрипт-машины.
     */
    public static typeOf(hostType: object): any;
}

/**
 * Ref-объект для работы с методами с out/ref-параметрами.
 */
declare class refObject<T> {
    public value: T;
    public readonly ref: T;
    public readonly out: T;
}

//#endregion

// =============================================================================================
// === Утилиты unsafe-режима скрипт-машины
// =============================================================================================

//#region Unsafe mode tools

/**
 * Функции для рефлексии.
 * Внимание! Класс доступен только в unsafe-режиме скрипт-машины!
 */
declare class ScriptReflection {
    public static SetValue(memberOwner: object, memberName: string, value: any): void;
    public static GetValue(memberOwner: object, memberName: string): any;
    public static Invoke(memberOwner: object, methodName: string, ...parameters: any[]): any;
    public static InvokeStatic(type: object, methodName: string, ...parameters: any[]): any;
    public static CreateInstance(type: object, ...parameters: any[]): any;
    public static GetTypeByName(typeName: string, assemblyName?: string): any;
}

/**
 * Продвинутые утилиты для работы с ядром (с хостом) скрипт-машины.
 * Полная документация: https://microsoft.github.io/ClearScript/Reference/html/Methods_T_Microsoft_ClearScript_ExtendedHostFunctions.htm
 * 
 * Внимание! Класс доступен только в unsafe-режиме скрипт-машины!
 */
declare const xHost: typeof ExtendedHostFunctions;
declare class ExtendedHostFunctions extends HostFunctions {
    /**
     * Импортирует хост-тип по заданному .Net-типу.
     */
    public static type(type: object): any;

    /**
     * Импортирует хост-тип по заданному имени .Net-типа.
     */
    public static type(name: string, ...typeArgs: any[]): any;

    /**
     * Импортирует хост-тип по заданному имени .Net-типа.
     */
    public static type(name: string, assemblyName: string, ...typeArgs: any[]): any;
}

//#endregion
