import { log } from "./logging";

/**
 * Function digs through a Javascript object
 * to display all its properties
 *
 * @param object - a Javascript object to inspect
 * @param maxDepth - inspect recursion depth (здесь не следует задавать слишком большое значение)
 * @param result - a string of properties with datatypes
 *
 * @return result - the concatenated description of all object properties
 *
 * Source: https://stackoverflow.com/questions/5357442/how-to-inspect-javascript-objects/20513467#20513467
 */
export function inspectToStr(object: object, maxDepth: number | undefined, result: string | undefined) {
    if (typeof object != "object")
        return "Invalid object";
    if (typeof result == "undefined")
        result = '';
    if (typeof maxDepth == "undefined")
        maxDepth = 1;

    if (result.length > maxDepth)
        return "[RECURSION TOO DEEP. ABORTING.]";

    let rows: string[] = [];
    for (let property in object) {
        let datatype = typeof object[property];

        let tempDescription = result + '"' + property + '"';
        tempDescription += ' (' + datatype + ') => ';
        if (datatype == "object")
            tempDescription += 'object: ' + inspectToStr(object[property], maxDepth, result + '  ');
        else
            tempDescription += object[property];

        rows.push(tempDescription);
    }

    return rows.join(result + "\n");
}

/**
 * Выводит в лог результат интроспекции.
 */
export function inspect(object: object, maxDepth: number | undefined = undefined, msg: string | null = null) {
    msg = msg ?? 'Object introspection result:';
    if (!object) {
        log.info(msg, '\nType:', typeof object);
    } else if (!object.constructor) {
        log.info(msg, '\nType:', typeof object, '\n' + inspectToStr(object, maxDepth, undefined));
    } else {
        log.info(msg, '\nType:', typeof object, '-', object.constructor.name, '\n' + inspectToStr(object, maxDepth, undefined));
    }
}

/**
 * Выводит в лог элементы из enum.
 */
export function inspectEnum(enumType: object, n = 10) {
    for (let i = 0; i < n; i++) {
        log.info(`${i}`, '-', host.cast(enumType, i));
    }
}

/**
 * Выводит в лог элементы из enum, который Flag.
 */
export function inspectFlagEnum(enumType: object, n = 31) {
    let end = 1 << n >>> 0;
    log.info('0'.padStart(n, '0'), '-', host.cast(enumType, 0));
    for (let i = 1; i < end; i = (i << 1 >>> 0)) {
        log.info(i.toString(2).padStart(n, '0'), '-', host.cast(enumType, i));
    }
}

/**
 * Вывод всех свойств объекта в глубину depth
 */
export function printObjectItems(object: object, depth = 1, shift = "") {
    if (depth == 0) {
        return;
    }

    for (let item in object) {
        log.info(shift, item, " = ", object[item]);
        printObjectItems(object[item], depth - 1, shift + "\t");
    }
}
