import {
	type ActualDataPayload,
	type AnyPayload,
	type Container,
	isActualDataContainer
} from '$lib/models';

// The actual data containers of an indicator, those with a source first.
export function indicatorActualDataContainers(
	indicator: string,
	containers: Container<AnyPayload>[]
): Container<ActualDataPayload>[] {
	return containers
		.filter(isActualDataContainer)
		.filter(({ payload }) => payload.indicator === indicator)
		.toSorted((a, b) => (a.payload.source ? (b.payload.source ? 0 : -1) : 1));
}

// The actual values of an indicator as [year, value] pairs. The years come
// from the first container; the second container overrides their values.
export function indicatorActualData(
	indicator: string,
	containers: Container<AnyPayload>[]
): Array<[number, number]> {
	const [primary, secondary] = indicatorActualDataContainers(indicator, containers);
	if (!primary) {
		return [];
	}
	const overrides = new Map(secondary?.payload.values);
	return primary.payload.values.map(([year, value]) => [year, overrides.get(year) ?? value]);
}
