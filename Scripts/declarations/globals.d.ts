
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
declare const Players: HordeResurrection.Engine.Battle.Players.Player[];

/**
 * Различные объекты и функции связанные с обработкой сражения.
 */
declare const Battle: HordeResurrection.Engine.Battle.Script.ScriptBattleObjects;

/**
 * Предоставляет доступ к чату.
 */
declare const BattleChat: HordeResurrection.Engine.Battle.Script.ScriptBattleChat;

/**
 * Здесь хранятся обработчики юнитов.
 */
declare const UnitWorkersRegistry: HordeClassLibrary.Scripting.Misc.ScriptWorkersRegistry;

/**
 * Здесь хранятся обработчики снарядов.
 */
declare const BulletWorkersRegistry: HordeClassLibrary.Scripting.Misc.ScriptWorkersRegistry;

/**
 * Хранилище данных, которое НЕ будут очищаться при hot-reload.
 */
declare const DataStorage: DataStorageT;
declare abstract class DataStorageT {
    /** Произвольные данные. */
    [key: string]: any;

    /** Произвольные данные под каждый плагин. */
    plugins: { [key: string]: any };

    /** True после первой инициализации этого хранилища. */
    initialized: boolean | undefined;

    /** Количество игровых тактов, которое работает скрипт-машина с момента последнего hot reload. */
    scriptWorkTicks: number;

    /** Количество hot reload скрипт машины за текущую сессию. */
    reloadCounter: number;

    /** Номер текущего игрового такта. */
    gameTickNum: number;

    /** Включен ли НЕбезопасный режим скрипт-машины? */
    isUnsafeModeEnabled: boolean | undefined;
}

/**
 * Доступ и работа с конфигами игровых объектов.
 */
declare const HordeContentApi: typeof HordeClassLibrary.Scripting.ScriptApi.HordeContentApi;

//#endregion

// =============================================================================================
// === Утилиты скрипт-машины
// =============================================================================================

//#region Script machine utilities

/**
 * ForEach - специальная функция для перечисления .Net-коллекций.
 * Примеры:
```
    ForEach(someList, item => {
        log.info('-', item);
    });

    ForEach(someList, (item, i, source) => {
        log.info('#' + i, item, 'from', source);
    });
```
 */
declare function ForEach(enumerable: System.Collections.IEnumerable, action: _foreachAction): void;
declare interface _foreachAction { (item: any, i: number, sourceEnumerable: System.Collections.IEnumerable): void; }
// declare function ForEach<T>($T: T, enumerable: object, action: _foreachActionG<T>): void;
declare interface _foreachActionG<T> { (item: T, i: number, sourceEnumerable: System.Collections.Generic.IEnumerable<T>): void; }

/**
 * Различные методы-утилиты.
 */
declare const ScriptUtils: typeof ScriptUtilsT;
declare abstract class ScriptUtilsT extends HordeClassLibrary.Scripting.ScriptApi.ScriptUtils {
    static ForEach(enumerable: System.Collections.IEnumerable, action: _foreachAction): void;
    static ForEach<T>($T: T, enumerable: System.Collections.Generic.IEnumerable<T>, action: _foreachActionG<T>): void;
    static RemoveAll(list: object, item: any): number;
}

/**
 * Управление отладочными переменными скрипт-машины.
 */
declare const ScriptMachineDebugApi: HordeClassLibrary.Scripting.ScriptApi.ScriptMachineDebugApi;

/**
 * Вывод логов.
 */
declare abstract class DebugLogger {
    static WriteLine(message: string): void;
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
declare abstract class HostFunctions {
    /**
     * Метод для создания DotNet-массивов.
     * После создания, необходимо вручную выполнить каст объекта через "as".
     * 
     * Пример:
    ```
        let ids = host.newArr(UnitIdLabel, ids.length) as UnitIdLabel[];
    ```
    */
    static newArr(hostType: object, ...length: number[]): object[];

    /**
     * Метод для каста DotNet-объектов.
     * Поэтому, в коде TS, возвращаемое значение нужно дополнительно кастовать через "as".
     * 
     * Пример:
    ```
        (host.cast(IDisposableT, enumerator) as IDisposableT).Dispose();
    ```
    */
    static cast(hostType: object, obj: any): any;

    /**
     * Метод для проверки типа DotNet-объектов.
     */
    static isType(hostType: object, obj: any): boolean;

    /**
     * Метод для создания ref-объектов для передачи в методы в качестве out/ref-аргументов.
     */
    static newVar(hostType: object, initValue?: any): HostVariable<any>;

    /**
     * Создаёт делегат заданного типа.
     */
    static del(delegateHostType: object, scriptFunc: Function): System.Delegate;

    /**
     * Создаёт Action-делегат (т.е. без возвращаемого значения).
     */
    static proc(argCount: number, scriptFunc: Function): System.Action;

    /**
     * Создаёт Func-делегат без приведения типа для возвращаемого значения.
     * Примечание: в движке ClearScript, возвращаемый объект будет с типом "System.Object".
     */
    static func(argCount: number, scriptFunc: Function): System.Func;

