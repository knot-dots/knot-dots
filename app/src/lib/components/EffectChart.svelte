<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import {
		type AnyContainer,
		type EffectContainer,
		findAncestors,
		isContainerWithEffect,
		isIndicatorContainer,
		isRelatedTo,
		predicates
	} from '$lib/models';

	interface Props {
		container: EffectContainer;
		relatedContainers?: AnyContainer[];
		showLegend?: boolean;
	}

	let { container, relatedContainers = [], showLegend = false }: Props = $props();

	const chart: Attachment = (element) => {
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

			element?.firstChild?.remove();
			element?.append(
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
	};
</script>

<figure>
	<div role="img" {@attach chart}></div>
</figure>
