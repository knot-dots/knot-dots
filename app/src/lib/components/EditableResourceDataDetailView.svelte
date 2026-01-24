<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableTable from '$lib/components/EditableTable.svelte';
	import type {
		ResourceTableRow,
		ResourceTableSection
	} from '$lib/components/EditableTable.svelte';
	import ResourceDataProperties from '$lib/components/ResourceDataProperties.svelte';
	import saveContainer from '$lib/client/saveContainer';
	import fetchContainers from '$lib/client/fetchContainers';
	import {
		predicates,
		overlayKey,
		overlayURL,
		payloadTypes,
		findDescendants,
		type AnyContainer,
		type Container,
		type GoalContainer,
		type MeasureContainer,
		type ResourceDataContainer,
		type ResourceV2Container,
		isContainerWithPayloadType,
		resourceDataTypes
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import { _ } from 'svelte-i18n';
	import EditableFormattedText from './EditableFormattedText.svelte';
	import Sections from './Sections.svelte';
	import Header from './Header.svelte';
	import { fetchRelatedContainers } from '$lib/remote/data.remote';
	import type { Snippet } from 'svelte';
	import fetchContainerRevisions from '$lib/client/fetchContainerRevisions';

	interface Props {
		container: ResourceDataContainer;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let relatedContainers = $state<Container[]>([]);

	$effect(() => {
		fetchRelatedContainers({
			guid,
			params: {
				organization: [organization],
				relationType: [
					predicates.enum['is-consistent-with'],
					predicates.enum['is-equivalent-to'],
					predicates.enum['is-inconsistent-with'],
					predicates.enum['is-measured-by'],
					predicates.enum['is-objective-for'],
					predicates.enum['is-part-of'],
					predicates.enum['is-part-of-category'],
					predicates.enum['is-section-of']
				]
			}
		}).then((containers) => {
			relatedContainers = containers;
		});
	});

	let currentResource = $state<ResourceV2Container | undefined>(undefined);

	$effect(() => {
		fetchContainerRevisions(container.payload.resource).then((revisions) => {
			currentResource = (revisions[revisions.length - 1] as ResourceV2Container) ?? undefined;
		});
	});

	const isBudgetContainer = $derived(
		isContainerWithPayloadType(payloadTypes.enum.resource_data, container) &&
			container.payload.resourceDataType === resourceDataTypes.enum['resource_data_type.budget']
	);

	const resourceUnit = $derived(currentResource?.payload.resourceUnit ?? 'undefined');

	// --- Budget table data fetching ---

	let goalContainers = $state<GoalContainer[]>([]);
	let measureContainers = $state<MeasureContainer[]>([]);

	$effect(() => {
		if (!isBudgetContainer) return;

		fetchContainers(
			{
				organization: [organization],
				payloadType: [payloadTypes.enum.goal, payloadTypes.enum.measure]
			},
			'alpha'
		).then((containers) => {
			goalContainers = containers.filter((c) =>
				isContainerWithPayloadType(payloadTypes.enum.goal, c)
			);
			measureContainers = containers.filter((c) =>
				isContainerWithPayloadType(payloadTypes.enum.measure, c)
			);
		});
	});

	let parentGoal = $derived.by(() => {
		if (!isBudgetContainer) return undefined;
		const parentGuid = container.relation.find(
			(r) => r.predicate === predicates.enum['is-part-of'] && r.subject === container.guid
		)?.object;
		return goalContainers.find((g) => g.guid === parentGuid);
	});

	let subordinateGoals = $derived.by(() => {
		if (!parentGoal) return [];
		return findDescendants(parentGoal, goalContainers, [predicates.enum['is-part-of']]);
	});

	let subordinateMeasures = $derived.by(() => {
		if (!parentGoal) return [];
		const goalGuids = new Set([parentGoal.guid, ...subordinateGoals.map((g) => g.guid)]);
		return measureContainers.filter((measure) =>
			measure.relation.some(
				(r) => r.predicate === predicates.enum['is-part-of'] && goalGuids.has(r.object)
			)
		);
	});

	let allResourceDataContainers = $state<ResourceDataContainer[]>([]);

	$effect(() => {
		if (!isBudgetContainer || !parentGoal) {
			allResourceDataContainers = [];
			return;
		}

		fetchContainers(
			{
				organization: [organization],
				payloadType: [payloadTypes.enum.resource_data]
			},
			'alpha'
		).then((containers) => {
			allResourceDataContainers = containers.filter((c) =>
				isContainerWithPayloadType(payloadTypes.enum.resource_data, c)
			);
		});
	});

	let allBudgetContainers = $derived.by(() => {
		const subordinateGoalGuids = new Set(subordinateGoals.map((g) => g.guid));
		return allResourceDataContainers
			.filter(
				({ payload }) =>
					payload.resourceDataType === resourceDataTypes.enum['resource_data_type.budget']
			)
			.filter((c) =>
				c.relation.some(
					(r) => r.predicate === predicates.enum['is-part-of'] && subordinateGoalGuids.has(r.object)
				)
			);
	});

	function getBudgetsForGoal(goal: GoalContainer): ResourceDataContainer[] {
		return allBudgetContainers.filter((budget) =>
			budget.relation.some(
				(r) => r.predicate === predicates.enum['is-part-of'] && r.object === goal.guid
			)
		);
	}

	function getResourceDataForMeasure(measure: MeasureContainer): ResourceDataContainer[] {
		return allResourceDataContainers.filter((rd) =>
			rd.relation.some(
				(r) => r.predicate === predicates.enum['is-part-of'] && r.object === measure.guid
			)
		);
	}

	// --- Sections for EditableTable ---

	const sections = $derived.by((): ResourceTableSection[] => {
		if (!isBudgetContainer) {
			// Simple data table: single section, single editable row
			return [
				{
					heading: '',
					rows: [
						{
							container,
							label: '',
							editable: true
						}
					]
				}
			];
		}

		// Budget table: multiple sections
		const result: ResourceTableSection[] = [];

		// Section 1: Current Budget
		if (parentGoal) {
			result.push({
				heading: $_('resource_table.current_budget'),
				rows: [
					{
						container,
						label: parentGoal.payload.title,
						href: overlayURL(page.url, overlayKey.enum.view, parentGoal.guid),
						editable: true
					}
				]
			});
		} else {
			result.push({
				heading: $_('resource_table.current_budget'),
				rows: [],
				emptyMessage: $_('resource_table.no_parent_goal')
			});
		}

		// Section 2: Subordinate Goals
		const subordinateGoalRows: ResourceTableRow[] = [];
		for (const goal of subordinateGoals) {
			const budgets = getBudgetsForGoal(goal);
			for (const budget of budgets) {
				subordinateGoalRows.push({
					container: budget,
					label: goal.payload.title,
					href: overlayURL(page.url, overlayKey.enum.view, goal.guid),
					subtitle: budget.payload.title || undefined,
					dotColor: 'var(--color-primary-300)',
					editable: false
				});
			}
		}
		result.push({
			heading: $_('resource_table.subordinate_goals'),
			rows: subordinateGoalRows,
			emptyMessage:
				subordinateGoals.length === 0 || allBudgetContainers.length === 0
					? $_('resource_table.no_subordinate_goals')
					: undefined
		});

		// Section 3: Subordinate Measures
		const subordinateMeasureRows: ResourceTableRow[] = [];
		for (const measure of subordinateMeasures) {
			const resourceDataContainers = getResourceDataForMeasure(measure);
			for (const resourceData of resourceDataContainers) {
				subordinateMeasureRows.push({
					container: resourceData,
					label: measure.payload.title,
					href: overlayURL(page.url, overlayKey.enum.view, measure.guid),
					subtitle: resourceData.payload.title || undefined,
					dotColor: 'var(--color-orange-300)',
					editable: false
				});
			}
		}
		const hasMeasuresWithData = subordinateMeasures.some(
			(m) => getResourceDataForMeasure(m).length > 0
		);
		result.push({
			heading: $_('resource_table.subordinate_measures'),
			rows: subordinateMeasureRows,
			emptyMessage:
				subordinateMeasures.length === 0 || !hasMeasuresWithData
					? $_('resource_table.no_subordinate_measures')
					: undefined
		});

		return result;
	});

	// onSave callback for EditableTable
	async function handleSave(
		containerToSave: ResourceDataContainer
	): Promise<{ guid: string; revision: number }> {
		const response = await saveContainer(containerToSave);
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message);
		}
		const updated = await response.json();
		await invalidate('containers');
		return { guid: updated.guid, revision: updated.revision };
	}
</script>

{#snippet header()}
	<Header sortOptions={[]} workspaceOptions={[]} />
{/snippet}

{#snippet main()}
	<EditableContainerDetailView bind:container>
		{#snippet data()}
			<ResourceDataProperties
				{container}
				editable={$applicationState.containerDetailView.editable &&
					$ability.can('update', container)}
				{relatedContainers}
				{revisions}
			/>

			{#key container.guid}
				<EditableFormattedText
					editable={$applicationState.containerDetailView.editable &&
						$ability.can('update', container)}
					label={$_('description')}
					bind:value={container.payload.description}
				/>
			{/key}

			<EditableTable
				title={isBudgetContainer
					? $_('resource_table.subordinate_goals_budget')
					: $_(container.payload.resourceDataType)}
				titleUnit={$_(resourceUnit)}
				columnLabel={isBudgetContainer ? $_('goal') : ''}
				{sections}
				fillYearGaps={isBudgetContainer}
				onSave={handleSave}
			/>

			<Sections bind:container {relatedContainers} />
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}
