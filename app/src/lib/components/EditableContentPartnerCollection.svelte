<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import ContentPartnerCard from '$lib/components/ContentPartnerCard.svelte';
	import Wall from '$lib/components/Wall.svelte';
	import Accordion from '$lib/components/Accordion.svelte';
	import List from '$lib/components/List.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import ContainerModeDropdown from '$lib/components/ContainerModeDropdown.svelte';
	import {
		type AnyPayload,
		type Container,
		containerOfType,
		type ContentPartnerCollectionPayload,
		type ContentPartnerPayload,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { ability, mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: Container<ContentPartnerCollectionPayload>;
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

	let contentPartnerRequest = $derived(
		fetchRelatedContainers(container.guid, {
			payloadType: [payloadTypes.enum.content_partner],
			relationType: [predicates.enum['is-part-of']]
		})
	) as Promise<Container<ContentPartnerPayload>[]>;

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function addItem() {
		if (!parentContainer) {
			return;
		}

		const item = containerOfType(
			payloadTypes.enum.content_partner,
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
				<ContainerModeDropdown bind:container />
			</li>
			{#if $mayCreateContainer(payloadTypes.enum.content_partner, container.managed_by)}
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

{#await contentPartnerRequest then items}
	{#if container.payload.listType === 'list'}
		<List
			{addItem}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.content_partner, container.managed_by) &&
				editable}
		>
			{#snippet itemSnippet(item)}
				<ContentPartnerCard container={item} />
			{/snippet}
		</List>
	{:else if container.payload.listType === 'wall'}
		<Wall
			{addItem}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.content_partner, container.managed_by) &&
				editable}
		>
			{#snippet itemSnippet(item)}
				<ContentPartnerCard container={item} />
			{/snippet}
		</Wall>
	{:else if container.payload.listType === 'accordion'}
		<Accordion
			{addItem}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.content_partner, container.managed_by) &&
				editable}
		>
			{#snippet itemSnippet(item)}
				<ContentPartnerCard container={item} />
			{/snippet}
		</Accordion>
	{:else}
		<Carousel
			{addItem}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.content_partner, container.managed_by) &&
				editable}
		>
			{#snippet itemSnippet(item)}
				<ContentPartnerCard container={item} />
			{/snippet}
		</Carousel>
	{/if}
{/await}
