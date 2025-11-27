<script lang="ts">
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import Cash from '~icons/flowbite/cash-outline';
	import File from '~icons/flowbite/file-solid';
	import BasicData from '~icons/knotdots/basic-data';
	import ChartBar from '~icons/knotdots/chart-bar';
	import ChartLine from '~icons/knotdots/chart-line';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Clipboard from '~icons/knotdots/clipboard-simple';
	import ClipboardCheck from '~icons/knotdots/clipboard-check';
	import Goal from '~icons/knotdots/goal';
	import Map from '~icons/knotdots/map';
	import Plus from '~icons/knotdots/plus';
	import Star from '~icons/knotdots/star';
	import Program from '~icons/knotdots/program';
	import Text from '~icons/knotdots/text';
	import Teaser from '~icons/knotdots/basic-data';
	import Tiles from '~icons/knotdots/tiles';
	import Link from '~icons/knotdots/link';
	import ExclamationCircle from '~icons/knotdots/exclamation-circle';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		boards,
		isAdministrativeAreaBasicDataContainer,
		isEffectCollectionContainer,
		isFileCollectionContainer,
		isGoalCollectionContainer,
		isGoalContainer,
		isIndicatorCollectionContainer,
		isMapContainer,
		isTeaserContainer,
		isMeasureCollectionContainer,
		isMeasureContainer,
		isObjectiveCollectionContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isProgramCollectionContainer,
		isResourceCollectionContainer,
		isSimpleMeasureContainer,
		isTaskCollectionContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import { mayCreateContainer } from '$lib/stores';

	interface Props {
		handleAddSection: (event: Event) => void;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		handleAddSection,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let menu = createMenu({ label: $_('add_section') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = { modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] };

	let mayAddTaskCollection = $derived(
		!hasSection(parentContainer, relatedContainers).some(isTaskCollectionContainer)
	);

	let mayAddObjectiveCollection = $derived(
		isGoalContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isObjectiveCollectionContainer) &&
			!parentContainer.relation.some(
				({ predicate }) => predicate == predicates.enum['is-part-of-measure']
			)
	);

	let mayAddEffectCollection = $derived(
		isGoalContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isEffectCollectionContainer) &&
			parentContainer.relation.some(
				({ predicate }) => predicate == predicates.enum['is-part-of-measure']
			)
	);

	let mayAddGoalCollection = $derived(
		(isMeasureContainer(parentContainer) || isSimpleMeasureContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isGoalCollectionContainer)
	);

	let mayAddResourceCollection = $derived(
		(isMeasureContainer(parentContainer) || isSimpleMeasureContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isResourceCollectionContainer)
	);

	let mayAddFileCollection = $derived(
		!hasSection(parentContainer, relatedContainers).some(isFileCollectionContainer)
	);

	let mayAddIndicatorCollection = $derived(
		(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer)) &&
			parentContainer.payload.boards.includes(boards.enum['board.indicators']) &&
			!hasSection(parentContainer, relatedContainers).some(isIndicatorCollectionContainer)
	);

	let mayAddMeasureCollection = $derived(
		(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isMeasureCollectionContainer)
	);

	let mayAddProgramCollection = $derived(
		(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isProgramCollectionContainer)
	);

	let mayAddAdministrativeAreaBasicData = $derived(
		createFeatureDecisions(page.data.features).useAdministrativeArea() &&
			isOrganizationalUnitContainer(parentContainer) &&
			parentContainer.payload.officialRegionalCode &&
			!hasSection(parentContainer, relatedContainers).some(isAdministrativeAreaBasicDataContainer)
	);

	let mayAddMap = $derived(
		createFeatureDecisions(page.data.features).useAdministrativeArea() &&
			isOrganizationalUnitContainer(parentContainer) &&
			parentContainer.payload.geometry &&
			!hasSection(parentContainer, relatedContainers).some(isMapContainer)
	);

    let mayAddTeaserCollection = $derived(
    	(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer))
    );

    let mayAddTeaserSection = $derived(
    	(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer))
    );

	let options = $derived(
		[
			{ icon: Text, label: $_('text'), value: payloadTypes.enum.text },
			...(mayAddFileCollection
				? [
						{
							icon: File,
							label: $_('files'),
							value: payloadTypes.enum.file_collection
						}
					]
				: []),
			...(mayAddTaskCollection
				? [
						{
							icon: ClipboardCheck,
							label: $_('tasks'),
							value: payloadTypes.enum.task_collection
						}
					]
				: []),
			...(mayAddEffectCollection
				? [
						{
							icon: ChartBar,
							label: $_('effect'),
							value: payloadTypes.enum.effect_collection
						}
					]
				: []),
			...(mayAddObjectiveCollection
				? [
						{
							icon: ChartLine,
							label: $_('objectives'),
							value: payloadTypes.enum.objective_collection
						}
					]
				: []),
			...(mayAddGoalCollection
				? [
						{
							icon: Goal,
							label: $_('goals'),
							value: payloadTypes.enum.goal_collection
						}
					]
				: []),
			...(mayAddResourceCollection
				? [
						{
							icon: Cash,
							label: $_('resources'),
							value: payloadTypes.enum.resource_collection
						}
					]
				: []),
			...(mayAddIndicatorCollection
				? [
						{
							icon: ChartMixed,
							label: $_('indicators'),
							value: payloadTypes.enum.indicator_collection
						}
					]
				: []),
			...(mayAddMeasureCollection
				? [
						{
							icon: Clipboard,
							label: $_('measures'),
							value: payloadTypes.enum.measure_collection
						}
					]
				: []),
			...(mayAddProgramCollection
				? [
						{
							icon: Program,
							label: $_('programs'),
							value: payloadTypes.enum.program_collection
						}
					]
				: []),
			...(mayAddAdministrativeAreaBasicData
				? [
						{
							icon: BasicData,
							label: $_('administrative_area.basic_data'),
							value: payloadTypes.enum.administrative_area_basic_data
						}
					]
				: []),
			...(mayAddMap
				? [{ icon: Map, label: $_('administrative_area.boundary'), value: payloadTypes.enum.map }]
				: []),
			...(mayAddTeaserCollection
			    ? [{ icon: Tiles, label: $_('teasers'), value: payloadTypes.enum.teaser_collection }]
			    : []),
			...(mayAddTeaserSection
			    ? [{ icon: Link, label: $_('teaser'), value: payloadTypes.enum.teaser }]
			    : []),
			...(mayAddTeaserSection
			    ? [{ icon: Star, label: $_('teaser_highlight'), value: payloadTypes.enum.teaser_highlight }]
			    : []),
			...(mayAddTeaserSection
			    ? [{ icon: ExclamationCircle, label: $_('info_box'), value: payloadTypes.enum.info_box }]
			    : [])
		].toSorted((a, b) => a.label.localeCompare(b.label))
	);
