<script lang="ts">
	import * as Plot from '@observablehq/plot';
	import type { Attachment } from 'svelte/attachments';
	import { _, number } from 'svelte-i18n';
	import {
		type AnyContainer,
		type IndicatorTemplateContainer,
		isActualDataContainer
	} from '$lib/models';

	interface Props {
		container: IndicatorTemplateContainer;
		relatedContainers?: AnyContainer[];
	}

	let { container, relatedContainers = [] }: Props = $props();

	let unit = $derived($_(container.payload.unit));

	let actualDataContainer = $derived(
		relatedContainers
			.filter(isActualDataContainer)
			.filter(({ payload }) => payload.indicator === container.guid)
			.toSorted((a, b) => (a.payload.source ? (b.payload.source ? 0 : -1) : 1))
	);

	let actualValues = $derived(
		actualDataContainer[0]?.payload.values.map(([key, value]) => ({
			date: new Date(key, 0),
			value: actualDataContainer[1]?.payload.values.find(([k, v]) => k == key)?.at(1) ?? value
		})) ?? []
	);

	const chart: Attachment = (element) => {
		element?.firstChild?.remove();
		element?.append(
			Plot.plot({
				marks: [
					Plot.areaY(actualValues, {
						x: 'date',
						y: 'value',
						fill: 'rgb(213, 239, 252)'
					}),
					Plot.lineY(actualValues, { x: 'date', y: 'value' })
				],
				y: { label: $_(unit), tickFormat: (d) => $number(d) }
			})
		);
	};
</script>

{#if actualDataContainer[0]}
	<figure>
		<div role="img" {@attach chart}></div>

		{#if actualDataContainer[0].payload.source}
			<figcaption>{$_('indicator.source')}: {actualDataContainer[0].payload.source}</figcaption>
		{/if}
	</figure>
{/if}
