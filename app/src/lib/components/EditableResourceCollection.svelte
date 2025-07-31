<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		containerOfType,
		isMeasureContainer,
		isPartOf,
		isPartOfMeasure,
		type NewContainer,
		payloadTypes,
		predicates,
		type ResourceCollectionContainer
	} from '$lib/models';
	import { sectionOf } from '$lib/relations';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: ResourceCollectionContainer;
		editable?: boolean;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		editable = false,
		relatedContainers = $bindable()
	}: Props = $props();

	let parentContainer = $derived(
		sectionOf(container, relatedContainers.filter(isMeasureContainer))
	);

	let items = $derived(
		parentContainer
			? relatedContainers
					.filter(({ payload }) => payload.type == payloadTypes.enum.goal)
					.filter((rc) => isPartOfMeasure(parentContainer)(rc) || isPartOf(parentContainer)(rc))
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
			payloadTypes.enum.resource,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		item.relation = [
			{ object: parentContainer.guid, position: 0, predicate: predicates.enum['is-part-of'] },
			{
				object: parentContainer.guid,
				position: 0,
				predicate: predicates.enum['is-part-of-measure']
			}
		];

		$newContainer = item;

		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	<h2 class="details-heading">{$_('resources')}</h2>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			<li>
				<ContainerSettingsDropdown bind:container bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

<Carousel
	{addItem}
	{items}
	mayAddItem={$mayCreateContainer(payloadTypes.enum.resource, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<Card
			container={item}
			relatedContainers={relatedContainers.filter(({ relation }) =>
				relation.some(({ object, subject }) => [object, subject].includes(item.guid))
			)}
		/>
	{/snippet}
</Carousel>
