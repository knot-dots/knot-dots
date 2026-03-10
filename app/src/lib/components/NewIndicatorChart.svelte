<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import { resource } from 'runed';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		type AnyContainer,
		type IndicatorTemplateContainer,
		isActualDataContainer,
		payloadTypes
	} from '$lib/models';
	import { compareState } from '$lib/stores';

	interface Props {
		container: IndicatorTemplateContainer;
		relatedContainers?: AnyContainer[];
	}

	let { container, relatedContainers = [] }: Props = $props();

	let unit = $derived($_(container.payload.unit));

	// Current organizational unit's actual data
	let actualDataContainer = $derived(
		relatedContainers
			.filter(isActualDataContainer)
			.filter(({ payload }) => payload.indicator === container.guid)
			.toSorted((a, b) => (a.payload.source ? (b.payload.source ? 0 : -1) : 1))
	);

	let actualValues = $derived(
		actualDataContainer[0]?.payload.values.map(([key, value]) => ({
			date: new Date(key, 0),
			value: actualDataContainer[1]?.payload.values.find(([k]) => k == key)?.at(1) ?? value
		})) ?? []
	);

	// Fetch comparison data for selected municipalities
	let selectedMunicipalityGuids = $derived(
		$compareState.selectedMunicipalities.map((m) => m.guid) ?? []
	);

	const hasComparison = $derived(selectedMunicipalityGuids.length > 0);

	const comparisonDataResource = resource(
		() => [selectedMunicipalityGuids, container.guid] as const,
		async ([guids, indicatorGuid]) => {
			if (guids.length === 0) return [];

			const params = new SvelteURLSearchParams();
			params.append('indicator', indicatorGuid);
			params.append('payloadType', payloadTypes.enum.actual_data);
			for (const guid of guids) {
				params.append('organizationalUnit', guid);
			}

			const response = await fetch(`/container?${params.toString()}`);
			if (!response.ok) return [];
			return (await response.json()) as AnyContainer[];
		}
	);

	let comparisonValues = $derived(
		(comparisonDataResource.current ?? []).filter(isActualDataContainer).map((container) => ({
			values: container.payload.values
				.map(([key, value]) => ({
					date: new Date(key, 0),
					value
				}))
				.toSorted((a, b) => a.date.getTime() - b.date.getTime()),
			municipalityGuid: container.organizational_unit ?? container.organization,
			color:
				$compareState.colorAssignments[container.organizational_unit ?? container.organization] ||
				'--color-gray-600'
		}))
	);

	const chart: Attachment = (element) => {
		element?.firstChild?.remove();

		const marks = [];

		// Area chart for current organization (only when no comparison)
		if (!hasComparison) {
			marks.push(
				Plot.areaY(actualValues, {
					x: 'date',
					y: 'value',
					fill: 'rgb(213, 239, 252)'
				})
			);
		} else {
			// Line for current organization
			marks.push(
				Plot.lineY(actualValues, {
					x: 'date',
					y: 'value',
					stroke: 'var(--indicator-color-own-base)',
					strokeWidth: 2
				})
			);

			// Lines for comparison municipalities
			if (hasComparison) {
				for (const { values, color } of comparisonValues) {
					marks.push(
						Plot.lineY(values, {
							x: 'date',
							y: 'value',
							stroke: `var(${color})`,
							strokeWidth: 2
							// strokeDasharray: '4,4'
						})
					);
				}
			}
		}

		element?.append(
			Plot.plot({
				marks,
				y: { label: $_(unit), tickFormat: (d) => $number(d) },
				color: hasComparison ? { legend: true } : undefined
			})
		);
	};
</script>

{#if actualDataContainer[0]}
	<figure>
		<div role="img" {@attach chart}></div>

		{#if actualDataContainer[0].payload.source}
			<figcaption>{$_('indicator.source')}: {actualDataContainer[0].payload.source}</figcaption>
		{/if}
	</figure>
{/if}
