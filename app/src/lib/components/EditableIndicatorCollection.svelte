<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import NewIndicatorCard from '$lib/components/NewIndicatorCard.svelte';
	import {
		type AnyContainer,
		containerOfType,
		type IndicatorCollectionContainer,
		isActualDataContainer,
		isEffectContainer,
		isGoalContainer,
		isIndicatorTemplateContainer,
		isMeasureContainer,
		isObjectiveContainer,
		type NewContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer, newContainer } from '$lib/stores';

	interface Props {
		container: IndicatorCollectionContainer;
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

	let actualDataContainers = $derived(relatedContainers.filter(isActualDataContainer));

	let effectContainers = $derived(relatedContainers.filter(isEffectContainer));

	let objectiveContainers = $derived(relatedContainers.filter(isObjectiveContainer));

	let items = $derived(
		relatedContainers
			.filter(isIndicatorTemplateContainer)
			.filter((item) =>
				[
					actualDataContainers.some(({ payload }) => payload.indicator === item.guid),
					effectContainers.some(({ relation }) =>
						relation.some(
							({ object, predicate }) =>
								object === item.guid && predicate === predicates.enum['is-measured-by']
						)
					),
					objectiveContainers.some(({ relation }) =>
						relation.some(
							({ object, predicate }) =>
								object === item.guid && predicate === predicates.enum['is-objective-for']
						)
					)
				].some(Boolean)
			)
	);

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function addItem() {
		$newContainer = containerOfType(
			payloadTypes.enum.indicator_template,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as NewContainer;

		createContainerDialog.getElement().showModal();
	}
</script>

<header>
	<svelte:element this={heading} class="details-heading">{$_('indicators')}</svelte:element>

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
	mayAddItem={$mayCreateContainer(payloadTypes.enum.indicator_template, container.managed_by) &&
		editable}
>
	{#snippet itemSnippet(item)}
		<NewIndicatorCard
			container={item}
			relatedContainers={[
				...actualDataContainers.filter(({ payload }) => payload.indicator === item.guid),
				...effectContainers.filter(({ relation }) =>
					relation.some(
						({ object, predicate }) =>
							object === item.guid && predicate === predicates.enum['is-measured-by']
					)
				),
				...objectiveContainers.filter(({ relation }) =>
					relation.some(
						({ object, predicate }) =>
							object === item.guid && predicate === predicates.enum['is-objective-for']
					)
				),
				...relatedContainers.filter(isGoalContainer),
				...relatedContainers.filter(isMeasureContainer)
			]}
		/>
	{/snippet}
</Carousel>
