<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		titleForMeasureCollection,
		containerOfType,
		isMeasureContainer,
		isSimpleMeasureContainer,
		type MeasureCollectionContainer,
		type MeasureContainer,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { hasPart } from '$lib/relations';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: MeasureCollectionContainer;
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

	let items = $derived(
		hasPart(
			parentContainer,
			relatedContainers.filter((c) => isMeasureContainer(c) || isSimpleMeasureContainer(c))
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
		) as Omit<NewContainer, 'payload'> & Pick<MeasureContainer, 'payload'>;

		if (isMeasureContainer(parentContainer)) {
			item.payload.hierarchyLevel = parentContainer.payload.hierarchyLevel + 1;
		}

		if (isMeasureContainer(parentContainer)) {
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
		{#if isMeasureContainer(parentContainer)}
			{titleForMeasureCollection(
				items as MeasureContainer[],
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
