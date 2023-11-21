<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _ } from 'svelte-i18n';
	import type { IndicatorContainer } from '$lib/models';

	export let container: IndicatorContainer;

	let div: HTMLElement;

	$: {
		let quantity = $_(`${container.payload.quantity}.label`);
		let unit = $_(container.payload.unit);

		div?.firstChild?.remove();
		div?.append(
			Plot.plot({
				marks: [
					Plot.areaY(
						[...container.payload.historicValues, ...container.payload.extrapolatedValues].map(
							([key, value]) => ({ Year: key, Value: value })
						),
						{ x: 'Year', y: 'Value', fillOpacity: 0.1, curve: 'linear' }
					),
					Plot.lineY(
						container.payload.extrapolatedValues.map(([key, value]) => ({
							Year: key,
							Value: value
						})),
						{
							x: 'Year',
							y: 'Value',
							stroke: 'red',
							strokeWidth: 1
						}
					),
					Plot.ruleX([new Date().getFullYear()])
				],
				x: { label: null, tickFormat: '' },
				y: { label: `${quantity} (${unit})` }
			})
		);
	}
</script>

<div bind:this={div} role="img"></div>
