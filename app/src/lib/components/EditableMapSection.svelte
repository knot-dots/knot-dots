<script lang="ts">
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import { createMapWithGeoJsonObject } from '$lib/attachments/map';
	import type { AnyContainer, MapContainer } from '$lib/models';
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

<div {@attach createMapWithGeoJsonObject(container.payload.geometry)} class="map"></div>

<style>
	.map {
		border-radius: 8px;
		height: 388px;
	}
</style>
