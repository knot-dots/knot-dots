<script lang="ts">
	import Plus from '~icons/heroicons/plus-solid';
	import { page } from '$app/stores';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import Card from '$lib/components/Card.svelte';
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
	export let editable = false;

	$: guid = container.guid;

	$: tasksRequest = fetchRelatedContainers(guid, {
		payloadType: [payloadTypes.enum.task],
		relationType: [predicates.enum['is-part-of']]
	}) as Promise<TaskContainer[]>;

	function addTaskURL(url: URL) {
		const params = paramsFromFragment(url);
		const newParams = new URLSearchParams([
			...Array.from(params.entries()).filter(([k]) => !isOverlayKey(k)),
			[overlayKey.enum.create, payloadTypes.enum.task],
			[predicates.enum['is-part-of'], String(container.revision)],
			...container.relation
				.filter(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
				.map(({ object }) => [predicates.enum['is-part-of-measure'], String(object)])
		]);
		return `#${newParams.toString()}`;
	}
</script>

<ul class="carousel" class:editable>
	{#await tasksRequest then tasks}
		{#each tasks as task}
			<li>
				<Card container={task} />
			</li>
		{/each}
	{/await}
	{#if editable && $mayCreateContainer(payloadTypes.enum.task, container.managed_by)}
		<li>
			<a class="card" href={addTaskURL($page.url)}><Plus /></a>
		</li>
	{/if}
</ul>

<style>
	.carousel {
		border-radius: 8px;
		min-height: 299px;
		padding: 1rem;
	}

	.carousel.editable {
		background-color: var(--color-gray-050);
	}

	.card {
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-md);
		cursor: pointer;
		display: grid;
		grid-row: 1 / 4;
		height: 267px;
		justify-content: center;
	}

	.card :global(svg) {
		height: 4rem;
		width: 4rem;
	}
</style>
