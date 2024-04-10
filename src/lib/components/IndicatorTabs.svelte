<script context="module" lang="ts">
	import { z } from 'zod';

	export const tab = z.enum(['all', 'historical_values', 'objectives', 'measures']);
	export type IndicatorTab = z.infer<typeof tab>;
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { paramsFromFragment } from '$lib/models';

	let currentTab: IndicatorTab;

	$: {
		const parseResult = tab.safeParse(paramsFromURL($page.url).get('tab'));
		if (parseResult.success) {
			currentTab = parseResult.data;
		} else {
			currentTab = tab.enum.all;
		}
	}

	function tabURL(params: URLSearchParams, tab: IndicatorTab) {
		const query = new URLSearchParams(params);
		query.set('tab', tab);
		return `#${query.toString()}`;
	}
</script>

<ul class="tabs">
	{#each tab.options as tabOption}
		<li class="tab-item" class:tab-item--active={tabOption === currentTab}>
			<a class="badge" href={tabURL(paramsFromFragment($page.url), tabOption)}>
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
