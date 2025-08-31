import type { Map } from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import type { Attachment } from 'svelte/attachments';

export function createMapWithGeoJsonObject(geometry: GeoJsonObject): Attachment<HTMLElement> {
	return (element) => {
		let map: Map;

		import('leaflet').then((leaflet) => {
			map = leaflet.map(element);

			leaflet
				.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					attribution:
						'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
				})
				.addTo(map);

			map.fitBounds(leaflet.geoJson(geometry).addTo(map).getBounds());
		});

		return () => {
			map?.remove();
		};
	};
}
