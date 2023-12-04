<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _ } from 'svelte-i18n';
	import type { IndicatorContainer, IndicatorEffect } from '$lib/models';

	export let indicator: IndicatorContainer;
	export let effect: IndicatorEffect;

	let div: HTMLElement;
	let quantity = $_(`${indicator.payload.quantity}.label`);
	let unit = $_(indicator.payload.unit);

	$: {
		div?.firstChild?.remove();
		div?.append(
			Plot.plot({
				marks: [
					Plot.barY(
						effect.achievedValues
							.map(([key, value]) => ({
								Year: key,
								Value: value,
								Status: $_('indicator.effect.achieved_values')
							}))
							.concat(
								effect.plannedValues.map(([key, value]) => ({
									Year: key,
									Value: value,
									Status: $_('indicator.effect.planned_values')
								}))
							),
						{ fx: 'Year', x: 'Status', y: 'Value', fill: 'Status' }
					)
				],
				color: { legend: true },
				x: { axis: null },
				fx: { label: null, tickFormat: '' },
				y: { label: `${quantity} (${unit})` }
			})
		);
	}
</script>

<figure>
	<figcaption><a href="/indicator/{indicator.guid}">{indicator.payload.title}</a></figcaption>
	<div bind:this={div} role="img"></div>
</figure>

<style>
	figcaption {
		color: var(--color-gray-800);
		font-size: inherit;
		font-weight: 500;
		margin-bottom: 0.875rem;
	}
</style>
