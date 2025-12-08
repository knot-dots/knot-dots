<script lang="ts">
	import { page } from '$app/state';
	import { createMapWithGeoJsonObject } from '$lib/attachments/map';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		type MapContainer,
		type OrganizationalUnitContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';
	import 'leaflet/dist/leaflet.css';

	interface Props {
		container: MapContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: OrganizationalUnitContainer;
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
		<!-- svelte-ignore binding_property_non_reactive -->
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
	<div {@attach createMapWithGeoJsonObject(feature)}></div>
</div>

<style>
	.map {
		position: relative;
		z-index: 0;
	}

	.map > div {
		border-radius: 8px;
		height: 388px;
	}
</style>
