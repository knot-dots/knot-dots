<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import fetchContainers from '$lib/client/fetchContainers';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import {
		type AnyContainer,
		titleForMeasureCollection,
		containerOfType,
		isMeasureContainer,
		type MeasureCollectionContainer,
		type MeasureContainer,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: MeasureCollectionContainer;
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

	const measuresResource = resource(
		[() => parentContainer, () => inViewportOnce],
		async ([parent], _, { signal }) => {
			if (!parent || !inViewportOnce) return [] as AnyContainer[];
			if (isMeasureContainer(parent)) {
				const all = await fetchRelatedContainers(
					parent.guid,
					{ payloadType: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure] },
					'alpha',
					{ signal }
				);
				return all.filter(
					(item) =>
						item.guid !== parent.guid &&
						item.relation.some(
							(r) => r.predicate === predicates.enum['is-part-of'] && r.object === parent.guid
						)
				);
			}
			return fetchContainers(
				{
					payloadType: [payloadTypes.enum.measure, payloadTypes.enum.simple_measure],
					organization: [container.organization],
					...(container.organizational_unit
						? { organizationalUnit: [container.organizational_unit] }
						: {})
				},
				'alpha',
				{ signal }
			);
		},
		{ lazy: true }
	);

	let items = $state<AnyContainer[]>([]);
	$effect(() => {
		if (measuresResource.current !== undefined) {
			items = measuresResource.current;
		}
	});

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
			item.payload.category = parentContainer.payload.category;
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

<header bind:this={header}>
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
				<ContainerSettingsDropdown
					bind:container
					bind:parentContainer
					bind:relatedContainers={items}
				/>
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
