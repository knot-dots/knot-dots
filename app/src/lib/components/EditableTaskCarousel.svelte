<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/heroicons/plus-solid';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import {
		type Container,
		containerOfType,
		type NewContainer,
		payloadTypes,
		predicates,
		type TaskContainer
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: Container;
		editable?: boolean;
	}

	let { container, editable = false }: Props = $props();

	let guid = $derived(container.guid);

	let tasksRequest = $derived(
		fetchRelatedContainers(guid, {
			payloadType: [payloadTypes.enum.task],
			relationType: [predicates.enum['is-part-of']]
		}) as Promise<TaskContainer[]>
	);

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createContainer() {
		const task = containerOfType(
			payloadTypes.enum.task,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		task.relation = [
			{ object: container.guid, position: 0, predicate: predicates.enum['is-part-of'] },
			...container.relation
				.filter(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
				.map(({ object }) => ({
					object,
					position: 0,
					predicate: predicates.enum['is-part-of-measure']
				}))
		];

		$newContainer = task;

		createContainerDialog.getElement().showModal();
	}
</script>

<ul class="carousel" class:editable>
	{#await tasksRequest then tasks}
		{#each tasks as task}
			<li>
				<TaskCard container={task} showTaskStatusBadge />
			</li>
		{/each}
	{/await}
	{#if $mayCreateContainer(payloadTypes.enum.task, container.managed_by) && editable}
		<li>
			<button aria-label={$_('add_item')} class="card" onclick={createContainer} type="button">
				<Plus />
			</button>
		</li>
	{/if}
</ul>

<style>
	.card {
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		display: grid;
		grid-row: 1 / 4;
		min-height: 6rem;
		justify-content: center;
	}

	.card :global(svg) {
		height: 4rem;
		width: 4rem;
	}
</style>
