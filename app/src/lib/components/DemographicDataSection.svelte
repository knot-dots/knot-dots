<script lang="ts">
	import { _, number } from 'svelte-i18n';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import { type AnyContainer, type DemographicDataContainer } from '$lib/models';

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
			{#if container.payload.population}
				{$number(container.payload.population)}
			{:else}
				-
			{/if}
		</span>
	</li>

	<li class="stat-card">
		<span class="label">{$_('demographic_data.area')}</span>
		<span class="value">
			{#if container.payload.area}
				{$number(container.payload.area, {
					maximumFractionDigits: 0
				})}
				<span class="unit">km²</span>
			{:else}
				-
			{/if}
		</span>
	</li>

	<li class="stat-card">
		<span class="label">{$_('demographic_data.population_density')}</span>
		<span class="value">
			{#if container.payload.population != null && container.payload.area != null}
				{$number(container.payload.population / container.payload.area, {
					maximumFractionDigits: 0
				})}
				<span class="unit">/km²</span>
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
