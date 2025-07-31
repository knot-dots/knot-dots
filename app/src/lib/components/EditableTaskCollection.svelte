<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import {
		type AnyContainer,
		containerOfType,
		type NewContainer,
		payloadTypes,
		predicates,
		type TaskCollectionContainer,
		type TaskContainer
	} from '$lib/models';
	import { sectionOf } from '$lib/relations';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: TaskCollectionContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		relatedContainers = $bindable()
	}: Props = $props();

	let parentContainer = $derived(sectionOf(container, relatedContainers));

	let tasksRequest = $derived(
		parentContainer
			? fetchRelatedContainers(parentContainer.guid, {
					payloadType: [payloadTypes.enum.task],
					relationType: [predicates.enum['is-part-of']]
				})
			: new Promise(() => [])
	) as Promise<TaskContainer[]>;

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function addItem() {
		if (!parentContainer) {
			return;
		}

		const item = containerOfType(
			payloadTypes.enum.task,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		item.relation = [
			{ object: parentContainer.guid, position: 0, predicate: predicates.enum['is-part-of'] },
			...parentContainer.relation
				.filter(({ predicate }) => predicate == predicates.enum['is-part-of-measure'])
				.map(({ object }) => ({
					object,
					position: 0,
					predicate: predicates.enum['is-part-of-measure']
				}))
		];

		$newContainer = item;

		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	<h2 class="details-heading">{$_('tasks')}</h2>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.task, container.managed_by)}
				<li>
					<button
						aria-label={$_('add_item')}
						class="action-button action-button--size-l"
						onclick={addItem}
						type="button"
					>
						<Plus />
					</button>
				</li>
			{/if}

			<li>
				<ContainerSettingsDropdown bind:container bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#await tasksRequest then items}
	<Carousel
		{addItem}
		{items}
		mayAddItem={$mayCreateContainer(payloadTypes.enum.task, container.managed_by) && editable}
	>
		{#snippet itemSnippet(item)}
			<TaskCard container={item} showTaskStatusBadge />
		{/snippet}
	</Carousel>
{/await}
