<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _ } from 'svelte-i18n';
	import type { IndicatorContainer, IndicatorEffect } from '$lib/models';

	export let indicator: IndicatorContainer;
	export let effect: IndicatorEffect;

	let div: HTMLElement;

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
