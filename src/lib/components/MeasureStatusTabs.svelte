<script lang="ts">
	import { Icon, LightBulb } from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { status } from '$lib/models';
	import type { AnyContainer, ContainerWithEffect, Status } from '$lib/models';
	import { statusColors, statusIcons } from '$lib/theme/models';

	export let container: ContainerWithEffect;
	export let revisions: AnyContainer[];

	let selectedRevision: ContainerWithEffect;

	$: {
		const parseResult = status.safeParse(paramsFromURL($page.url).get('status'));
		if (parseResult.success) {
			selectedRevision =
				(revisions as ContainerWithEffect[]).findLast(
					({ payload }) => payload.status == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}

	function tabURL(params: URLSearchParams, status: Status) {
		const query = new URLSearchParams(params);
		query.set('status', status);
		return `#${query.toString()}`;
	}
</script>

<ul class="tabs">
	{#each status.options as statusOption}
		<li class="tab-item" class:tab-item--active={statusOption === selectedRevision.payload.status}>
			{#if status.options.findIndex((o) => statusOption === o) <= status.options.findIndex((o) => container.payload.status === o)}
				<a
					class="badge badge--{statusColors.get(statusOption)}"
					href={tabURL(paramsFromURL($page.url), statusOption)}
				>
					<Icon src={statusIcons.get(statusOption) ?? LightBulb} size="16" mini />
					{$_(statusOption)}
				</a>
			{:else}
				<span class="badge badge--{statusColors.get(statusOption)}">
					<Icon src={statusIcons.get(statusOption) ?? LightBulb} size="16" mini />
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
