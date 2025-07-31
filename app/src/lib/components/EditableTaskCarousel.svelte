<script lang="ts">
	import { getContext } from 'svelte';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import Carousel from '$lib/components/Carousel.svelte';
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

{#await tasksRequest then tasks}
	<Carousel
		addItem={createContainer}
		items={tasks}
		mayAddItem={$mayCreateContainer(payloadTypes.enum.task, container.managed_by) && editable}
	>
		{#snippet itemSnippet(item)}
			<TaskCard container={item} showTaskStatusBadge />
		{/snippet}
	</Carousel>
{/await}
