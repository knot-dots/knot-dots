<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import ResourceDataCard from '$lib/components/ResourceDataCard.svelte';
	import {
		type AnyContainer,
		containerOfType,
		isResourceDataContainer,
		isPartOf,
		type NewContainer,
		type ResourceDataCollectionContainer,
		payloadTypes,
		predicates,
		isResourceV2Container,
		type ResourceV2Container
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';
	import fetchContainers from '$lib/client/fetchContainers';

	interface Props {
		container: ResourceDataCollectionContainer;
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

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	// Filter resource data items that match this collection's resourceDataType and are part of the parent
	let items = $derived(
		parentContainer
			? relatedContainers
					.filter(isResourceDataContainer)
					.filter((item) => item.payload.resourceDataType === container.payload.resourceDataType)
					.filter(isPartOf(parentContainer))
			: []
	);

	let resourceContainers: ResourceV2Container[] = $state([]);

	onMount(async () => {
		const containers = await fetchContainers({ payloadType: ['resource_v2'] }, 'alpha');
		resourceContainers = containers.filter(isResourceV2Container);
	});

	function addItem() {
		if (!parentContainer || !('guid' in parentContainer)) {
			return;
		}

		// Create new resource_data container
		const item = containerOfType(
			payloadTypes.enum.resource_data,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		// Set the resourceDataType from the collection
		(item.payload as { resourceDataType?: string }).resourceDataType =
			container.payload.resourceDataType;

		// Set relations to the parent container
		item.relation = [
			{ object: parentContainer.guid, position: 0, predicate: predicates.enum['is-part-of'] }
		];

		$newContainer = item;

		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">
		{$_(container.payload.resourceDataType)}
	</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.resource_data, container.managed_by)}
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
	mayAddItem={$mayCreateContainer(payloadTypes.enum.resource_data, container.managed_by) &&
		editable}
>
	{#snippet itemSnippet(item)}
		<ResourceDataCard
			container={item}
			resourceContainer={resourceContainers.find((rc) => rc.guid === item.payload.resource)}
		/>
	{/snippet}
</Carousel>

<style>
	header {
		align-items: center;
		display: flex;
		gap: 1rem;
		justify-content: space-between;
		margin-block-end: 1rem;
	}
</style>
