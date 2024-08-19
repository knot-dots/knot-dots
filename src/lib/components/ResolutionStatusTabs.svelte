<script lang="ts">
	import { _ } from 'svelte-i18n';
	import LightBulb from '~icons/heroicons/light-bulb-16-solid';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { paramsFromFragment, resolutionStatus } from '$lib/models';
	import type { AnyContainer, ResolutionContainer, ResolutionStatus } from '$lib/models';
	import { resolutionStatusColors, resolutionStatusIcons } from '$lib/theme/models';

	export let container: ResolutionContainer;
	export let revisions: AnyContainer[];

	let selectedRevision: ResolutionContainer;

	$: {
		const parseResult = resolutionStatus.safeParse(
			paramsFromURL($page.url).get('resolutionStatus')
		);
		if (parseResult.success) {
			selectedRevision =
				(revisions as ResolutionContainer[]).findLast(
					({ payload }) => payload.resolutionStatus == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}

	function tabURL(params: URLSearchParams, status: ResolutionStatus) {
		const query = new URLSearchParams(params);
		query.set('resolutionStatus', status);
		return `#${query.toString()}`;
	}
</script>

<ul class="tabs">
	{#each resolutionStatus.options as statusOption}
		<li
			class="tab-item"
			class:tab-item--active={statusOption === selectedRevision.payload.resolutionStatus}
		>
			{#if resolutionStatus.options.findIndex((o) => statusOption === o) <= resolutionStatus.options.findIndex((o) => container.payload.resolutionStatus === o)}
				<a
					class="badge badge--{resolutionStatusColors.get(statusOption)}"
					href={tabURL(paramsFromFragment($page.url), statusOption)}
				>
					<svelte:component this={resolutionStatusIcons.get(statusOption) ?? LightBulb} />
					{$_(statusOption)}
				</a>
			{:else}
				<span class="badge badge--{resolutionStatusColors.get(statusOption)}">
					<svelte:component this={resolutionStatusIcons.get(statusOption) ?? LightBulb} />
					{$_(statusOption)}
				</span>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.tabs > .tab-item {
		align-items: center;
		display: flex;
		font-size: 0;
		opacity: 0.3;
	}

	.tabs > .tab-item--active {
		font-size: inherit;
		opacity: 1;
	}
</style>
