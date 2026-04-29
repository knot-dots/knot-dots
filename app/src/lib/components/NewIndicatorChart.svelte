<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import {
		type ActualDataContainer,
		administrativeTypes,
		type AnyContainer,
		type IndicatorTemplateContainer,
		isActualDataContainer
	} from '$lib/models';
	import { compareState } from '$lib/stores';
	import { page } from '$app/state';

	interface Props {
		container: IndicatorTemplateContainer;
		relatedContainers?: AnyContainer[];
		comparisonContainers?: ActualDataContainer[];
	}

	let { container, relatedContainers = [], comparisonContainers }: Props = $props();

	const currentOrgUnitName = $derived(
		page.data.currentOrganizationalUnit?.payload.name ?? page.data.currentOrganization?.payload.name
	);

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

	// Prepare comparison data with assigned colors
	let comparisonValues = $derived(
		comparisonContainers?.map((container) => ({
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
		})) ?? []
	);

	// Combine all data for Plot's color scale
	let allData = $derived([
		...actualValues.map((d) => ({ ...d, municipality: 'current' })),
		...comparisonValues.flatMap(({ values, municipalityGuid }) =>
			values.map((d) => ({ ...d, municipality: municipalityGuid }))
		)
	]);

	let allYears = $derived([...new Set(allData.map((d) => d.date.getFullYear()))].toSorted());

	// Build color scale domain and range
	let colorDomain = $derived(['current', ...comparisonValues.map((c) => c.municipalityGuid)]);
	let colorRange = $derived([
		'var(--indicator-color-own-base)',
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

{#if actualDataContainer[0]}
	<figure>
		<div role="img" {@attach chart}></div>
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

		{#if actualDataContainer[0].payload.source}
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
