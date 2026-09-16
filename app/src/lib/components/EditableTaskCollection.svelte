<script lang="ts">
	import createCreationTemplateAvailability from '$lib/client/createCreationTemplateAvailability.svelte';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import {
		type AnyPayload,
		type Container,
		containerOfType,
		findAncestors,
		isTaskContainer,
		isMeasureContainer,
		type NewContainer,
		payloadTypes,
		predicates,
		type TaskCollectionPayload,
		type TaskPayload
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: Container<TaskCollectionPayload>;
		editable?: boolean;
		fetchDisabled?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		fetchDisabled = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let tasksRequest = $derived(
		fetchDisabled
			? Promise.resolve(relatedContainers.filter(isTaskContainer))
			: parentContainer
				? fetchRelatedContainers(parentContainer.guid, {
						payloadType: [payloadTypes.enum.task],
						relationType: [predicates.enum['is-part-of']]
					})
				: new Promise(() => [])
	) as Promise<Container<TaskPayload>[]>;

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	const templateAvailability = createCreationTemplateAvailability(createItem);

	function createItem() {
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
			...(isMeasureContainer(parentContainer)
				? [{ object: parentContainer.guid, predicate: predicates.enum['is-part-of-measure'] }]
				: parentContainer.relation.filter(
						({ predicate, subject }) =>
							predicate == predicates.enum['is-part-of-measure'] && subject === parentContainer.guid
					)
			).map(({ object }) => ({
				object,
				position: 0,
				predicate: predicates.enum['is-part-of-measure']
			}))
		];

		return item;
	}

	function addItem() {
		if (!templateAvailability.has(payloadTypes.enum.task)) return;
		$newContainer = createItem();
		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">{container.payload.title}</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.task, container.managed_by) && templateAvailability.has(payloadTypes.enum.task)}
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
		mayAddItem={$mayCreateContainer(payloadTypes.enum.task, container.managed_by) &&
			editable &&
			templateAvailability.has(payloadTypes.enum.task)}
	>
		{#snippet itemSnippet(item)}
			<TaskCard container={item} ignoreBulkActionContext showTaskStatusBadge />
		{/snippet}
	</Carousel>
{/await}
