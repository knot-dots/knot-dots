<script lang="ts">
	import { page } from '$app/state';
	import { createMapWithGeoJsonObject } from '$lib/attachments/map';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		type MapContainer,
		type OrganizationContainer,
		type OrganizationalUnitContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import 'leaflet/dist/leaflet.css';
	import { _ } from 'svelte-i18n';
	import Info from '~icons/knotdots/exclamation-circle';

	interface Props {
		container: MapContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: OrganizationContainer | OrganizationalUnitContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let feature = $derived(
		page.data.spatialFeatures?.find(
			({ id }: { id: string }) =>
				id === container.payload.geometry || id === parentContainer?.payload.geometry
		)
	);
</script>

<header>
	{#if editable && $ability.can('update', container)}
		<svelte:element
			this={heading}
			bind:textContent={container.payload.title}
			class="details-heading"
			contenteditable="plaintext-only"
			onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
			role="heading"
		></svelte:element>
	{:else}
		<svelte:element this={heading} class="details-heading" contenteditable="false">
			{container.payload.title}
		</svelte:element>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

<div class="map">
	{#if feature}
		<div class="map-canvas" {@attach createMapWithGeoJsonObject(feature)}></div>
	{:else}
		<div class="map-placeholder">
			<span class="map-placeholder-title">{$_('administrative_area.boundary.empty')}</span>
			{#if editable && $ability.can('update', parentContainer)}
				<div class="system-info map-placeholder-hint">
					<Info />
					<span>{$_('administrative_area.boundary.empty_hint')}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.map {
		position: relative;
		z-index: 0;
	}

	.map-canvas,
	.map-placeholder {
		border-radius: 8px;
		height: 388px;
	}

	.map-placeholder {
		align-items: center;
		background-color: var(--color-background-accent-subtle);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		justify-content: center;
	}

	.map-placeholder-title {
		color: var(--color-text-default);
		font-size: 1rem;
		font-weight: 500;
		line-height: 1.5rem;
	}

	.map-placeholder-hint {
		align-items: center;
		background-color: var(--color-background-accent-subtle);
		border: 1px solid var(--color-border-accent-subtle);
		border-radius: 24px;
		color: var(--color-text-accent-default);
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
	}

	.map-placeholder-hint :global(svg) {
		color: var(--color-icon-accent-subtle);
	}
</style>
