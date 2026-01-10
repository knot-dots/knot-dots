<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import KnowledgeCard from '$lib/components/KnowledgeCard.svelte';
	import Wall from '$lib/components/Wall.svelte';
	import Accordion from '$lib/components/Accordion.svelte';
	import List from '$lib/components/List.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import ContainerModeDropdown from '$lib/components/ContainerModeDropdown.svelte';
	import {
		type AnyContainer,
		containerOfType,
		predicates,
		type KnowledgeContainer,
		type KnowledgeCollectionContainer,
		type NewContainer,
		payloadTypes
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import { ability } from '$lib/stores';

	interface Props {
		container: KnowledgeCollectionContainer;
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

	let knowledgeRequest = $derived(
		fetchRelatedContainers(container.guid, {
			payloadType: [payloadTypes.enum.knowledge],
			relationType: [predicates.enum['is-part-of']]
		})
	) as Promise<KnowledgeContainer[]>;

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function addItem() {
		if (!parentContainer) {
			return;
		}

		const item = containerOfType(
			payloadTypes.enum.knowledge,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		item.relation = [
			{ object: container.guid, position: 0, predicate: predicates.enum['is-part-of'] },
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
	{#if editable && $ability.can('update', container)}
		<!-- svelte-ignore binding_property_non_reactive -->
		<svelte:element
			this={heading}
			bind:textContent={container.payload.title}
			class="details-heading"
			contenteditable="plaintext-only"
			role="textbox"
			tabindex="0"
			onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
		></svelte:element>
	{:else}
		<svelte:element this={heading} class="details-heading" contenteditable="false">
			{container.payload.title}
		</svelte:element>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerModeDropdown bind:container bind:relatedContainers />
			</li>
			{#if $mayCreateContainer(payloadTypes.enum.knowledge, container.managed_by)}
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
				<ContainerSettingsDropdown bind:container bind:relatedContainers bind:parentContainer />
			</li>
		</ul>
	{/if}
</header>

{#await knowledgeRequest then items}
	{#if container.payload.listType === 'list'}
		<List
			{addItem}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.knowledge, container.managed_by) &&
				editable}
		>
			{#snippet itemSnippet(item)}
				<KnowledgeCard container={item} />
			{/snippet}
		</List>
	{:else if container.payload.listType === 'wall'}
		<Wall
			{addItem}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.knowledge, container.managed_by) &&
				editable}
		>
			{#snippet itemSnippet(item)}
				<KnowledgeCard container={item} />
			{/snippet}
		</Wall>
	{:else if container.payload.listType === 'accordion'}
		<Accordion
			{addItem}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.knowledge, container.managed_by) &&
				editable}
		>
			{#snippet itemSnippet(item)}
				<KnowledgeCard container={item} />
			{/snippet}
		</Accordion>
	{:else}
		<Carousel
			{addItem}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.knowledge, container.managed_by) &&
				editable}
		>
			{#snippet itemSnippet(item)}
				<KnowledgeCard container={item} />
			{/snippet}
		</Carousel>
	{/if}
{/await}
