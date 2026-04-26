<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import { env } from '$env/dynamic/public';
	import fetchContainers from '$lib/client/fetchContainers';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type ActualDataContainer,
		type AnyContainer,
		type DemographicDataContainer,
		payloadTypes
	} from '$lib/models';
	import { IsInViewport, resource } from 'runed';

	interface Props {
		container: DemographicDataContainer;
		editable?: boolean;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let header = $state<HTMLElement>();

	const inViewport = new IsInViewport(() => header);

	let inViewportOnce = $state(false);

	$effect(() => {
		if (inViewport.current) {
			inViewportOnce = true;
		}
	});

	const actualData = resource(
		[() => inViewportOnce],
		async (_, __, { signal }) => {
			return (await fetchContainers(
				{
					organization: [container.organization],
					organizationalUnit: container.organizational_unit
						? [container.organizational_unit]
						: [''],
					payloadType: [payloadTypes.enum.actual_data]
				},
				'alpha',
				{ signal }
			)) as ActualDataContainer[];
		},
		{ lazy: true }
	);

	const population = $derived.by(() => {
		const populationDataContainer = actualData.current?.find(
			({ payload }) => payload.indicator == env.PUBLIC_PNK_POPULATION_INDICATOR
		);
		if (populationDataContainer) {
			return populationDataContainer.payload.values.at(-1)?.[1];
		}
	});

	const populationDensity = $derived.by(() => {
		const populationDensityDataContainer = actualData.current?.find(
			({ payload }) => payload.indicator == env.PUBLIC_PNK_POPULATION_DENSITY_INDICATOR
		);
		if (populationDensityDataContainer) {
			return populationDensityDataContainer.payload.values.at(-1)?.[1];
		}
	});

	const area = $derived.by(() => {
		if (population && populationDensity) {
			return population / populationDensity;
		}
	});
</script>

<header>
	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

<ul class="carousel">
	<li class="stat-card">
		<span class="label">{$_('demographic_data.population')}</span>
		<span class="value">
			{#if population}
				{$number(population)}
			{:else}
				-
			{/if}
		</span>
	</li>

	<li class="stat-card">
		<span class="label">{$_('demographic_data.area')}</span>
		<span class="value">
			{#if area}
				{$number(area, { maximumFractionDigits: 0 })}
				<span class="unit">ha</span>
			{:else}
				-
			{/if}
		</span>
	</li>

	<li class="stat-card">
		<span class="label">{$_('demographic_data.population_density')}</span>
		<span class="value">
			{#if populationDensity}
				{$number(populationDensity)}
				<span class="unit">/ ha</span>
			{:else}
				-
			{/if}
		</span>
	</li>
</ul>

<style>
	.stat-card {
		border: 1px solid var(--color-gray-200);
		border-radius: 0.5rem;
		box-shadow: var(--shadow-sm);

		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.label {
		color: var(--color-gray-700);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.value {
		color: var(--color-gray-900);
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.24px;
	}

	.unit {
		color: var(--color-gray-500);
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: initial;
	}
</style>