    /**
     * Создаёт Func-делегат с приведением типа возвращаемого значения.
     * Примечание: приведение типа выполняется на уровне движка ClearScript, поэтому в TypeScript-коде придется типизировать отдельно.
     */
    static func(returnHostType: object, argCount: number, scriptFunc: Function): System.Func;

    /**
     * Возвращает .Net-тип для указанного хост-типа.
     * Внимание! Метод работает только в unsafe-режиме скрипт-машины.
     */
    static typeOf(hostType: object): any;
}

//#endregion

// =============================================================================================
// === Утилиты unsafe-режима скрипт-машины
// =============================================================================================

//#region Script machine unsafe

// Для активации НЕбезопасного режима необходимо установить флаг в файле "HordeSettings.json":
// ScriptSettings.UnsafeMode = true

/**
 * Функции для рефлексии.
 * Внимание! Класс доступен только в unsafe-режиме скрипт-машины!
 */
declare abstract class ScriptReflection {
    static SetValue(memberOwner: object, memberName: string, value: any): void;
    static SetValueAs(targetType: object, memberOwner: object, memberName: string, value: any): void;
    static GetValue(memberOwner: object, memberName: string): any;
    static GetValueAs(targetType: object, memberOwner: object, memberName: string): any;
    static Invoke(memberOwner: object, methodName: string, ...parameters: any[]): any;
    static InvokeStatic(type: object, methodName: string, ...parameters: any[]): any;
    static CreateInstance(type: object, ...parameters: any[]): any;
    static GetTypeByName(typeName: string, assemblyName?: string): any;
}

/**
 * Продвинутые утилиты для работы с ядром (с хостом) скрипт-машины.
 * Полная документация: https://microsoft.github.io/ClearScript/Reference/html/Methods_T_Microsoft_ClearScript_ExtendedHostFunctions.htm
 * 
 * Внимание! Класс доступен только в unsafe-режиме скрипт-машины!
 */
declare const xHost: typeof ExtendedHostFunctions;
declare abstract class ExtendedHostFunctions extends HostFunctions {
    /**
     * Импортирует хост-тип по заданному .Net-типу.
     */
    static type(type: object): any;

    /**
     * Импортирует хост-тип по заданному имени .Net-типа.
     */
    static type(name: string, ...typeArgs: any[]): any;

    /**
     * Импортирует хост-тип по заданному имени .Net-типа.
     */
    static type(name: string, assemblyName: string, ...typeArgs: any[]): any;
}

//#endregion

// =============================================================================================
// === Вспмогательные типы
// =============================================================================================

//#region Service types

/**
 * Объект для работы с .Net-событием через ClearScript.
 */
declare abstract class EventSource<T extends Function> {
    /**
     * Подключить обработчик события.
     */
    connect(scriptFunc: T): EventConnection;
}

/**
 * Объект для работы с обработчиком .Net-события.
 */
declare abstract class EventConnection {
    /**
     * Отключить обработчик события.
     */
    disconnect(): void;
}

/**
 * Некоторые объекты из ClearScript.
 */
declare namespace Microsoft.ClearScript {
    /**
     * Хранилище произвольных JS-данных.
     */
    interface PropertyBag {
        [key: string]: any;
        [nu: number]: any;
    }

    /**
     * Произвольный JS-объект.
     */
    interface ScriptObject {
        [key: string]: any;
        [nu: number]: any;
        (...args: any[]): any;
    }
}

/**
 * Объект для работы с out/ref-параметрами методов.
 */
declare interface HostVariable<T> {
    value: T;
    readonly ref: T;
    readonly out: T;
}

//#endregion

// =============================================================================================
// === Декларации системных типов
// =============================================================================================

//#region System types

declare namespace System {
    /** Произвольный .Net-делегат. */
    interface Delegate {
        (...args: any[]): any;
    }
    class Delegate { /* constructor(...args: any[]); */ }

    /** .Net-делегат с возвращаемым значением. */
    interface Func extends System.Delegate {
        (...args: any[]): any;
    }
    class Func { /* constructor(...args: any[]); */ }

    /** FAKE delegate declaration for compability */
    interface Func_0<TResult> {
        (): TResult;
    }

    /** FAKE delegate declaration for compability */
    interface Func_1<T1, TResult> {
        (arg1: T1): TResult;
    }

    /** FAKE delegate declaration for compability */
    interface Func_2<T1, T2, TResult> {
        (arg1: T1, arg2: T2): TResult;
    }

    /** .Net-делегат с без возвращаемого значения. */
    interface Action extends System.Delegate {
        (...args: any[]): void;
    }
    class Action { /* constructor(...args: any[]); */ }

    /** FAKE delegate declaration for compability */
    interface Action_0 {
        (): void;
    }

    /** FAKE delegate declaration for compability */
    interface Action_1<T1> {
        (arg1: T1): void;
    }

    /** FAKE delegate declaration for compability */
    interface Action_2<T1, T2> {
        (arg1: T1, arg2: T2): void;
    }
}

declare namespace System {
    /**
     * Декларация-заглушка для .Net-перечислений (enum) с атрибутом [Flags].
     */
    abstract class EnumFlags extends System.Enum {
        HasFlag(flag: typeof this): boolean;
    }
}

//#endregion
