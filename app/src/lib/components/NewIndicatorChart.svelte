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
			.find(({ payload }) => payload.indicator === container.guid)
	);

	let actualValues = $derived(
		actualDataContainer?.payload.values.map(([key, value]) => ({
			date: new Date(key, 0),
			value
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
						interval: 'year',
						fill: 'rgb(213, 239, 252)'
					}),
					Plot.lineY(actualValues, { x: 'date', y: 'value', interval: 'year' })
				],
				y: { label: $_(unit), tickFormat: (d) => $number(d) }
			})
		);
	};
</script>

{#if actualDataContainer}
	<figure>
		<div role="img" {@attach chart}></div>

		{#if actualDataContainer.payload.source}
			<figcaption>{$_('indicator.source')}: {actualDataContainer.payload.source}</figcaption>
		{/if}
	</figure>
{/if}
