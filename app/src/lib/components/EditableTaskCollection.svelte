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
		findAncestors,
		type NewContainer,
		payloadTypes,
		predicates,
		type TaskCollectionContainer,
		type TaskContainer
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: TaskCollectionContainer;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

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
	<svelte:element this={heading} class="details-heading">{container.payload.title}</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.task, container.managed_by)}
				<li>
					<button
						class="action-button action-button--size-l"
						onclick={addItem}
						type="button"
						{@attach tooltip($_('add_item'))}
					>
						<Plus />
					</button>
				</li>
			{/if}

			<li>
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

{#await tasksRequest then items}
	{@const ancestors = parentContainer
		? findAncestors(parentContainer, items, [predicates.enum['is-part-of']])
		: []}
	{@const directChildren = parentContainer
		? items.filter(
				(item) =>
					item.guid !== parentContainer.guid &&
					!ancestors.some((a) => a.guid === item.guid) &&
					item.relation.some(
						(r) =>
							r.predicate === predicates.enum['is-part-of'] && r.object === parentContainer.guid
					)
			)
		: []}
	<Carousel
		{addItem}
		items={directChildren}
		mayAddItem={$mayCreateContainer(payloadTypes.enum.task, container.managed_by) && editable}
	>
		{#snippet itemSnippet(item)}
			<TaskCard container={item} showTaskStatusBadge />
		{/snippet}
	</Carousel>
{/await}
