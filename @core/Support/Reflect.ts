const ReflectGlobal: typeof Reflect = (() => {
	if (globalThis.Reflect) {
		return globalThis.Reflect;
	}

	const polyfill = {} as typeof Reflect;
	globalThis.Reflect = polyfill;
	return polyfill;
})();

type PropertyKeyType = string | symbol | undefined;

const metadataStore = new WeakMap<
	object,
	Map<PropertyKeyType, Map<any, any>>
>();

const getOrCreatePropertyMap = (
	target: object,
	propertyKey: PropertyKeyType,
) => {
	let targetMetadata = metadataStore.get(target);
	if (!targetMetadata) {
		targetMetadata = new Map();
		metadataStore.set(target, targetMetadata);
	}

	let propertyMetadata = targetMetadata.get(propertyKey);
	if (!propertyMetadata) {
		propertyMetadata = new Map();
		targetMetadata.set(propertyKey, propertyMetadata);
	}

	return propertyMetadata;
};

const getPropertyMap = (target: object, propertyKey: PropertyKeyType) => {
	const targetMetadata = metadataStore.get(target);
	if (!targetMetadata) return undefined;
	return targetMetadata.get(propertyKey);
};

const defineMetadata = (
	metadataKey: any,
	metadataValue: any,
	target: object,
	propertyKey?: PropertyKeyType,
) => {
	if (typeof target !== "object" && typeof target !== "function") {
		throw new TypeError("Metadata target must be an object.");
	}

	const metadataMap = getOrCreatePropertyMap(target, propertyKey);
	metadataMap.set(metadataKey, metadataValue);
};

const getOwnMetadata = (
	metadataKey: any,
	target: object,
	propertyKey?: PropertyKeyType,
) => {
	const metadataMap = getPropertyMap(target, propertyKey);
	return metadataMap?.get(metadataKey);
};

const hasOwnMetadata = (
	metadataKey: any,
	target: object,
	propertyKey?: PropertyKeyType,
) => {
	const metadataMap = getPropertyMap(target, propertyKey);
	return metadataMap?.has(metadataKey) ?? false;
};

const getMetadata = (
	metadataKey: any,
	target: object,
	propertyKey?: PropertyKeyType,
) => {
	let current: any = target;

	while (current) {
		const result = getOwnMetadata(metadataKey, current, propertyKey);
		if (typeof result !== "undefined") {
			return result;
		}

		current = Object.getPrototypeOf(current);
	}

	return undefined;
};

const hasMetadata = (
	metadataKey: any,
	target: object,
	propertyKey?: PropertyKeyType,
) => {
	let current: any = target;

	while (current) {
		if (hasOwnMetadata(metadataKey, current, propertyKey)) {
			return true;
		}
		current = Object.getPrototypeOf(current);
	}

	return false;
};

const metadata = (metadataKey: any, metadataValue: any) => {
	return function decorator(target: object, propertyKey?: PropertyKeyType) {
		defineMetadata(metadataKey, metadataValue, target, propertyKey);
	};
};

if (typeof ReflectGlobal.defineMetadata !== "function") {
	ReflectGlobal.defineMetadata = defineMetadata;
}

if (typeof ReflectGlobal.getOwnMetadata !== "function") {
	ReflectGlobal.getOwnMetadata = getOwnMetadata;
}

if (typeof ReflectGlobal.getMetadata !== "function") {
	ReflectGlobal.getMetadata = getMetadata;
}

if (typeof ReflectGlobal.hasMetadata !== "function") {
	ReflectGlobal.hasMetadata = hasMetadata;
}

if (typeof ReflectGlobal.hasOwnMetadata !== "function") {
	ReflectGlobal.hasOwnMetadata = hasOwnMetadata;
}

if (typeof ReflectGlobal.metadata !== "function") {
	ReflectGlobal.metadata = metadata;
}

declare global {
	namespace Reflect {
		function defineMetadata(
			metadataKey: any,
			metadataValue: any,
			target: object,
			propertyKey?: PropertyKeyType,
		): void;
		function getOwnMetadata(
			metadataKey: any,
			target: object,
			propertyKey?: PropertyKeyType,
		): any;
		function getMetadata(
			metadataKey: any,
			target: object,
			propertyKey?: PropertyKeyType,
		): any;
		function hasMetadata(
			metadataKey: any,
			target: object,
			propertyKey?: PropertyKeyType,
		): boolean;
		function hasOwnMetadata(
			metadataKey: any,
			target: object,
			propertyKey?: PropertyKeyType,
		): boolean;
		function metadata(metadataKey: any, metadataValue: any): ClassDecorator;
	}
}
