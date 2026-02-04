<script lang="ts">
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import Cash from '~icons/flowbite/cash-outline';
	import Briefcase from '~icons/flowbite/briefcase-solid';
	import File from '~icons/flowbite/file-solid';
	import Quote from '~icons/flowbite/quote-solid';
	import BasicData from '~icons/knotdots/basic-data';
	import Chapter from '~icons/knotdots/chapter';
	import ChartBar from '~icons/knotdots/chart-bar';
	import ChartLine from '~icons/knotdots/chart-line';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Clipboard from '~icons/knotdots/clipboard-simple';
	import ClipboardCheck from '~icons/knotdots/clipboard-check';
	import Goal from '~icons/knotdots/goal';
	import Grid from '~icons/knotdots/grid';
	import Image from '~icons/knotdots/placeholder-image';
	import Map from '~icons/knotdots/map';
	import Progress from '~icons/knotdots/progress';
	import Plus from '~icons/knotdots/plus';
	import Star from '~icons/knotdots/star';
	import Program from '~icons/knotdots/program';
	import Text from '~icons/knotdots/text';
	import TwoCol from '~icons/knotdots/two-column';
	import Link from '~icons/knotdots/link';
	import Collection from '~icons/knotdots/collection';
	import ExclamationCircle from '~icons/knotdots/exclamation-circle';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		boards,
		isAdministrativeAreaBasicDataContainer,
		isContainerWithProgress,
		isContentPartnerCollectionContainer,
		isEffectCollectionContainer,
		isFileCollectionContainer,
		isGoalCollectionContainer,
		isGoalContainer,
		isIndicatorCollectionContainer,
		isMapContainer,
		isMeasureCollectionContainer,
		isMeasureContainer,
		isObjectiveCollectionContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isProgramCollectionContainer,
		isProgressContainer,
		isReportContainer,
		isResourceCollectionContainer,
		isResourceDataCollectionContainer,
		isResourceV2Container,
		isSimpleMeasureContainer,
		isTaskCollectionContainer,
		isTaskContainer,
		payloadTypes,
		predicates,
		resourceDataTypes
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import { mayCreateContainer } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	interface Props {
		compact?: boolean;
		handleAddSection: (event: Event) => void;
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		compact = false,
		handleAddSection,
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let menu = createMenu({ label: $_('add_section') });

	const [popperRef, popperContent] = createPopperActions({
		placement: 'bottom-start',
		strategy: 'absolute'
	});

	const extraOpts = {
		modifiers: [{ name: 'offset', options: { offset: compact ? [-4, 8] : [0, 4] } }]
	};

	let mayAddTaskCollection = $derived(
		!hasSection(parentContainer, relatedContainers).some(isTaskCollectionContainer) &&
			(isGoalContainer(parentContainer) ||
				isMeasureContainer(parentContainer) ||
				isTaskContainer(parentContainer))
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
		(isOrganizationContainer(parentContainer) ||
			isOrganizationalUnitContainer(parentContainer) ||
			(isMeasureContainer(parentContainer) &&
				createFeatureDecisions(page.data.features).useSubMeasures())) &&
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
		createFeatureDecisions(page.data.features).useTeaserCollection() &&
			(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer))
	);

	let mayAddContentPartnerCollection = $derived(
		createFeatureDecisions(page.data.features).useContentPartner() &&
			(isOrganizationContainer(parentContainer) ||
				isOrganizationalUnitContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isContentPartnerCollectionContainer)
	);

	let mayAddHistoricalExpensesCollection = $derived(
		createFeatureDecisions(page.data.features).useRessourcenplanung() &&
			isMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) =>
					isResourceDataCollectionContainer(c) &&
					c.payload.resourceDataType ===
						resourceDataTypes.enum['resource_data_type.historical_expenses']
			)
	);

	let mayAddExpectedExpensesCollection = $derived(
		createFeatureDecisions(page.data.features).useRessourcenplanung() &&
			isMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) =>
					isResourceDataCollectionContainer(c) &&
					c.payload.resourceDataType ===
						resourceDataTypes.enum['resource_data_type.expected_expenses']
			)
	);

	let mayAddHistoricalIncomeCollection = $derived(
		createFeatureDecisions(page.data.features).useRessourcenplanung() &&
			isResourceV2Container(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) =>
					isResourceDataCollectionContainer(c) &&
					c.payload.resourceDataType ===
						resourceDataTypes.enum['resource_data_type.historical_income']
			)
	);

	let mayAddExpectedIncomeCollection = $derived(
		createFeatureDecisions(page.data.features).useRessourcenplanung() &&
			isResourceV2Container(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) =>
					isResourceDataCollectionContainer(c) &&
					c.payload.resourceDataType ===
						resourceDataTypes.enum['resource_data_type.expected_income']
			)
	);

	let mayAddTeaserSection = $derived(createFeatureDecisions(page.data.features).useTeaser());

	let mayAddInfoBox = $derived(createFeatureDecisions(page.data.features).useInfoBox());

	let mayAddQuote = $derived(createFeatureDecisions(page.data.features).useQuote());

	let mayAddTwoColumnSection = $derived(createFeatureDecisions(page.data.features).useTwoColumn());

	let mayAddProgress = $derived(
		isContainerWithProgress(parentContainer) &&
			!isSimpleMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isProgressContainer)
	);

	let mayAddChapter = $derived(
		createFeatureDecisions(page.data.features).useChapter() && isReportContainer(parentContainer)
	);

	let mayAddCustomCollection = $derived(
		createFeatureDecisions(page.data.features).useCustomCollection() &&
			isReportContainer(parentContainer)
	);

	let mayAddImage = $derived(createFeatureDecisions(page.data.features).useImage());

	let options = $derived(
		[
			{ icon: Text, label: $_('text'), value: payloadTypes.enum.text },
			...(mayAddCustomCollection
				? [
						{
							icon: Grid,
							label: $_('custom_collection'),
							value: payloadTypes.enum.custom_collection
						}
					]
				: []),
			...(mayAddChapter
				? [
						{
							icon: Chapter,
							label: $_('chapter'),
							value: payloadTypes.enum.chapter
						}
					]
				: []),
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
			...(mayAddHistoricalExpensesCollection
				? [
						{
							icon: Cash,
							label: $_('resource_data_type.historical_expenses'),
							value: payloadTypes.enum.resource_data_collection,
							resourceDataType: 'resource_data_type.historical_expenses'
						}
					]
				: []),
			...(mayAddExpectedExpensesCollection
				? [
						{
							icon: Cash,
							label: $_('resource_data_type.expected_expenses'),
							value: payloadTypes.enum.resource_data_collection,
							resourceDataType: 'resource_data_type.expected_expenses'
						}
					]
				: []),
			...(mayAddHistoricalIncomeCollection
				? [
						{
							icon: Cash,
							label: $_('resource_data_type.historical_income'),
							value: payloadTypes.enum.resource_data_collection,
							resourceDataType: 'resource_data_type.historical_income'
						}
					]
				: []),
			...(mayAddExpectedIncomeCollection
				? [
						{
							icon: Cash,
							label: $_('resource_data_type.expected_income'),
							value: payloadTypes.enum.resource_data_collection,
							resourceDataType: 'resource_data_type.expected_income'
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
			...(mayAddProgress
				? [
						{
							icon: Progress,
							label: $_('progress'),
							value: payloadTypes.enum.progress
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
			...(mayAddImage ? [{ icon: Image, label: $_('image'), value: payloadTypes.enum.image }] : []),
			...(mayAddTeaserCollection
				? [
						{
							icon: Collection,
							label: $_('teasers'),
							value: payloadTypes.enum.teaser_collection
						}
					]
				: []),
			...(mayAddTwoColumnSection
				? [{ icon: TwoCol, label: $_('col_content'), value: payloadTypes.enum.col_content }]
				: []),
			...(mayAddTeaserSection
				? [{ icon: Link, label: $_('teaser'), value: payloadTypes.enum.teaser }]
				: []),
			...(mayAddTeaserSection
				? [{ icon: Star, label: $_('teaser_highlight'), value: payloadTypes.enum.teaser_highlight }]
				: []),
			...(mayAddInfoBox
				? [{ icon: ExclamationCircle, label: $_('info_box'), value: payloadTypes.enum.info_box }]
				: []),
			...(mayAddQuote ? [{ icon: Quote, label: $_('quote'), value: payloadTypes.enum.quote }] : []),
			...(mayAddContentPartnerCollection
				? [
						{
							icon: Briefcase,
							label: $_('partners'),
							value: payloadTypes.enum.content_partner_collection
						}
					]
				: [])
		].toSorted((a, b) => a.label.localeCompare(b.label))
	);
</script>

<div class="dropdown" class:dropdown--compact={compact} use:popperRef>
	<button
		class="dropdown-button"
		onchange={handleAddSection}
		type="button"
		{@attach tooltip($_('add_section'))}
		use:menu.button
	>
		<Plus />
		<span class:is-visually-hidden={compact}>{$_('add_section')}</span>
	</button>

	{#if $menu.expanded}
		<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
			<p class="dropdown-panel-title">{$_('add_section')}</p>
			<ul class="menu">
				{#each options as option (`${option.value}-${option.resourceDataType ?? 'none'}`)}
					{#if $mayCreateContainer(option.value, parentContainer.managed_by)}
						<li class="menu-item">
							<button
								use:menu.item={{
									value: { type: option.value, resourceDataType: option.resourceDataType }
								}}
								type="button"
							>
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
		--dropdown-button-border-radius: 16px;
		--dropdown-button-padding: 1rem;

		color: var(--color-gray-700);
		width: fit-content;
	}

	.dropdown.dropdown--compact {
		--dropdown-button-border-radius: 4px;
		--dropdown-button-padding: 0.25rem;
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
