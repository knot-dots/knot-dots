<script lang="ts">
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import Cash from '~icons/flowbite/cash-outline';
	import File from '~icons/flowbite/file-solid';
	import FileChartBar from '~icons/flowbite/file-chart-bar-outline';
	import BasicData from '~icons/knotdots/basic-data';
	import Chapter from '~icons/knotdots/chapter';
	import ChartBar from '~icons/knotdots/chart-bar';
	import ChartLine from '~icons/knotdots/chart-line';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Clipboard from '~icons/knotdots/clipboard-simple';
	import ClipboardCheck from '~icons/knotdots/clipboard-check';
	import Goal from '~icons/knotdots/goal';
	import Grid from '~icons/knotdots/grid';
	import Map from '~icons/knotdots/map';
	import Progress from '~icons/knotdots/progress';
	import Plus from '~icons/knotdots/plus';
	import Program from '~icons/knotdots/program';
	import Text from '~icons/knotdots/text';
	import ExpenseExpected from '~icons/knotdots/expense-expected';
	import Expense from '~icons/knotdots/expense';
	import IncomeExpected from '~icons/knotdots/income-expected';
	import Income from '~icons/knotdots/income';
	import { page } from '$app/state';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyContainer,
		boards,
		isAdministrativeAreaBasicDataContainer,
		isContainerWithProgress,
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
		isResourceV2Container,
		isResourceCollectionContainer,
		isSimpleMeasureContainer,
		isTaskCollectionContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import { mayCreateContainer } from '$lib/stores';

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

	let mayAddResourceDataHistoricalExpenses = $derived(
		isMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) => c.payload.type === payloadTypes.enum.resource_data_historical_expenses
			)
	);

	let mayAddResourceDataExpectedExpenses = $derived(
		isMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) => c.payload.type === payloadTypes.enum.resource_data_expected_expenses
			)
	);

	let mayAddResourceDataHistoricalIncome = $derived(
		isMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) => c.payload.type === payloadTypes.enum.resource_data_historical_income
			)
	);

	let mayAddResourceDataExpectedIncome = $derived(
		isMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) => c.payload.type === payloadTypes.enum.resource_data_expected_income
			)
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

	let mayAddProgress = $derived(
		isContainerWithProgress(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isProgressContainer)
	);

	let mayAddChapter = $derived(
		createFeatureDecisions(page.data.features).useChapter() && isReportContainer(parentContainer)
	);

	let mayAddCustomCollection = $derived(
		createFeatureDecisions(page.data.features).useCustomCollection() &&
			isReportContainer(parentContainer)
	);

	let mayAddReport = $derived(
		createFeatureDecisions(page.data.features).useReport() &&
			(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer))
	);

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
			...(mayAddReport
				? [
						{
							icon: FileChartBar,
							label: $_('report'),
							value: payloadTypes.enum.report
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
				: [])
		].toSorted((a, b) => a.label.localeCompare(b.label))
	);

	let resourceRelatedOptions = $derived([
		...(mayAddResourceDataCollectionSection
			? [
					{
						icon: Cash,
						label: $_('resource_data'),
						value: payloadTypes.enum.resource_data_collection
					}
				]
			: []),
		...(mayAddResourceDataHistoricalExpenses
			? [
					{
						icon: Expense,
						label: $_('resource_data.historical_expenses'),
						value: payloadTypes.enum.resource_data_historical_expenses
					}
				]
			: []),
		...(mayAddResourceDataExpectedExpenses
			? [
					{
						icon: ExpenseExpected,
						label: $_('resource_data.expected_expenses'),
						value: payloadTypes.enum.resource_data_expected_expenses
					}
				]
			: []),
		...(mayAddResourceDataHistoricalIncome
			? [
					{
						icon: Income,
						label: $_('resource_data.historical_income'),
						value: payloadTypes.enum.resource_data_historical_income
					}
				]
			: []),
		...(mayAddResourceDataExpectedIncome
			? [
					{
						icon: IncomeExpected,
						label: $_('resource_data.expected_income'),
						value: payloadTypes.enum.resource_data_expected_income
					}
				]
			: [])
	]);
</script>

<div class="dropdown" class:dropdown--compact={compact} use:popperRef>
	<button class="dropdown-button" onchange={handleAddSection} type="button" use:menu.button>
		<Plus />
		<span class:is-visually-hidden={compact}>{$_('add_section')}</span>
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

				{#if resourceRelatedOptions.length > 0}
					<li class="menu-subheader">{$_('resources')}</li>
					{#each resourceRelatedOptions as option}
						{#if $mayCreateContainer(option.value, parentContainer.managed_by)}
							<li class="menu-item">
								<button use:menu.item={{ value: option.value }}>
									<option.icon />
									{option.label}
								</button>
							</li>
						{/if}
					{/each}
				{/if}
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

	.menu-subheader {
		color: var(--color-gray-500);
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.02em;
		padding: 0.5rem 0.75rem 0.25rem;
	}
</style>
