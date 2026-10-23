<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import CirclePlus from '~icons/flowbite/circle-plus-solid';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import AutoresizingTextarea from '$lib/components/AutoresizingTextarea.svelte';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyPayload,
		type Container,
		containerOfType,
		isContainerWithCategory,
		isMeasureContainer,
		isSimpleMeasureContainer,
		listTypes,
		type NewContainer,
		payloadTypes,
		predicates,
		type RelationCollectionPayload
	} from '$lib/models';
	import { ability, addItemState, mayCreateContainer, newContainer } from '$lib/stores';
	import { getDirectMeasureGuids } from '$lib/templateScopes';

	interface Props {
		container: Container<RelationCollectionPayload>;
		editable?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
	}

	let {
		container = $bindable(),
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let items = $derived(
		relatedContainers.filter(({ guid }) => container.payload.item.includes(guid))
	);

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	let mayAddItem = $derived(
		editable && $mayCreateContainer(container.payload.payloadType, container)
	);

	function createItem() {
		const item = containerOfType(container.payload.payloadType, parentContainer) as NewContainer;

		// Items of a measure also belong to it as a measure part; items of a goal
		// inherit the goal's measures, which scopes templates and workspaces.
		const measureGuids =
			isMeasureContainer(parentContainer) || isSimpleMeasureContainer(parentContainer)
				? [parentContainer.guid]
				: getDirectMeasureGuids(parentContainer);

		item.relation = [
			{
				object: parentContainer.guid,
				position: 0,
				predicate: container.payload.predicate
			},
			...measureGuids.map((object) => ({
				object,
				position: 0,
				predicate: predicates.enum['is-part-of-measure']
			}))
		];

		if (isContainerWithCategory(item) && isContainerWithCategory(parentContainer)) {
			item.payload.category = Object.fromEntries(
				Object.entries(parentContainer.payload.category).filter(([key]) =>
					page.data.categoryContext.objectTypesPerKey[key]?.some(
						(t) => t === container.payload.payloadType
					)
				)
			);
		}

		if (isMeasureContainer(item) && isMeasureContainer(parentContainer)) {
			item.payload.hierarchyLevel = parentContainer.payload.hierarchyLevel + 1;
			item.payload.status = parentContainer.payload.status;
			item.payload.visibility = parentContainer.payload.visibility;
		}

		return item;
	}

	function addItem() {
		$newContainer = createItem();

		$addItemState = { target: container };

		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">
		{#if editable && $ability.can('update', container)}
			{const id = crypto.randomUUID()}
			<label class="is-visually-hidden" for={id}>{$_('title')}</label>
			<AutoresizingTextarea
				bind:value={container.payload.title}
				{id}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
					}
				}}
				placeholder={$_('title')}
				rows={1}
			/>
		{:else}
			{container.payload.title}
		{/if}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if mayAddItem}
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

{#snippet card(item: Container<AnyPayload>, height?: string)}
	<Card
		--height={height}
		container={item}
		ignoreBulkActionContext
		relatedContainers={relatedContainers.filter(
			({ payload, relation }) =>
				payload.type === payloadTypes.enum.indicator ||
				relation.some(({ object, subject }) => [object, subject].includes(item.guid))
		)}
	/>
{/snippet}

{#if container.payload.listType === listTypes.enum.carousel}
	<Carousel {addItem} {items} {mayAddItem}>
		{#snippet itemSnippet(item)}
			{@render card(item)}
		{/snippet}
	</Carousel>
{:else}
	<ul class="catalog wide">
		{#each items as item (item.guid)}
			<li>
				{@render card(item, '100%')}
			</li>
		{/each}
		{#if mayAddItem}
			<li>
				<button class="card" onclick={addItem} type="button" {@attach tooltip($_('add_item'))}>
					<CirclePlus />
				</button>
			</li>
		{/if}
	</ul>
{/if}

<style>
	.card {
		align-items: center;
		background: #ffffff;
		border: 1px solid var(--color-gray-200);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		display: grid;
		height: 100%;
		justify-content: center;
		min-height: 6rem;
		width: 100%;
	}

	.card :global(svg) {
		height: 2.25rem;
		width: 2.25rem;
	}
</style>
