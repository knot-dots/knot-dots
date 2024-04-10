<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import fetchContainers from '$lib/client/fetchContainers';
	import Card from '$lib/components/Card.svelte';
	import { paramsFromFragment, payloadTypes } from '$lib/models';
	import type { Container, TaskContainer } from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';

	export let container: Container;

	$: tasksRequest = fetchContainers({ implements: [container.revision] }) as Promise<
		TaskContainer[]
	>;

	function addTaskURL(url: URL) {
		const params = paramsFromFragment(url);
		params.set('create', payloadTypes.enum['internal_objective.task']);
		params.set('implements', String(container.revision));
		return `#${params.toString()}`;
	}
</script>

{#await tasksRequest then tasks}
	{#if tasks.length > 0 || $mayCreateContainer(payloadTypes.enum['internal_objective.task'])}
		<div class="tasks">
			<h3>{$_('tasks')}</h3>
			{#if tasks.length > 0}
				<ul class="carousel">
					{#each tasks as task}
						<li>
							<Card --height="100%" container={task} />
						</li>
					{/each}
				</ul>
			{/if}
			{#if $mayCreateContainer(payloadTypes.enum['internal_objective.task'])}
				<a class="button" href={addTaskURL($page.url)}>{$_('add_item')}</a>
			{/if}
		</div>
	{/if}
{/await}
