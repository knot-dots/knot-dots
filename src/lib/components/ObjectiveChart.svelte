<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _ } from 'svelte-i18n';
	import type { IndicatorContainer, IndicatorObjective } from '$lib/models';

	export let indicator: IndicatorContainer;
	export let objective: IndicatorObjective;

	let div: HTMLElement;

	$: {
		div?.firstChild?.remove();
		div?.append(
			Plot.plot({
				marks: [
					Plot.barY(
						objective.wantedValues.map(([key, value]) => ({
							Year: key,
							Value: value,
							Status: $_('indicator.wanted_values')
						})),
						{ x: 'Year', y: 'Value', fill: 'red' }
					)
				],
				x: { label: null, tickFormat: '' },
				y: { label: $_(`${indicator.payload.unit}`) },
				height: 200,
				width: 320
			})
		);
	}
</script>

<figure>
	<figcaption><a href="/indicator/{indicator.guid}">{indicator.payload.title}</a></figcaption>
	<div bind:this={div} role="img"></div>
</figure>

<style>
	figure {
		display: inline-block;
	}

	figcaption {
		font-size: inherit;
		margin-bottom: 0.875rem;
	}
</style>
