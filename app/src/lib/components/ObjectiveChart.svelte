<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import { page } from '$app/state';
	import {
		type AnyContainer,
		findDescendants,
		findLeafObjectives,
		isIndicatorContainer,
		isObjectiveContainer,
		isRelatedTo,
		type ObjectiveContainer,
		overlayKey,
		overlayURL,
		predicates
	} from '$lib/models';

	interface Props {
		container: ObjectiveContainer;
		relatedContainers?: AnyContainer[];
	}

	let { container, relatedContainers = [] }: Props = $props();

	const indicator = $derived(
		relatedContainers.filter(isIndicatorContainer).find(isRelatedTo(container))
	);

	const unit = $derived($_(indicator?.payload.unit ?? ''));

	const total = $derived(
		container.payload.wantedValues.map(([year, value]) => ({
			date: new Date(year, 0),
			value
		}))
	);

	const subTargets = $derived(
		findLeafObjectives(
			findDescendants(container, relatedContainers.filter(isObjectiveContainer), [
				predicates.enum['is-sub-target-of']
			])
		).flatMap(({ guid, payload }) =>
			payload.wantedValues.map(([year, value]) => ({
				date: new Date(year, 0),
				title: payload.title,
				guid,
				value
			}))
		)
	);

	const chart: Attachment = (element) => {
		if (!indicator || !element) return;

		// Create a reactive state for the container's width
		let currentWidth = $state(0);

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

		$effect(() => {
			element?.firstChild?.remove();
			element?.append(
				Plot.plot({
					color: { scheme: 'Blues' },
					marks: [
						Plot.lineY(total, { x: 'date', y: 'value' }),
						Plot.areaY(subTargets, {
							x: 'date',
							y: 'value',
							fill: 'guid',
							href: ({ guid }) => overlayURL(page.url, overlayKey.enum.view, guid),
							title: ({ title }) => title
						})
					],
					y: { label: $_(unit), tickFormat: (d) => $number(d) },
					width: currentWidth,
					height: (currentWidth * 400) / 640 // Maintain the 640:400 aspect ratio
				})
			);
		});

		// Return a destroy method for cleanup
		return () => {
			observer.disconnect();
		};
	};
</script>

<figure>
	<div role="img" {@attach chart}></div>
</figure>
