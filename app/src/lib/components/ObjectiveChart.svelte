<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import { page } from '$app/state';
	import {
		type Container,
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
		relatedContainers?: Container[];
	}

	let { container, relatedContainers = [] }: Props = $props();

	const chart: Attachment = (element) => {
		const indicator = relatedContainers.filter(isIndicatorContainer).find(isRelatedTo(container));

		if (indicator) {
			let unit = $_(indicator.payload.unit);

			const total = container.payload.wantedValues.map(([year, value]) => ({
				date: new Date(year, 0),
				value
			}));

			const subTargets = findLeafObjectives(
				findDescendants(
					container,
					relatedContainers.filter(isObjectiveContainer),
					predicates.enum['is-sub-target-of']
				)
			).flatMap(({ guid, payload }) =>
				payload.wantedValues.map(([year, value]) => ({
					date: new Date(year, 0),
					title: payload.title,
					guid,
					value
				}))
			);

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
					y: { label: $_(unit), tickFormat: (d) => $number(d) }
				})
			);
		}
	};
</script>

<figure>
	<div role="img" {@attach chart}></div>
</figure>
