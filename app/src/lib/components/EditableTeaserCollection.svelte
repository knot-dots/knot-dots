<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import TeaserCard from '$lib/components/TeaserCard.svelte';
	import Wall from '$lib/components/Wall.svelte';
	import Accordion from '$lib/components/Accordion.svelte';
	import List from '$lib/components/List.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import ContainerModeDropdown from '$lib/components/ContainerModeDropdown.svelte';
	import {
		type AnyContainer,
		containerOfType,
		type NewContainer,
		payloadTypes,
		predicates,
		type TeaserCollectionContainer,
		type TeaserContainer
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import { ability } from '$lib/stores';

	interface Props {
		container: TeaserCollectionContainer;
		editable?: boolean;
		fetchDisabled?: boolean;
		heading: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		fetchDisabled = false,
		editable = false,
		heading,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let header = $state<HTMLElement>();

	const inViewport = new IsInViewport(() => header);

	let teasers = resource(
		[() => container.guid, () => inViewport.current],
		async ([guid], _, { signal }) => {
			if (fetchDisabled) {
				return Promise.resolve([]);
			} else {
				return (await fetchRelatedContainers(
					guid,
					{
						payloadType: [payloadTypes.enum.teaser],
						relationType: [predicates.enum['is-part-of']]
					},
					'alpha',
					{ signal }
				)) as TeaserContainer[];
			}
		},
		{ lazy: true, once: true }
	);

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function addItem() {
		if (!parentContainer) {
			return;
		}

		const item = containerOfType(
			payloadTypes.enum.teaser,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		item.relation = [
			{
				object: container.guid,
				position: container.relation.filter(
					(r) => r.predicate == predicates.enum['is-part-of'] && r.object == container.guid
				).length,
				predicate: predicates.enum['is-part-of']
			}
		];

		$newContainer = item;

		createContainerDialog.getElement().showModal();
	}

	async function handleSort(items: TeaserContainer[]) {
		container.relation = [
			...items.map(({ guid }, index) => ({
				object: container.guid,
				position: index,
				predicate: predicates.enum['is-part-of'],
				subject: guid
			})),
			...container.relation.filter(
				({ object, predicate }) =>
					predicate !== predicates.enum['is-part-of'] || object !== container.guid
			)
		];

		const url = `/container/${container.guid}/relation`;
		await fetch(url, {
			method: 'POST',
			body: JSON.stringify(container.relation),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}
</script>

<header bind:this={header}>
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
			{#if $mayCreateContainer(payloadTypes.enum.teaser, container.managed_by)}
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

{#if teasers.current}
	{@const items = container.relation
		.filter(
			({ object, predicate }) =>
				object == container.guid && predicate == predicates.enum['is-part-of']
		)
		.map(({ subject }) => teasers.current?.find(({ guid }) => guid == subject))
		.filter((c) => c !== undefined)}
	{#if container.payload.listType === 'list'}
		<List
			{addItem}
			{handleSort}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.teaser, container.managed_by) && editable}
		>
			{#snippet itemSnippet(item)}
				<TeaserCard container={item} {editable} maxSummaryLength={200} />
			{/snippet}
		</List>
	{:else if container.payload.listType === 'wall'}
		<Wall
			{addItem}
			{handleSort}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.teaser, container.managed_by) && editable}
		>
			{#snippet itemSnippet(item)}
				<TeaserCard container={item} {editable} maxSummaryLength={100} />
			{/snippet}
		</Wall>
	{:else if container.payload.listType === 'accordion'}
		<Accordion
			{addItem}
			{handleSort}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.teaser, container.managed_by) && editable}
		>
			{#snippet itemSnippet(item)}
				<TeaserCard container={item} {editable} maxSummaryLength={1000} />
			{/snippet}
		</Accordion>
	{:else}
		<Carousel
			{addItem}
			{handleSort}
			{items}
			mayAddItem={$mayCreateContainer(payloadTypes.enum.teaser, container.managed_by) && editable}
		>
			{#snippet itemSnippet(item)}
				<TeaserCard container={item} {editable} maxSummaryLength={100} />
			{/snippet}
		</Carousel>
	{/if}
{/if}
