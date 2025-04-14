import { IDisposableT, IEnumerableT, IEnumeratorT, Int32T } from "./dotnet-types";


// ===================================================
// --- Flags

/**
 * Складывает массив enum-флагов в один флаг.
 * Функция нужна из-за того, что здесь в js не получается использовать перегруженный оператор "|".
 * 
 * @param flagsType тип флага. Задаётся отдельно, т.к. нельзя использовать "GetType()" без GodMode.
 * @param flags массив флагов, которые нужно объединить
 */
export function mergeFlags(flagsType: object, ...flagsArray: any[]): any {
    let flags = 0;

    for (let f of flagsArray) {
        flags |= host.cast(Int32T, f) as number;

        // Внимание!
        // Если скрипт-машина падает в этом месте с ошибкой "Error: Cannot convert type", то значит поданы некорректные флаги
    }

    return host.cast(flagsType, flags);
}


// ===================================================
// --- Enumerations

/**
 * ForEach - специальная функция для перечисления .Net-объектов.
 * Примеры см. рядом с декларацией ForEach в "common-declarations.d.ts".
 */
globalThis.ForEach = ScriptUtils.ForEach;

/**
 * Делает IEnumerable перечислимым в JS.
 * Примечание: В отличии от ForEach здесь можно использовать break и continue.
 * 
 * Пример:
```
    let settlement; let settlements = enumerate(ActiveScena.GetRealScena().Settlements);
    while (settlement = eNext(settlements)) {
        // do something with settlement
    }
```
 */
export function* enumerate<T>(enumerable: IEnumerableT<T>): Generator<T, void, unknown> {
    var enumerator = host.cast(IEnumeratorT, enumerable.GetEnumerator());
    while (enumerator.MoveNext()) {
        yield enumerator.Current as T;
    }
    host.cast(IDisposableT, enumerator).Dispose();
}

/**
 * Получить следующее значение из итерируемого объекта.
 * @param enumerated итерируемый объект.
 * @returns возвращает следующее значение.
 */
export function eNext<T>(enumerated: Generator<T, void, unknown>): T | undefined {
    var next = enumerated.next();
    if (next.done)
        return undefined;
    return next.value;
}

/**
 * Преобразует JS-массив в .Net-массив заданного типа.
 */
export function createArray(type: object, items: any[]): object[] {
    let array = host.newArr(type, items.length);
    for (let i = 0; i < items.length; i++) {
        array[i] = items[i];
    }
    return array;
}
