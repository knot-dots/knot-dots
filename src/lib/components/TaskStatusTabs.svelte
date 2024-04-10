<script lang="ts">
	import { _ } from 'svelte-i18n';
	import LightBulb from '~icons/heroicons/light-bulb-16-solid';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { paramsFromFragment, taskStatus } from '$lib/models';
	import type { AnyContainer, TaskContainer, TaskStatus } from '$lib/models';
	import { taskStatusColors, taskStatusIcons } from '$lib/theme/models';

	export let container: TaskContainer;
	export let revisions: AnyContainer[];

	let selectedRevision: TaskContainer;

	$: {
		const parseResult = taskStatus.safeParse(paramsFromURL($page.url).get('taskStatus'));
		if (parseResult.success) {
			selectedRevision =
				(revisions as TaskContainer[]).findLast(
					({ payload }) => payload.taskStatus == parseResult.data
				) ?? container;
		} else {
			selectedRevision = container;
		}
	}

	function tabURL(params: URLSearchParams, status: TaskStatus) {
		const query = new URLSearchParams(params);
		query.set('taskStatus', status);
		return `#${query.toString()}`;
	}
</script>

<ul class="tabs">
	{#each taskStatus.options as statusOption}
		<li
			class="tab-item"
			class:tab-item--active={statusOption === selectedRevision.payload.taskStatus}
		>
			{#if taskStatus.options.findIndex((o) => statusOption === o) <= taskStatus.options.findIndex((o) => container.payload.taskStatus === o)}
				<a
					class="badge badge--{taskStatusColors.get(statusOption)}"
					href={tabURL(paramsFromFragment($page.url), statusOption)}
				>
					<svelte:component this={taskStatusIcons.get(statusOption) ?? LightBulb} />
					{$_(statusOption)}
				</a>
			{:else}
				<span class="badge badge--{taskStatusColors.get(statusOption)}">
					<svelte:component this={taskStatusIcons.get(statusOption) ?? LightBulb} />
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
