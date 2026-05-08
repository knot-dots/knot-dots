<script lang="ts">
	import { IsInViewport, resource } from 'runed';
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
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable()
	}: Props = $props();

	let header = $state<HTMLElement>();
	const inViewport = new IsInViewport(() => header);
	let inViewportOnce = $state(false);
	$effect(() => {
		if (inViewport.current) {
			inViewportOnce = true;
		}
	});

	const tasksResource = resource(
		[() => parentContainer, () => inViewportOnce],
		async ([parent], _, { signal }) => {
			if (!parent || !inViewportOnce) return [] as TaskContainer[];
			return fetchRelatedContainers(
				parent.guid,
				{
					payloadType: [payloadTypes.enum.task],
					relationType: [predicates.enum['is-part-of']]
				},
				'',
				{ signal }
			) as Promise<TaskContainer[]>;
		},
		{ lazy: true }
	);

	let allTasks = $state<TaskContainer[]>([]);
	$effect(() => {
		if (tasksResource.current !== undefined) {
			allTasks = tasksResource.current;
		}
	});

	let ancestors = $derived(
		parentContainer ? findAncestors(parentContainer, allTasks, [predicates.enum['is-part-of']]) : []
	);

	let directChildren = $derived(
		parentContainer
			? allTasks.filter(
					(item) =>
						item.guid !== parentContainer.guid &&
						!ancestors.some((a) => a.guid === item.guid) &&
						item.relation.some(
							(r) =>
								r.predicate === predicates.enum['is-part-of'] && r.object === parentContainer.guid
						)
				)
			: []
	);

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

<header bind:this={header}>
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
				<ContainerSettingsDropdown
					bind:container
					bind:parentContainer
					bind:relatedContainers={allTasks}
				/>
			</li>
		</ul>
	{/if}
</header>

<Carousel
	{addItem}
	items={directChildren}
	mayAddItem={$mayCreateContainer(payloadTypes.enum.task, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<TaskCard container={item} showTaskStatusBadge />
	{/snippet}
</Carousel>
