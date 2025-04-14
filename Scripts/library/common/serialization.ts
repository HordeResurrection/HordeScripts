
/**
 * Это обычный js-сериализатор. Он редко дружит с .Net-объектами.
 * TODO: Проверить отличия при работе с флагом "EnableStringifyEnhancements"
 */
export function toJsonMy(object: any) {
    return JSON.stringify(object, null, 2);
}
