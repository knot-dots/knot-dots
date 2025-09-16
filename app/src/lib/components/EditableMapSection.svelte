<script lang="ts">
	import { page } from '$app/state';
	import { createMapWithGeoJsonObject } from '$lib/attachments/map';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import { type AnyContainer, isOrganizationalUnitContainer, type MapContainer } from '$lib/models';
	import { sectionOf } from '$lib/relations';
	import { ability } from '$lib/stores';
	import 'leaflet/dist/leaflet.css';

	interface Props {
		container: MapContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		relatedContainers = $bindable()
	}: Props = $props();

	let parentContainer = $derived(
		sectionOf(container, relatedContainers.filter(isOrganizationalUnitContainer))
	);

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
		<h2
			bind:textContent={container.payload.title}
			class="details-heading"
			contenteditable="plaintext-only"
			onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
		></h2>
	{:else}
		<h2 class="details-heading" contenteditable="false">
			{container.payload.title}
		</h2>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li><ContainerSettingsDropdown bind:container bind:relatedContainers /></li>
		</ul>
	{/if}
</header>

<div {@attach createMapWithGeoJsonObject(feature)} class="map"></div>

<style>
	.map {
		border-radius: 8px;
		height: 388px;
	}
</style>
