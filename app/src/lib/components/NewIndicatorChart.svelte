<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import { page } from '$app/state';
	import IndicatorChartLegend from '$lib/components/IndicatorChartLegend.svelte';
	import IndicatorColumnChart from '$lib/components/IndicatorColumnChart.svelte';
	import { indicatorActualData, indicatorActualDataContainers } from '$lib/indicatorActualData';
	import {
		type ActualDataPayload,
		administrativeTypes,
		type AnyPayload,
		type Container,
		type IndicatorPayload
	} from '$lib/models';
	import { compareState } from '$lib/stores';

	interface Props {
		chartType?: 'line' | 'column';
		container: Container<IndicatorPayload>;
		relatedContainers?: Container<AnyPayload>[];
		comparisonContainers?: Container<ActualDataPayload>[];
	}

	let {
		chartType = 'line',
		container,
		relatedContainers = [],
		comparisonContainers
	}: Props = $props();

	let isColumnChart = $derived(chartType === 'column');

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
			date: new Date(year, 0),
			value
		}))
	);

	// Position of a municipality in the compare bar
	function selectionIndex(municipalityGuid: string) {
		return $compareState.selectedMunicipalities.findIndex(({ guid }) => guid === municipalityGuid);
	}

	// Prepare comparison data with assigned colors, one series per municipality in the order of the
	// compare bar. Several actual data of a municipality are merged as for the current context.
	let comparisonValues = $derived(
		[
			...Map.groupBy(
				comparisonContainers ?? [],
				({ organization, organizational_unit }) => organizational_unit ?? organization
			)
		]
			.toSorted(([a], [b]) => selectionIndex(a) - selectionIndex(b))
			.map(([municipalityGuid, containers]) => ({
				values: indicatorActualData(container.guid, containers)
					.map(([year, value]) => ({
						date: new Date(year, 0),
						value
					}))
					.toSorted((a, b) => a.date.getTime() - b.date.getTime()),
				municipalityGuid,
				color: $compareState.colorAssignments[municipalityGuid] || '--color-gray-600'
			}))
	);

	// Combine all data for Plot's color scale
	let allData = $derived([
		...actualValues.map((d) => ({ ...d, municipality: 'current' })),
		...comparisonValues.flatMap(({ values, municipalityGuid }) =>
			values.map((d) => ({ ...d, municipality: municipalityGuid }))
		)
	]);

	let allYears = $derived([...new Set(allData.map((d) => d.date.getFullYear()))].toSorted());

	let hasComparisonData = $derived(comparisonValues.some(({ values }) => values.length > 0));

	// Build color scale domain and range; omit the current context when it has no data of its own
	let colorDomain = $derived([
		...(actualValues.length > 0 ? ['current'] : []),
		...comparisonValues.map((c) => c.municipalityGuid)
	]);
	let colorRange = $derived([
		...(actualValues.length > 0 ? ['var(--indicator-color-own-base)'] : []),
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

	let municipalityLabels = $derived(
		new Map(
			colorDomain.map((guid) => [
				guid,
				guid === 'current'
					? (currentOrgUnitName ?? '')
					: ($compareState.selectedMunicipalities.find((m) => m.guid === guid)?.payload.name ??
						guid)
			])
		)
	);

	let columnData = $derived(
		allData.map(({ date, municipality, value }) => ({
			key: municipality,
			value,
			year: date.getFullYear()
		}))
	);

	// Create a reactive state for the container's width
	let currentWidth = $state(0);

	const chart: Attachment = (element) => {
		// Use a ResizeObserver to measure the container and trigger a render
		const observer = new ResizeObserver((entries) => {
			for (let entry of entries) {
				// Get the actual inner width of the container div
				const { width } = entry.contentRect;

				// Only render if we have a valid width
				if (width > 0) {
					currentWidth = width;
				}
			}
		});

		// Start observing the element this action is attached to
		observer.observe(element);

		// Svelte tracks dependencies here. Because we read currentWidth, allData,
		// colorDomain, etc., any change to them will trigger a re-render.
		if (currentWidth === 0) return;

		// Use innerHTML = '' instead of firstChild.remove()
		// because we are going to append TWO elements now (plot + legend).
		element.innerHTML = '';

		const plot = Plot.plot({
			marks: [
				Plot.lineY(
					allData.filter(
						(d) => d.municipality !== 'current' && stateMunicipalityGuids.has(d.municipality)
					),
					{
						x: 'date',
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
						x: 'date',
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
						x: 'date',
						y: 'value',
						z: 'municipality',
						stroke: 'municipality',
						strokeWidth: 3,
						strokeLinecap: 'round'
					}
				),
				Plot.dot(allData, {
					x: 'date',
					y: 'value',
					fill: 'municipality',
					r: (d) => (d.municipality === 'current' ? 4 : 2.5)
				})
			],
			width: currentWidth,
			height: (currentWidth * 400) / 640, // Maintain the 640:400 aspect ratio
			grid: true,
			x: allYears.length === 1 ? { tickFormat: (d: Date) => String(d.getFullYear()) } : undefined,
			y: { label: $_(unit), tickFormat: (d) => $number(d) },
			color: {
				domain: colorDomain,
				range: colorRange
			},
			style: {
				fontSize: '0.75rem'
			}
		});

		element.append(plot);

		// Return a destroy method for cleanup
		return () => {
			observer.disconnect();
		};
	};
</script>

{#if actualDataContainer[0] || hasComparisonData}
	<figure>
		{#if isColumnChart}
			<IndicatorColumnChart
				{colorDomain}
				{colorRange}
				data={columnData}
				emphasized={hasComparisonData && actualValues.length > 0 ? 'current' : undefined}
				labels={municipalityLabels}
				layout="group"
				{unit}
			/>
		{:else}
			<div role="img" {@attach chart}></div>
		{/if}
		<IndicatorChartLegend
			items={colorDomain.map((guid, i) => ({
				color: colorRange[i],
				// Columns have no outlines, so only lines of federal states and countries are dashed
				dashed: !isColumnChart && guid !== 'current' && stateMunicipalityGuids.has(guid),
				label: municipalityLabels.get(guid) ?? guid,
				shape: isColumnChart ? 'rect' : 'line'
			}))}
		/>

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
		background-color: white;
		border-radius: 8px;
		flex-grow: 1;
	}

	.no-data {
		aspect-ratio: 8 / 5;
		align-content: center;
		text-align: center;
	}
</style>
