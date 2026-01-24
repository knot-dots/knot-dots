<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import {
		type AnyContainer,
		type EffectContainer,
		isContainerWithPayloadType,
		isRelatedTo,
		payloadTypes
	} from '$lib/models';

	interface Props {
		container: EffectContainer;
		relatedContainers?: AnyContainer[];
		showLegend?: boolean;
	}

	let { container, relatedContainers = [], showLegend = false }: Props = $props();

	const indicator = $derived(
		relatedContainers
			.filter((c) => isContainerWithPayloadType(payloadTypes.enum.indicator, c))
			.find(isRelatedTo(container))
	);

	const unit = $derived($_(indicator?.payload.unit ?? ''));

	// Create a reactive state for the container's width
	let currentWidth = $state(0);

	const chart: Attachment = (element) => {
		if (!indicator) return;

		// Use a ResizeObserver to measure the container and trigger a render
		const observer = new ResizeObserver((entries) => {
			for (let entry of entries) {
				// Get the actual inner width of the container div
				const { width } = entry.contentRect;

				// Only render if we have a valid width
				if (width > 0) {
					currentWidth = width;
				}
			}
		});

		// Start observing the element this action is attached to
		observer.observe(element);

		element.innerHTML = '';
		element.append(
			Plot.plot({
				color: {
					legend: showLegend,
					domain: ['indicator.effect.planned_values', 'indicator.effect.achieved_values'],
					range: ['#ca1d61', '#6edaa6'],
					tickFormat: (v) => $_(v)
				},
				marks: [
					Plot.barY(
						container.payload.plannedValues.map(([year, value]) => ({
							date: new Date(year, 0),
							status: 'indicator.effect.planned_values',
							value
						})),
						{
							x: 'date',
							y: 'value',
							fill: 'status'
						}
					),
					Plot.barY(
						container.payload.achievedValues.map(([year, value]) => ({
							date: new Date(year, 0),
							status: 'indicator.effect.achieved_values',
							value
						})),
						{
							x: 'date',
							y: 'value',
							fill: 'status'
						}
					)
				],
				x: { type: 'band' },
				y: { label: $_(unit), tickFormat: (d) => $number(d) },
				width: currentWidth,
				height: (currentWidth * 400) / 640 // Maintain the 640:400 aspect ratio
			})
		);

		// Return a destroy method for cleanup
		return () => {
			observer.disconnect();
		};
	};
</script>

<figure>
	<div role="img" {@attach chart}></div>
</figure>
