<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import { _, number } from 'svelte-i18n';
	import {
		type Container,
		type EffectContainer,
		isContainerWithEffect,
		isIndicatorContainer,
		isRelatedTo,
		predicates
	} from '$lib/models';
	import { findAncestors } from '$lib/models.js';

	export let container: EffectContainer;
	export let relatedContainers: Container[] = [];
	export let showLegend = false;

	let div: HTMLElement;

	$: {
		const indicator = relatedContainers.filter(isIndicatorContainer).find(isRelatedTo(container));
		const measure = findAncestors(container, relatedContainers, predicates.enum['is-part-of']).find(
			isContainerWithEffect
		);

		if (indicator && measure) {
			let unit = $_(indicator.payload.unit);

			const data = [
				...container.payload.plannedValues.map(([year, value], index) => ({
					date: new Date(year, 0),
					status: 'indicator.effect.planned_values',
					value: container.payload.achievedValues[index]
						? value - container.payload.achievedValues[index][1]
						: value
				})),
				...container.payload.achievedValues.map(([year, value]) => ({
					date: new Date(year, 0),
					status: 'indicator.effect.achieved_values',
					value
				}))
			];

			div?.firstChild?.remove();
			div?.append(
				Plot.plot({
					color: {
						legend: showLegend,
						domain: ['indicator.effect.planned_values', 'indicator.effect.achieved_values'],
						range: ['#ca1d61', '#6edaa6'],
						tickFormat: (v) => $_(v)
					},
					marks: [Plot.barY(data, { x: 'date', y: 'value', fill: 'status' })],
					x: { type: 'band' },
					y: { label: $_(unit), tickFormat: (d) => $number(d) }
				})
			);
		}
	}
</script>

<figure>
	{#if $$slots.caption}
		<figcaption><slot name="caption" /></figcaption>
	{/if}
	<div bind:this={div} role="img"></div>
</figure>

<style>
	figcaption {
		font-size: inherit;
		margin-bottom: 0.875rem;
	}
</style>
