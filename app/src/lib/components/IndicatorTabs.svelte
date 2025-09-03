<script lang="ts" module>
	import { z } from 'zod';

	export const tab = z.enum(['all', 'historical_values', 'objectives', 'measures']);
	export type IndicatorTab = z.infer<typeof tab>;
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { type IndicatorContainer, hasHistoricalValues, paramsFromFragment } from '$lib/models';

	interface Props {
		container: IndicatorContainer;
	}

	let { container }: Props = $props();

	let currentTab = $derived.by(() => {
		const parseResult = tab.safeParse(paramsFromURL(page.url).get('tab'));
		return parseResult.success ? parseResult.data : tab.enum.all;
	});

	function tabURL(params: URLSearchParams, tab: IndicatorTab) {
		const query = new URLSearchParams(params);
		query.set('tab', tab);
		return `#${query.toString()}`;
	}
</script>

<ul class="tabs">
	{#each tab.options.filter((o) => hasHistoricalValues(container) || o != 'historical_values') as tabOption}
		<li class="tab-item" class:tab-item--active={tabOption === currentTab}>
			<a class="badge" href={tabURL(paramsFromFragment(page.url), tabOption)}>
				{$_(`indicator.tab.${tabOption}`)}
			</a>
		</li>
	{/each}
</ul>

<style>
	.tabs > .tab-item {
		opacity: 0.3;
	}

	.tabs > .tab-item--active {
		opacity: 1;
	}
</style>
