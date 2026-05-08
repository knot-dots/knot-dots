<script lang="ts">
	import { IsInViewport, resource } from 'runed';
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import tooltip from '$lib/attachments/tooltip';
	import Carousel from '$lib/components/Carousel.svelte';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
	import NewIndicatorCard from '$lib/components/NewIndicatorCard.svelte';
	import fetchContainers from '$lib/client/fetchContainers';
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

	const indicatorDataResource = resource(
		[() => parentContainer, () => inViewportOnce],
		async (_, __, { signal }) => {
			if (!inViewportOnce) return [] as AnyContainer[];
			return fetchContainers(
				{
					payloadType: [
						payloadTypes.enum.indicator_template,
						payloadTypes.enum.actual_data,
						payloadTypes.enum.effect,
						payloadTypes.enum.objective
					],
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

	let allContainers = $state<AnyContainer[]>([]);
	$effect(() => {
		if (indicatorDataResource.current !== undefined) {
			allContainers = indicatorDataResource.current;
		}
	});

	let actualDataContainers = $derived(allContainers.filter(isActualDataContainer));

	let effectContainers = $derived(allContainers.filter(isEffectContainer));

	let objectiveContainers = $derived(allContainers.filter(isObjectiveContainer));

	let items = $derived(
		allContainers
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

<header bind:this={header}>
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
				<ContainerSettingsDropdown
					bind:container
					bind:parentContainer
					bind:relatedContainers={allContainers}
				/>
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
				...allContainers.filter(isGoalContainer),
				...allContainers.filter(isMeasureContainer)
			]}
		/>
	{/snippet}
</Carousel>
