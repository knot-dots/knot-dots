<script lang="ts">
	import type { Component } from 'svelte';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import BookOpen from '~icons/flowbite/book-open-outline';
	import Cash from '~icons/flowbite/cash-outline';
	import Code from '~icons/flowbite/file-code-solid';
	import ExclamationCircle from '~icons/flowbite/exclamation-circle-solid';
	import File from '~icons/flowbite/file-solid';
	import Star from '~icons/flowbite/star-solid';
	import BasicData from '~icons/knotdots/basic-data';
	import Chapter from '~icons/knotdots/chapter';
	import ChartBar from '~icons/knotdots/chart-bar';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Clipboard from '~icons/knotdots/clipboard-simple';
	import Close from '~icons/knotdots/close';
	import ClipboardCheck from '~icons/knotdots/clipboard-check';
	import Collection from '~icons/knotdots/collection';
	import Goal from '~icons/knotdots/goal';
	import Grid from '~icons/knotdots/grid';
	import Map from '~icons/knotdots/map';
	import Gavel from '~icons/knotdots/gavel';
	import Image from '~icons/knotdots/placeholder-image';
	import InlineHelp from '~icons/knotdots/inline-help';
	import Plus from '~icons/knotdots/plus';
	import Objective from '~icons/knotdots/objective';
	import Program from '~icons/knotdots/program';
	import Progress from '~icons/knotdots/progress';
	import Quote from '~icons/knotdots/quote';
	import Summary from '~icons/knotdots/summary';
	import Teaser from '~icons/knotdots/teaser';
	import Text from '~icons/knotdots/text';
	import TwoCol from '~icons/knotdots/two-column';
	import Video from '~icons/knotdots/video';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
		type PayloadType,
		isAdministrativeAreaBasicDataContainer,
		isContainerWithProgress,
		isContainerWithSummary,
		isDemographicDataContainer,
		isEffectCollectionContainer,
		isEventContainer,
		isFileCollectionContainer,
		isGoalCollectionContainer,
		isGoalContainer,
		isHelpContainer,
		isIndicatorCollectionContainer,
		isMapContainer,
		isMeasureCollectionContainer,
		isMeasureContainer,
		isObjectiveCollectionContainer,
		isOrganizationalUnitContainer,
		isOrganizationContainer,
		isPageContainer,
		isPostContainer,
		isProgramCollectionContainer,
		isProgramContainer,
		isProgressContainer,
		isReportContainer,
		isResourceCollectionContainer,
		isResourceDataCollectionContainer,
		isSimpleMeasureContainer,
		isSummaryContainer,
		isTaskCollectionContainer,
		isTaskContainer,
		payloadTypes,
		predicates,
		resourceDataTypes,
		textType
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import { mayCreateContainer } from '$lib/stores';
	import { type WorkspaceModuleKey, workspaceModules } from '$lib/workspaces';

	interface Props {
		compact?: boolean;
		handleAddSection: (event: Event) => void;
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
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

	let extraOpts = $derived({
		modifiers: [{ name: 'offset', options: { offset: compact ? [-4, 8] : [0, 4] } }]
	});

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
		(isMeasureContainer(parentContainer) ||
			(isGoalContainer(parentContainer) &&
				parentContainer.relation.some(
					({ predicate }) => predicate == predicates.enum['is-part-of-measure']
				))) &&
			!hasSection(parentContainer, relatedContainers).some(isEffectCollectionContainer)
	);

	let mayAddGoalCollection = $derived(
		(isMeasureContainer(parentContainer) || isSimpleMeasureContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isGoalCollectionContainer)
	);

	let mayAddResourceCollection = $derived(
		!createFeatureDecisions(page.data.features).useResourcePlanning() &&
			(isMeasureContainer(parentContainer) || isSimpleMeasureContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isResourceCollectionContainer)
	);

	let mayAddFileCollection = $derived(
		!hasSection(parentContainer, relatedContainers).some(isFileCollectionContainer)
	);

	let mayAddIndicatorCollection = $derived(
		(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer)) &&
			parentContainer.payload.visibleWorkspaces.includes('indicators') &&
			!hasSection(parentContainer, relatedContainers).some(isIndicatorCollectionContainer)
	);

	let mayAddMeasureCollection = $derived(
		(isOrganizationContainer(parentContainer) ||
			isOrganizationalUnitContainer(parentContainer) ||
			isMeasureContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isMeasureCollectionContainer)
	);

	let mayAddProgramCollection = $derived(
		(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isProgramCollectionContainer)
	);

	let mayAddAdministrativeAreaBasicData = $derived(
		(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isAdministrativeAreaBasicDataContainer)
	);

	let mayAddDemographicData = $derived(
		isOrganizationalUnitContainer(parentContainer) &&
			parentContainer.payload.geometry &&
			!hasSection(parentContainer, relatedContainers).some(isDemographicDataContainer)
	);

	let mayAddMap = $derived(
		(isOrganizationContainer(parentContainer) || isOrganizationalUnitContainer(parentContainer)) &&
			!hasSection(parentContainer, relatedContainers).some(isMapContainer)
	);

	let mayAddTeaserCollection = $derived(
		isOrganizationContainer(parentContainer) ||
			isOrganizationalUnitContainer(parentContainer) ||
			isPageContainer(parentContainer)
	);

	let mayAddActualResourceAllocationCollection = $derived(
		createFeatureDecisions(page.data.features).useResourcePlanning() &&
			isMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) =>
					isResourceDataCollectionContainer(c) &&
					c.payload.resourceDataType ===
						resourceDataTypes.enum['resource_data_type.actual_resource_allocation']
			)
	);

	let mayAddPlannedResourceAllocationCollection = $derived(
		createFeatureDecisions(page.data.features).useResourcePlanning() &&
			isMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) =>
					isResourceDataCollectionContainer(c) &&
					c.payload.resourceDataType ===
						resourceDataTypes.enum['resource_data_type.planned_resource_allocation']
			)
	);

	let mayAddBudgetCollection = $derived(
		createFeatureDecisions(page.data.features).useResourcePlanning() &&
			isGoalContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(
				(c) =>
					isResourceDataCollectionContainer(c) &&
					c.payload.resourceDataType === resourceDataTypes.enum['resource_data_type.budget']
			)
	);

	let mayAddProgress = $derived(
		isContainerWithProgress(parentContainer) &&
			!isSimpleMeasureContainer(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isProgressContainer)
	);

	let mayAddChapter = $derived(
		isReportContainer(parentContainer) || isProgramContainer(parentContainer)
	);

	let mayAddGoal = $derived(
		isProgramContainer(parentContainer) &&
			parentContainer.payload.chapterType.includes(payloadTypes.enum.goal)
	);

	let mayAddKnowledge = $derived(
		isProgramContainer(parentContainer) &&
			parentContainer.payload.chapterType.includes(payloadTypes.enum.knowledge)
	);

	let mayAddMeasure = $derived(
		isProgramContainer(parentContainer) &&
			parentContainer.payload.chapterType.includes(payloadTypes.enum.measure)
	);

	let mayAddRule = $derived(
		isProgramContainer(parentContainer) &&
			parentContainer.payload.chapterType.includes(payloadTypes.enum.rule)
	);

	let mayAddSimpleMeasure = $derived(
		isProgramContainer(parentContainer) &&
			parentContainer.payload.chapterType.includes(payloadTypes.enum.simple_measure)
	);

	let mayAddIgniteVideo = $derived(
		isHelpContainer(parentContainer) ||
			isEventContainer(parentContainer) ||
			isPostContainer(parentContainer)
	);

	let mayAddSummary = $derived(
		isContainerWithSummary(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isSummaryContainer)
	);

	type SectionGroupKey = 'text_layout' | 'media' | 'geo' | 'existing_objects' | WorkspaceModuleKey;

	interface SectionOption {
		group: SectionGroupKey;
		icon: Component<SvelteHTMLElements['svg']>;
		label: string;
		resourceDataType?: (typeof resourceDataTypes.options)[number];
		textType?: (typeof textType.options)[number];
		value: PayloadType;
	}

	let sectionGroups = $derived<{ colorClass?: string; key: SectionGroupKey; label: string }[]>([
		...workspaceModules.map(({ colorClass, key }) => ({
			colorClass,
			key,
			label: $_(`workspace.module.${key}`)
		})),
		{ key: 'text_layout', label: $_('section_group.text_layout') },
		{ key: 'media', label: $_('section_group.media') },
		{ key: 'geo', label: $_('section_group.geo') },
		{ key: 'existing_objects', label: $_('section_group.existing_objects') }
	]);

	let options: SectionOption[] = $derived([
		{ group: 'text_layout', icon: Text, label: $_('text'), value: payloadTypes.enum.text },
		{
			group: 'text_layout',
			icon: InlineHelp,
			label: $_('inline_help'),
			textType: textType.enum.inline_help,
			value: payloadTypes.enum.text
		},
		{ group: 'text_layout', icon: Code, label: $_('html'), value: payloadTypes.enum.html },
		...(mayAddSummary
			? [
					{
						group: 'text_layout' as const,
						icon: Summary,
						label: $_('summary'),
						value: payloadTypes.enum.summary
					}
				]
			: []),
		...(mayAddChapter
			? [
					{
						group: 'text_layout' as const,
						icon: Chapter,
						label: $_('chapter'),
						value: payloadTypes.enum.chapter
					}
				]
			: []),
		{
			group: 'text_layout',
			icon: TwoCol,
			label: $_('col_content'),
			value: payloadTypes.enum.col_content
		},
		{ group: 'text_layout', icon: Teaser, label: $_('teaser'), value: payloadTypes.enum.teaser },
		{
			group: 'text_layout',
			icon: Star,
			label: $_('teaser_highlight'),
			value: payloadTypes.enum.teaser_highlight
		},
		{
			group: 'text_layout',
			icon: ExclamationCircle,
			label: $_('info_box'),
			value: payloadTypes.enum.info_box
		},
		{ group: 'text_layout', icon: Quote, label: $_('quote'), value: payloadTypes.enum.quote },
		{ group: 'media', icon: Image, label: $_('image'), value: payloadTypes.enum.image },
		...(mayAddFileCollection
			? [
					{
						group: 'media' as const,
						icon: File,
						label: $_('files'),
						value: payloadTypes.enum.file_collection
					}
				]
			: []),
		...(mayAddIgniteVideo
			? [
					{
						group: 'media' as const,
						icon: Video,
						label: $_('ignite_video'),
						value: payloadTypes.enum.ignite_video
					}
				]
			: []),
		...(mayAddAdministrativeAreaBasicData
			? [
					{
						group: 'geo' as const,
						icon: BasicData,
						label: $_('administrative_area.basic_data'),
						value: payloadTypes.enum.administrative_area_basic_data
					}
				]
			: []),
		...(mayAddDemographicData
			? [
					{
						group: 'geo' as const,
						icon: BasicData,
						label: $_('demographic_data'),
						value: payloadTypes.enum.demographic_data
					}
				]
			: []),
		...(mayAddMap
			? [
					{
						group: 'geo' as const,
						icon: Map,
						label: $_('administrative_area.boundary'),
						value: payloadTypes.enum.map
					}
				]
			: []),
		{
			group: 'existing_objects',
			icon: Grid,
			label: $_('custom_collection.settings.embed_objects'),
			value: payloadTypes.enum.custom_collection
		},
		...(mayAddTeaserCollection
			? [
					{
						group: 'existing_objects' as const,
						icon: Collection,
						label: $_('teasers'),
						value: payloadTypes.enum.teaser_collection
					}
				]
			: []),
		...(mayAddProgramCollection
			? [
					{
						group: 'goal_setting' as const,
						icon: Program,
						label: $_('programs'),
						value: payloadTypes.enum.program_collection
					}
				]
			: []),
		...(mayAddGoal
			? [
					{
						group: 'goal_setting' as const,
						icon: Goal,
						label: $_('goal'),
						value: payloadTypes.enum.goal
					}
				]
			: []),
		...(mayAddGoalCollection
			? [
					{
						group: 'goal_setting' as const,
						icon: Goal,
						label: $_('goals'),
						value: payloadTypes.enum.goal_collection
					}
				]
			: []),
		...(mayAddMeasure
			? [
					{
						group: 'implementation_planning' as const,
						icon: Clipboard,
						label: $_('measure'),
						value: payloadTypes.enum.measure
					}
				]
			: []),
		...(mayAddSimpleMeasure
			? [
					{
						group: 'implementation_planning' as const,
						icon: Clipboard,
						label: $_('simple_measure'),
						value: payloadTypes.enum.simple_measure
					}
				]
			: []),
		...(mayAddMeasureCollection
			? [
					{
						group: 'implementation_planning' as const,
						icon: Clipboard,
						label: $_('measures'),
						value: payloadTypes.enum.measure_collection
					}
				]
			: []),
		...(mayAddTaskCollection
			? [
					{
						group: 'implementation_planning' as const,
						icon: ClipboardCheck,
						label: $_('tasks'),
						value: payloadTypes.enum.task_collection
					}
				]
			: []),
		...(mayAddProgress
			? [
					{
						group: 'implementation_planning' as const,
						icon: Progress,
						label: $_('progress'),
						value: payloadTypes.enum.progress
					}
				]
			: []),
		...(mayAddIndicatorCollection
			? [
					{
						group: 'impact_measurement' as const,
						icon: ChartMixed,
						label: $_('indicators'),
						value: payloadTypes.enum.indicator_collection
					}
				]
			: []),
		...(mayAddObjectiveCollection
			? [
					{
						group: 'impact_measurement' as const,
						icon: Objective,
						label: $_('objectives'),
						value: payloadTypes.enum.objective_collection
					}
				]
			: []),
		...(mayAddEffectCollection
			? [
					{
						group: 'impact_measurement' as const,
						icon: ChartBar,
						label: $_('effect'),
						value: payloadTypes.enum.effect_collection
					}
				]
			: []),
		...(mayAddResourceCollection
			? [
					{
						group: 'resource_planning' as const,
						icon: Cash,
						label: $_('resources'),
						value: payloadTypes.enum.resource_collection
					}
				]
			: []),
		...(mayAddActualResourceAllocationCollection
			? [
					{
						group: 'resource_planning' as const,
						icon: Cash,
						label: $_('resource_data_type.actual_resource_allocation'),
						resourceDataType:
							resourceDataTypes.enum['resource_data_type.actual_resource_allocation'],
						value: payloadTypes.enum.resource_data_collection
					}
				]
			: []),
		...(mayAddPlannedResourceAllocationCollection
			? [
					{
						group: 'resource_planning' as const,
						icon: Cash,
						label: $_('resource_data_type.planned_resource_allocation'),
						resourceDataType:
							resourceDataTypes.enum['resource_data_type.planned_resource_allocation'],
						value: payloadTypes.enum.resource_data_collection
					}
				]
			: []),
		...(mayAddBudgetCollection
			? [
					{
						group: 'resource_planning' as const,
						icon: Cash,
						label: $_('resource_data_type.budget'),
						resourceDataType: resourceDataTypes.enum['resource_data_type.budget'],
						value: payloadTypes.enum.resource_data_collection
					}
				]
			: []),
		...(mayAddKnowledge
			? [
					{
						group: 'knowledge_transfer' as const,
						icon: BookOpen,
						label: $_('knowledge'),
						value: payloadTypes.enum.knowledge
					}
				]
			: []),
		...(mayAddRule
			? [
					{
						group: 'rules' as const,
						icon: Gavel,
						label: $_('rule'),
						value: payloadTypes.enum.rule
					}
				]
			: [])
	]);

	let visibleGroups = $derived.by(() => {
		return sectionGroups
			.map((group) => ({
				...group,
				options: options
					.filter(({ value }) => $mayCreateContainer(value, parentContainer))
					.filter((option) => option.group === group.key)
					.toSorted((a, b) => a.label.localeCompare(b.label))
					.map((option) => ({
						...option,
						item: {
							resourceDataType: option.resourceDataType,
							textType: option.textType,
							title: option.label,
							type: option.value
						}
					}))
			}))
			.filter(({ options }) => options.length > 0);
	});
