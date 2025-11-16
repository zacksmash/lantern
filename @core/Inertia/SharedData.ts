import type {
	InertiaPropValue,
	ProvidesInertiaProperties,
} from "@core/Inertia/InertiaTypes";
import { isProvidesInertiaProperties } from "@core/Inertia/InertiaTypes";

export const INERTIA_SHARED_PROPS_ATTRIBUTE = "inertia.sharedProps";

export interface SharedDataPayload {
	values: Record<string, InertiaPropValue>;
	providers: ProvidesInertiaProperties[];
}

const sharedValues = new Map<string, InertiaPropValue>();
const sharedProviders = new Set<ProvidesInertiaProperties>();

export function share(
	key: string | Record<string, InertiaPropValue> | ProvidesInertiaProperties,
	value?: InertiaPropValue,
): void {
	if (typeof key === "string") {
		sharedValues.set(key, value as InertiaPropValue);
		return;
	}

	if (isProvidesInertiaProperties(key)) {
		sharedProviders.add(key);
		return;
	}

	Object.entries(key).forEach(([entryKey, entryValue]) => {
		sharedValues.set(entryKey, entryValue);
	});
}

export function getSharedData(): SharedDataPayload {
	return {
		values: Object.fromEntries(sharedValues.entries()),
		providers: Array.from(sharedProviders.values()),
	};
}

export function flushShared(): void {
	sharedValues.clear();
	sharedProviders.clear();
}
