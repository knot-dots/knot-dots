<script lang="ts">
	import type { Map } from 'leaflet';
	import type { GeoJsonObject } from 'geojson';
	import { onDestroy, onMount } from 'svelte';
	import 'leaflet/dist/leaflet.css';

	interface Props {
		feature?: GeoJsonObject;
	}

	let { feature }: Props = $props();

	let map: Map;

	let mapElement: HTMLElement;

	onMount(async () => {
		const leaflet = await import('leaflet');
		map = leaflet.map(mapElement);

		leaflet
			.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution:
					'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			})
			.addTo(map);

		if (feature) {
			map.fitBounds(leaflet.geoJson(feature).addTo(map).getBounds());
		}
	});

	onDestroy(() => {
		map?.remove();
	});
</script>

<div bind:this={mapElement} class="map"></div>
