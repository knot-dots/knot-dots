<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers.js';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import {
		isOverlayKey,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates
	} from '$lib/models';
	import type { Container, TaskContainer } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	export let container: Container;

	$: tasksRequest = fetchRelatedContainers(container.guid, {
		payloadType: [payloadTypes.enum.task],
		relationType: [predicates.enum['is-part-of']]
	}) as Promise<TaskContainer[]>;

	function addTaskURL(url: URL) {
		const params = paramsFromFragment(url);
		const newParams = new URLSearchParams([
			...Array.from(params.entries()).filter(([k]) => !isOverlayKey(k)),
			[overlayKey.enum.create, payloadTypes.enum.task],
			[predicates.enum['is-part-of'], container.guid],
			...container.relation
				.filter(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
				.map(({ object }) => [predicates.enum['is-part-of-measure'], object])
		]);
		return `#${newParams.toString()}`;
	}
</script>

{#await tasksRequest then tasks}
	{#if tasks.length > 0 || $mayCreateContainer(payloadTypes.enum.task, container.managed_by)}
		<div class="tasks">
			<h3>{$_('tasks')}</h3>
			{#if tasks.length > 0}
				<ul class="carousel">
					{#each tasks as task}
						<li>
							<TaskCard container={task} showTaskStatusBadge />
						</li>
					{/each}
				</ul>
			{/if}
			{#if $mayCreateContainer(payloadTypes.enum.task, container.managed_by)}
				<a class="button" href={addTaskURL($page.url)}>{$_('add_item')}</a>
			{/if}
		</div>
	{/if}
{/await}
