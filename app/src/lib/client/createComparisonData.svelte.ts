import { resource } from 'runed';
import { SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
import { fromStore } from 'svelte/store';
import { z } from 'zod';
import {
	type ActualDataPayload,
	actualDataPayload,
	type Container,
	createContainerSchema,
	isActualDataContainer,
	payloadTypes
} from '$lib/models';
import { compareState } from '$lib/stores';

interface CreateComparisonDataOptions {
	enabled?: () => boolean;
	indicatorGuids: () => string[];
}

// Batch-fetches actual data of the municipalities selected for comparison (compareState)
// and exposes it as a map keyed by indicator GUID for per-card lookup.
export default function createComparisonData({
	enabled = () => true,
	indicatorGuids
}: CreateComparisonDataOptions) {
	const compare = fromStore(compareState);

	const selectedMunicipalityGuids = $derived(
		compare.current.selectedMunicipalities.map(({ guid }) => guid)
	);

	const comparisonDataResource = resource(
		() => [selectedMunicipalityGuids, indicatorGuids(), enabled()] as const,
		async ([municipalityGuids, indicators, isEnabled], _, { signal }) => {
			if (!isEnabled || municipalityGuids.length === 0 || indicators.length === 0) return [];

			// Split indicators into chunks to avoid 431 error (Request URI Too Large)
			const CHUNK_SIZE = 50; // Conservative limit to keep URL under ~8KB
			const chunks: string[][] = [];
			for (let i = 0; i < indicators.length; i += CHUNK_SIZE) {
				chunks.push(indicators.slice(i, i + CHUNK_SIZE));
			}

			const fetchPromises = chunks.map(async (indicatorChunk) => {
				const params = new SvelteURLSearchParams();
				for (const guid of indicatorChunk) {
					params.append('indicator', guid);
				}
				for (const guid of municipalityGuids) {
					params.append('organizationalUnit', guid);
				}
				params.append('payloadType', payloadTypes.enum.actual_data);

				const response = await fetch(`/container?${params.toString()}`, { signal });
				if (!response.ok) return [];
				return z.array(createContainerSchema(actualDataPayload)).parse(await response.json());
			});

			const results = await Promise.all(fetchPromises);
			return results.flat();
		}
	);

	const comparisonDataMap = $derived.by(() => {
		const map = new SvelteMap<string, Container<ActualDataPayload>[]>();
		for (const container of comparisonDataResource.current ?? []) {
			if (isActualDataContainer(container) && container.payload.indicator) {
				const indicatorGuid = container.payload.indicator;
				if (!map.has(indicatorGuid)) {
					map.set(indicatorGuid, []);
				}
				map.get(indicatorGuid)!.push(container);
			}
		}
		return map;
	});

	return {
		get comparisonDataMap() {
			return comparisonDataMap;
		}
	};
}
