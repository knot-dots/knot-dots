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
	import Book from '~icons/knotdots/book-open-outline';
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
	import Measure from '~icons/knotdots/measure';
	import Image from '~icons/knotdots/placeholder-image';
	import Plus from '~icons/knotdots/plus';
	import Program from '~icons/knotdots/program';
	import Progress from '~icons/knotdots/progress';
	import Rule from '~icons/knotdots/rule-database';
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
		objectCollectionObjectTypes,
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

	let mayAddChapter = $derived(
		isReportContainer(parentContainer) || isProgramContainer(parentContainer)
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

	// Programs offer one object section per part type they allow, bound to each
	// scoped template of that type. The templates are requested once the menu has
	// been opened; the menu store itself must not be a dependency because item
	// registration updates it while the menu is open.
	let templatesRequested = $state(false);

	$effect(() => {
		if ($menu.expanded) {
			templatesRequested = true;
		}
	});

	let objectTypes: ObjectCollectionObjectType[] = $derived(
		isProgramContainer(parentContainer)
			? parentContainer.payload.chapterType.flatMap((type) => {
					const parsed = objectCollectionObjectTypes.safeParse(type);
					return parsed.success ? [parsed.data] : [];
				})
			: []
	);

	const objectTemplatesResource = resource(
		[
			() => templatesRequested,
			() =>
				objectTypes.length > 0 &&
				createFeatureDecisions(page.data.features).useTemplateWorkspaces(),
			() => parentContainer.guid,
			() => parentContainer.organization,
			() => objectTypes.join('\u0000')
		],
		async (
			[requested, enabled, scopeGuid, organizationGuid, typesKey],
			_,
			{ signal }
		): Promise<Container<TemplatePayload>[]> => {
			if (!enabled || !requested) {
				return [];
			}
			const containers = await fetchContainers(
				{
					availableIn: scopeGuid,
					organization: [organizationGuid],
					payloadType: typesKey.split('\u0000'),
					template: 'true',
					templateRoot: true
				},
				'alpha',
				{ signal }
			);
			return containers
				.filter(isTemplateContainer)
				.filter((container) => isScopedTemplateRoot(container, { organizationGuid, scopeGuid }));
		}
	);

	const objectTypeIcons: Record<ObjectCollectionObjectType, typeof Plus> = {
		[payloadTypes.enum.goal]: Goal,
		[payloadTypes.enum.knowledge]: Book,
		[payloadTypes.enum.measure]: Measure,
		[payloadTypes.enum.rule]: Rule,
		[payloadTypes.enum.simple_measure]: Measure
	};

	const objectTypeLabels: Record<ObjectCollectionObjectType, string> = {
		[payloadTypes.enum.goal]: 'goals',
		[payloadTypes.enum.knowledge]: 'knowledge',
		[payloadTypes.enum.measure]: 'measures',
		[payloadTypes.enum.rule]: 'rules',
		[payloadTypes.enum.simple_measure]: 'simple_measure'
	};

	let objectOptions: SectionOption[] = $derived.by(() => {
		if (objectTemplatesResource.loading) {
			return [];
		}
		const templates = objectTemplatesResource.current ?? [];
		const templatesRequired = createFeatureDecisions(page.data.features).useTemplateWorkspaces();
		return objectTypes.flatMap((objectType) => {
			const templatesOfType = templates.filter(({ payload }) => payload.type === objectType);
			if (templatesOfType.length > 0) {
				return templatesOfType.map((template) => ({
					icon: objectTypeIcons[objectType],
					label: template.payload.title,
					newItemTemplate: template.guid,
					objectType,
					value: payloadTypes.enum.object_collection
				}));
			}
			// Without templates an object can only be created when templates are optional.
			return templatesRequired
				? []
				: [
						{
							icon: objectTypeIcons[objectType],
							label: $_(objectTypeLabels[objectType]),
							objectType,
							value: payloadTypes.enum.object_collection
						}
					];
		});
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

	let options = $derived(
		isProgramContainer(parentContainer)
			? [...sectionOptions, ...objectOptions].toSorted((a, b) => a.label.localeCompare(b.label))
			: sectionOptions
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
				{#each options as option (`${option.value}-${option.resourceDataType ?? 'none'}-${option.textType ?? 'none'}-${option.objectType ?? 'none'}-${option.newItemTemplate ?? 'none'}`)}
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
