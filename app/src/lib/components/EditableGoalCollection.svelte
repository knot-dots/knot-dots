<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyContainer,
		containerOfType,
		type GoalCollectionContainer,
		isPartOf,
		isPartOfMeasure,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: GoalCollectionContainer;
		editable?: boolean;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
		subsection?: boolean;
	}

	let {
		container = $bindable(),
		editable = false,
		parentContainer = $bindable(),
		relatedContainers = $bindable(),
		subsection = false
	}: Props = $props();

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
			payloadTypes.enum.goal,
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
	{#if subsection}
		<h3 class="details-heading">{$_('goals')}</h3>
	{:else}
		<h2 class="details-heading">{$_('goals')}</h2>
	{/if}

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.goal, container.managed_by)}
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
				<ContainerSettingsDropdown bind:container bind:parentContainer bind:relatedContainers />
			</li>
		</ul>
	{/if}
</header>

<Carousel
	{addItem}
	{items}
	mayAddItem={$mayCreateContainer(payloadTypes.enum.goal, container.managed_by) && editable}
>
	{#snippet itemSnippet(item)}
		<Card
			container={item}
			relatedContainers={relatedContainers.filter(
				({ payload, relation }) =>
					payload.type === payloadTypes.enum.indicator ||
					relation.some(({ object, subject }) => [object, subject].includes(item.guid))
			)}
		/>
	{/snippet}
</Carousel>