</script>

<div class="dropdown" use:popperRef>
	<button class="dropdown-button" onchange={handleAddSection} type="button" use:menu.button>
		<Plus />
		<span class="is-visually-hidden">{$_('add_section')}</span>
	</button>

	{#if $menu.expanded}
		<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
			<p class="dropdown-panel-title">{$_('add_section')}</p>
			<ul class="menu">
				{#each options as option}
					{#if $mayCreateContainer(option.value, parentContainer.managed_by)}
						<li class="menu-item">
							<button use:menu.item={{ value: option.value }}>
								<option.icon />
								{option.label}
							</button>
						</li>
					{/if}
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-default-background: white;
		--dropdown-button-expanded-background: var(--color-primary-900);
		--dropdown-button-hover-background: var(--color-primary-800);
		--dropdown-button-border-radius: 8px;
		--dropdown-button-icon-default-color: var(--color-primary-700);
		--dropdown-button-icon-expanded-color: white;

		align-items: center;
		background-color: white;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-gray-700);
		display: flex;
		gap: 0.375rem;
		margin: 0 auto;
		padding: 0.25rem;
		width: fit-content;
	}

	.dropdown-button:hover {
		--dropdown-button-icon-default-color: white;
	}

	.dropdown-panel {
		border-radius: 16px;
	}

	.dropdown-panel-title {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.5rem 0.75rem;
		white-space: nowrap;
	}

	.menu-item > button {
		color: var(--color-gray-700);
	}

	.menu-item > button > :global(svg) {
		color: var(--color-gray-500);
	}
</style>
