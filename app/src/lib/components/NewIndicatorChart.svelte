<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import { page } from '$app/state';
	import { indicatorActualData, indicatorActualDataContainers } from '$lib/indicatorActualData';
	import { indicatorChartOptions, ownColor, textWidthIn, valueExtent } from '$lib/indicatorChart';
	import {
		type ActualDataPayload,
		administrativeTypes,
		type AnyPayload,
		type Container,
		type IndicatorPayload
	} from '$lib/models';
	import { compareState } from '$lib/stores';

	interface Props {
		container: Container<IndicatorPayload>;
		relatedContainers?: Container<AnyPayload>[];
		comparisonContainers?: Container<ActualDataPayload>[];
	}

	let { container, relatedContainers = [], comparisonContainers }: Props = $props();

	const currentOrgUnitName = $derived(
		page.data.currentOrganizationalUnit?.payload.name ?? page.data.currentOrganization?.payload.name
	);

	let unit = $derived($_(container.payload.unit));

	// Current organizational unit's actual data
	let actualDataContainer = $derived(
		indicatorActualDataContainers(container.guid, relatedContainers)
	);

	let actualValues = $derived(
		indicatorActualData(container.guid, relatedContainers).map(([year, value]) => ({
			value,
			year
		}))
	);

	// Prepare comparison data with assigned colors
	let comparisonValues = $derived(
		comparisonContainers?.map((container) => ({
			values: container.payload.values
				.map(([year, value]) => ({ value, year }))
				.toSorted((a, b) => a.year - b.year),
			municipalityGuid: container.organizational_unit ?? container.organization,
			color:
				$compareState.colorAssignments[container.organizational_unit ?? container.organization] ||
				'--color-gray-600'
		})) ?? []
	);

	// Combine all data for Plot's color scale
	let allData = $derived([
		...actualValues.map((d) => ({ ...d, municipality: 'current' })),
		...comparisonValues.flatMap(({ values, municipalityGuid }) =>
			values.map((d) => ({ ...d, municipality: municipalityGuid }))
		)
	]);

	let hasComparisonData = $derived(comparisonValues.some(({ values }) => values.length > 0));

	// Build color scale domain and range; omit the current context when it has no data of its own
	let colorDomain = $derived([
		...(actualValues.length > 0 ? ['current'] : []),
		...comparisonValues.map((c) => c.municipalityGuid)
	]);
	let colorRange = $derived([
		...(actualValues.length > 0 ? [ownColor] : []),
		...comparisonValues.map((c) => `var(${c.color})`)
	]);

	const stateTypes = new Set<string>([
		administrativeTypes.enum['administrative_type.federal_state'],
		administrativeTypes.enum['administrative_type.country']
	]);

	let stateMunicipalityGuids = $derived(
		new Set(
			$compareState.selectedMunicipalities
				.filter((m) => m.payload.administrativeType?.some((t) => stateTypes.has(t)))
				.map((m) => m.guid)
		)
	);

	let width = $state(0);

	// Axes and grid as in the other charts of indicators, 640:400
	const chart: Attachment<HTMLElement> = (element) => {
		if (width === 0 || allData.length === 0) {
			return;
		}

		const options = indicatorChartOptions({
			extent: valueExtent(allData.map(({ value }) => value)),
			format: (value) => $number(value),
			height: (width * 400) / 640,
			textWidth: textWidthIn(element),
			width,
			years: allData.map(({ year }) => year)
		});

		element.replaceChildren(
			Plot.plot({
				...options,
				color: {
					domain: colorDomain,
					range: colorRange
				},
				marks: [
					...options.marks,
					Plot.lineY(
						allData.filter(
							(d) => d.municipality !== 'current' && stateMunicipalityGuids.has(d.municipality)
						),
						{
							x: 'year',
							y: 'value',
							z: 'municipality',
							stroke: 'municipality',
							strokeWidth: 2,
							strokeLinecap: 'round',
							strokeDasharray: '4'
						}
					),
					Plot.lineY(
						allData.filter(
							(d) => d.municipality !== 'current' && !stateMunicipalityGuids.has(d.municipality)
						),
						{
							x: 'year',
							y: 'value',
							z: 'municipality',
							stroke: 'municipality',
							strokeWidth: 2,
							strokeLinecap: 'round'
						}
					),
					Plot.lineY(
						allData.filter((d) => d.municipality === 'current'),
						{
							x: 'year',
							y: 'value',
							z: 'municipality',
							stroke: 'municipality',
							strokeWidth: 3,
							strokeLinecap: 'round'
						}
					),
					Plot.dot(allData, {
						x: 'year',
						y: 'value',
						fill: 'municipality',
						r: (d) => (d.municipality === 'current' ? 4 : 2.5)
					})
				]
			})
		);
	};
</script>

{#if actualDataContainer[0] || hasComparisonData}
	<figure class="chart">
		<span class="unit">{unit}</span>
		<div bind:clientWidth={width} class="plot" role="img" {@attach chart}></div>
		<ul class="chart-legend">
			{#each colorDomain as guid (guid)}
				{@const i = colorDomain.indexOf(guid)}
				{@const isState = guid !== 'current' && stateMunicipalityGuids.has(guid)}
				{@const label =
					guid === 'current'
						? currentOrgUnitName
						: ($compareState.selectedMunicipalities.find((m) => m.guid === guid)?.payload.name ??
							guid)}
				<li>
					<svg width="24" height="10" aria-hidden="true">
						<line
							x1="2"
							y1="5"
							x2="22"
							y2="5"
							style="stroke: {colorRange[i]}; stroke-width: 3; stroke-linecap: round;{isState
								? ' stroke-dasharray: 4;'
								: ''}"
						/>
					</svg>
					<span>{label}</span>
				</li>
			{/each}
		</ul>

		{#if actualDataContainer[0]?.payload.source}
			<figcaption>{$_('indicator.source')}: {actualDataContainer[0].payload.source}</figcaption>
		{/if}
	</figure>
{:else}
	<div class="no-data">
		{$_('indicator.no_data')}
	</div>
{/if}

<style>
	figure {
		flex-grow: 1;
	}

	.unit,
	.plot {
		color: var(--chart-axis-text);
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.chart-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 0.75rem;
	}

	.chart-legend li {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.no-data {
		aspect-ratio: 8 / 5;
		align-content: center;
		text-align: center;
	}
</style>