</script>

<div class="dropdown" class:dropdown--compact={compact} use:popperRef>
	<button
		{@attach tooltip($_('add_section'))}
		class="dropdown-button"
		onchange={handleAddSection}
		type="button"
		use:menu.button
	>
		<Plus />
		<span class:is-visually-hidden={compact}>{$_('add_section')}</span>
	</button>

	{#if $menu.expanded}
		<div class="dropdown-panel" use:menu.items use:popperContent={extraOpts}>
			<div class="dropdown-panel-header">
				<p class="dropdown-panel-title">
					<span>{$_('add_section')}</span>
					<button class="action-button" onclick={() => menu.close()} type="button">
						<Close />
						<span class="is-visually-hidden">{$_('close')}</span>
					</button>
				</p>
			</div>

			<div class="groups">
				{#each visibleGroups as group (group.key)}
					<div class={['group', group.colorClass]}>
						{const id = crypto.randomUUID()}
						<p class="group-title" {id}>{group.label}</p>
						<ul class="menu" aria-labelledby={id} role="group">
							{#each group.options as option (`${option.value}-${option.resourceDataType ?? 'none'}-${option.textType ?? 'none'}`)}
								<li role="none">
									<button
										class={['menu-item', { 'menu-item--active': $menu.active === option.item }]}
										type="button"
										use:menu.item={{ value: option.item }}
									>
										<option.icon />
										{option.label}
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{:else}
					<p class="no-results">{$_('filter.no_results')}</p>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.dropdown {
		--dropdown-button-border-radius: 16px;
		--dropdown-button-padding: 1rem;
		--dropdown-panel-background: var(--color-surface-container);
		--dropdown-panel-border-color: var(--color-border-raised);
		--dropdown-panel-border-radius: 16px;
		--dropdown-panel-gap: 0.25rem;
		--dropdown-panel-max-height: 22.5rem;
		--dropdown-panel-width: 13.75rem;

		color: var(--color-gray-700);
		width: fit-content;
	}

	.dropdown.dropdown--compact {
		--dropdown-button-border-radius: 4px;
		--dropdown-button-padding: 0.25rem;
	}

	.dropdown-panel-title {
		align-items: center;
		color: var(--color-text-default);
		display: flex;
		font-size: 0.75rem;
		font-weight: 600;
		justify-content: space-between;
		padding: 0 0 0 0.5rem;
	}

	.groups {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
	}

	.group-title {
		color: var(--color-text-accent-subtle);
		font-size: 0.75rem;
		font-weight: 500;
		padding: 0.75rem 0.5rem 0.25rem;
	}

	.menu {
		gap: 0;
	}

	.menu-item {
		align-items: center;
		border: none;
		border-radius: 8px;
		color: var(--color-text-default);
		cursor: default;
		display: flex;
		font-size: 0.875rem;
		font-weight: 500;
		gap: 0.5rem;
		min-height: 2.5rem;
		padding: 0.5rem;
		text-align: left;
		width: 100%;
	}

	.menu-item.menu-item--active {
		background-color: var(--color-background-accent-hover);
	}

	.menu-item :global(svg) {
		color: var(--color-icon-accent-default);
		flex-shrink: 0;
		height: 1rem;
		width: 1rem;
	}

	.no-results {
		color: var(--color-text-subtle);
		font-size: 0.875rem;
		padding: 0.5rem;
	}
</style>
