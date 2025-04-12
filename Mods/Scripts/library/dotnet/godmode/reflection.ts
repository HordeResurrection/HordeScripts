
export const BindingFlags = xHost.type("System.Reflection.BindingFlags");
export const Activator = xHost.type("System.Activator");


/**
 * Возвращает имя с неймспейсом для указанного хост-типа.
 */
export function getTypeNameWithNamespace(hostType: object) {
	let type = host.typeOf(hostType);
	let name = type.Name;
	if (type.Namespace) {
		name = type.Namespace + '.' + name;
	}
	return name;
}

/**
 * Возвращает полное имя указанного хост-типа.
 */
export function getTypeFullName(hostType: object) {
	let type = host.typeOf(hostType);
	return type.FullName;
}
