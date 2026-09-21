<script lang="ts">
	import createCreationTemplateAvailability from '$lib/client/createCreationTemplateAvailability.svelte';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import Card from '$lib/components/Card.svelte';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import {
		type AnyPayload,
		type Container,
		containerOfType,
		type GoalCollectionPayload,
		isPartOf,
		isPartOfMeasure,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		container: Container<GoalCollectionPayload>;
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
		parentContainer
			? relatedContainers
					.filter(({ payload }) => payload.type == payloadTypes.enum.goal)
					.filter((rc) => isPartOfMeasure(parentContainer)(rc) || isPartOf(parentContainer)(rc))
			: []
	);

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	const templateAvailability = createCreationTemplateAvailability(createItem);

	function createItem() {
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

		return item;
	}

	function addItem() {
		if (!templateAvailability.has(payloadTypes.enum.goal)) return;
		$newContainer = createItem();
		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">{$_('goals')}</svelte:element>

	{#if editable}
		<ul class="inline-actions is-visible-on-hover">
			{#if $mayCreateContainer(payloadTypes.enum.goal, container.managed_by) && templateAvailability.has(payloadTypes.enum.goal)}
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
	mayAddItem={$mayCreateContainer(payloadTypes.enum.goal, container.managed_by) &&
		editable &&
		templateAvailability.has(payloadTypes.enum.goal)}
>
	{#snippet itemSnippet(item)}
		<Card
			container={item}
			ignoreBulkActionContext
			relatedContainers={relatedContainers.filter(
				({ payload, relation }) =>
					payload.type === payloadTypes.enum.indicator_template ||
					relation.some(({ object, subject }) => [object, subject].includes(item.guid))
			)}
		/>
	{/snippet}
</Carousel>
