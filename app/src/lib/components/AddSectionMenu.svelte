<script lang="ts">
	import { resource } from 'runed';
	import { createMenu } from 'svelte-headlessui';
	import { _ } from 'svelte-i18n';
	import { createPopperActions } from 'svelte-popperjs';
	import Cash from '~icons/flowbite/cash-outline';
	import Code from '~icons/flowbite/file-code-solid';
	import File from '~icons/flowbite/file-solid';
	import Quote from '~icons/flowbite/quote-solid';
	import BasicData from '~icons/knotdots/basic-data';
	import Chapter from '~icons/knotdots/chapter';
	import ChartBar from '~icons/knotdots/chart-bar';
	import ChartLine from '~icons/knotdots/chart-line';
	import ChartMixed from '~icons/knotdots/chart-mixed';
	import Clipboard from '~icons/knotdots/clipboard-simple';
	import ClipboardCheck from '~icons/knotdots/clipboard-check';
	import Collection from '~icons/knotdots/collection';
	import ExclamationCircle from '~icons/knotdots/exclamation-circle';
	import Goal from '~icons/knotdots/goal';
	import Grid from '~icons/knotdots/grid';
	import Link from '~icons/knotdots/link';
	import Video from '~icons/knotdots/video';
	import Map from '~icons/knotdots/map';
	import Image from '~icons/knotdots/placeholder-image';
	import Plus from '~icons/knotdots/plus';
	import Program from '~icons/knotdots/program';
	import Progress from '~icons/knotdots/progress';
	import Star from '~icons/knotdots/star';
	import Summary from '~icons/knotdots/summary';
	import Text from '~icons/knotdots/text';
	import TwoCol from '~icons/knotdots/two-column';
	import { page } from '$app/state';
	import fetchContainers from '$lib/client/fetchContainers';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type AnyPayload,
		type Container,
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
		isObjectCollectionContainer,
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
		isTemplateContainer,
		type ObjectCollectionObjectType,
		type PayloadType,
		payloadTypes,
		predicates,
		resourceDataTypes,
		type TemplatePayload,
		textType
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import { mayCreateContainer } from '$lib/stores';
	import { isScopedTemplateRoot } from '$lib/templateScopes';
	import tooltip from '$lib/attachments/tooltip';

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

	type SectionOption = {
		icon: typeof Plus;
		label: string;
		newItemTemplate?: string;
		objectType?: ObjectCollectionObjectType;
		resourceDataType?: string;
		textType?: string;
		value: PayloadType;
	};

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
			(isMeasureContainer(parentContainer) &&
				createFeatureDecisions(page.data.features).useSubMeasures())) &&
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

	let mayAddChapter = $derived(isReportContainer(parentContainer));

	let mayAddIgniteVideo = $derived(
		isHelpContainer(parentContainer) ||
			isEventContainer(parentContainer) ||
			isPostContainer(parentContainer)
	);

	let mayAddSummary = $derived(
		isContainerWithSummary(parentContainer) &&
			!hasSection(parentContainer, relatedContainers).some(isSummaryContainer)
	);

	// Programs offer one object section per scoped goal template; the templates are
	// only requested once the menu opens.
	const goalTemplatesResource = resource(
		[
			() => $menu.expanded,
			() =>
				isProgramContainer(parentContainer) &&
				createFeatureDecisions(page.data.features).useTemplateWorkspaces(),
			() => parentContainer.guid,
			() => parentContainer.organization
		],
		async (
			[expanded, enabled, scopeGuid, organizationGuid],
			_,
			{ data, signal }
		): Promise<Container<TemplatePayload>[]> => {
			if (!enabled) {
				return [];
			}
			if (!expanded) {
				return data ?? [];
			}
			const containers = await fetchContainers(
				{
					availableIn: scopeGuid,
					organization: [organizationGuid],
					payloadType: [payloadTypes.enum.goal],
					template: 'true',
					templateRoot: true
				},
				'alpha',
				{ signal }
			);
			return containers.filter(isTemplateContainer).filter((container) =>
				isScopedTemplateRoot(container, {
					organizationGuid,
					payloadType: payloadTypes.enum.goal,
					scopeGuid
				})
			);
		}
	);

	let objectCollections = $derived(
		hasSection(parentContainer, relatedContainers).filter(isObjectCollectionContainer)
	);

	let programOptions: SectionOption[] = $derived.by(() => {
		if (goalTemplatesResource.loading) {
			return [];
		}
		const templates = goalTemplatesResource.current ?? [];
		if (templates.length > 0) {
			return templates
				.filter((t) => !objectCollections.some((s) => s.payload.newItemTemplate === t.guid))
				.map((t) => ({
					icon: Goal,
					label: t.payload.title,
					newItemTemplate: t.guid,
					objectType: payloadTypes.enum.goal,
					value: payloadTypes.enum.object_collection
				}));
		}
		return objectCollections.some(
			(s) => s.payload.objectType === payloadTypes.enum.goal && !s.payload.newItemTemplate
		)
			? []
			: [
					{
						icon: Goal,
						label: $_('goals'),
						objectType: payloadTypes.enum.goal,
						value: payloadTypes.enum.object_collection
					}
				];
	});

	let sectionOptions: SectionOption[] = $derived(
		[
			{ icon: Text, label: $_('text'), value: payloadTypes.enum.text },
			{
				icon: Text,
				label: $_('inline_help'),
				textType: textType.enum.inline_help,
				value: payloadTypes.enum.text
			},
			{ icon: Code, label: $_('html'), value: payloadTypes.enum.html },
			...(mayAddSummary
				? [{ icon: Summary, label: $_('summary'), value: payloadTypes.enum.summary }]
				: []),
			{
				icon: Grid,
				label: $_('custom_collection.settings.embed_objects'),
				value: payloadTypes.enum.custom_collection
			},
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
			...(mayAddActualResourceAllocationCollection
				? [
						{
							icon: Cash,
							label: $_('resource_data_type.actual_resource_allocation'),
							value: payloadTypes.enum.resource_data_collection,
							resourceDataType: 'resource_data_type.actual_resource_allocation'
						}
					]
				: []),
			...(mayAddPlannedResourceAllocationCollection
				? [
						{
							icon: Cash,
							label: $_('resource_data_type.planned_resource_allocation'),
							value: payloadTypes.enum.resource_data_collection,
							resourceDataType: 'resource_data_type.planned_resource_allocation'
						}
					]
				: []),
			...(mayAddBudgetCollection
				? [
						{
							icon: Cash,
							label: $_('resource_data_type.budget'),
							value: payloadTypes.enum.resource_data_collection,
							resourceDataType: 'resource_data_type.budget'
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
			...(mayAddDemographicData
				? [
						{
							icon: BasicData,
							label: $_('demographic_data'),
							value: payloadTypes.enum.demographic_data
						}
					]
				: []),
			...(mayAddMap
				? [{ icon: Map, label: $_('administrative_area.boundary'), value: payloadTypes.enum.map }]
				: []),
			{ icon: Image, label: $_('image'), value: payloadTypes.enum.image },
			...(mayAddIgniteVideo
				? [
						{
							icon: Video,
							label: $_('ignite_video'),
							value: payloadTypes.enum.ignite_video
						}
					]
				: []),
			...(mayAddTeaserCollection
				? [
						{
							icon: Collection,
							label: $_('teasers'),
							value: payloadTypes.enum.teaser_collection
						}
					]
				: []),
			{ icon: TwoCol, label: $_('col_content'), value: payloadTypes.enum.col_content },
			{ icon: Link, label: $_('teaser'), value: payloadTypes.enum.teaser },
			{ icon: Star, label: $_('teaser_highlight'), value: payloadTypes.enum.teaser_highlight },
			{ icon: ExclamationCircle, label: $_('info_box'), value: payloadTypes.enum.info_box },
			{ icon: Quote, label: $_('quote'), value: payloadTypes.enum.quote }
		].toSorted((a, b) => a.label.localeCompare(b.label))
	);

	let options = $derived(isProgramContainer(parentContainer) ? programOptions : sectionOptions);
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
				{#each options as option (`${option.value}-${option.resourceDataType ?? 'none'}-${option.textType ?? 'none'}-${option.newItemTemplate ?? 'none'}`)}
					{#if $mayCreateContainer(option.value, parentContainer)}
						<li class="menu-item">
							<button
								use:menu.item={{
									value: {
										type: option.value,
										newItemTemplate: option.newItemTemplate,
										objectType: option.objectType,
										resourceDataType: option.resourceDataType,
										textType: option.textType,
										title: option.label
									}
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
