<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		containerOfType,
		isContainerWithPayloadType,
		type MeasureCollectionPayload,
		type MeasurePayload,
		type NewContainer,
		payloadTypes,
		predicates,
		titleForMeasureCollection
	} from '$lib/models';
	import { hasPart } from '$lib/relations';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: Container<MeasureCollectionPayload>;
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
		isContainerWithPayloadType(payloadTypes.enum.measure, parentContainer)
			? hasPart(
					parentContainer,
					relatedContainers.filter(
						(c) =>
							isContainerWithPayloadType(payloadTypes.enum.measure, c) ||
							isContainerWithPayloadType(payloadTypes.enum.simple_measure, c)
					)
				)
			: relatedContainers.filter(
					(c) =>
						isContainerWithPayloadType(payloadTypes.enum.measure, c) ||
						isContainerWithPayloadType(payloadTypes.enum.simple_measure, c)
				)
	);

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function addItem() {
		const item = containerOfType(
			payloadTypes.enum.measure,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer<MeasurePayload>;

		if (isContainerWithPayloadType(payloadTypes.enum.measure, parentContainer)) {
			if (createFeatureDecisions(page.data.features).useCustomCategories()) {
				item.payload.category = parentContainer.payload.category;
			} else {
				item.payload.audience = parentContainer.payload.audience;
				item.payload.policyFieldBNK = parentContainer.payload.policyFieldBNK;
				item.payload.sdg = parentContainer.payload.sdg;
				item.payload.topic = parentContainer.payload.topic;
			}
			item.payload.hierarchyLevel = parentContainer.payload.hierarchyLevel + 1;
			item.payload.status = parentContainer.payload.status;
			item.payload.visibility = parentContainer.payload.visibility;
			item.relation = [
				{
					object: parentContainer.guid,
					position: parentContainer.relation.filter(
						({ predicate }) => predicate == predicates.enum['is-part-of']
					).length,
					predicate: predicates.enum['is-part-of']
				},
				{
					object: parentContainer.guid,
					position: parentContainer.relation.filter(
						({ predicate }) => predicate == predicates.enum['is-part-of-measure']
					).length,
					predicate: predicates.enum['is-part-of-measure']
				}
			];
		}

		$newContainer = item;

		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">
		{#if isContainerWithPayloadType(payloadTypes.enum.measure, parentContainer)}
			{titleForMeasureCollection(
				items as Container<MeasurePayload>[],
				parentContainer.payload.hierarchyLevel + 1
			)}
		{:else}
			{$_('measures')}
		{/if}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.goal, container.managed_by)}
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

<Carousel
	{addItem}
	{items}
	mayAddItem={$mayCreateContainer(payloadTypes.enum.measure, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<Card container={item} />
	{/snippet}
</Carousel>
