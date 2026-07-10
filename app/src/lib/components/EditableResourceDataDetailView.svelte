<script lang="ts">
	import { resource } from 'runed';
	import type { Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { _ } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import fetchContainerRevisions from '$lib/client/fetchContainerRevisions';
	import fetchContainers from '$lib/client/fetchContainers';
	import fetchRelatedContainers from '$lib/client/fetchRelatedContainers';
	import saveContainer from '$lib/client/saveContainer';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import type {
		EditableTableDataRow,
		EditableTableSection,
		EditableTableValue
	} from '$lib/components/EditableTable.svelte';
	import EditableTable from '$lib/components/EditableTable.svelte';
	import Header from '$lib/components/Header.svelte';
	import ResourceDataProperties from '$lib/components/ResourceDataProperties.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import { setBulkActionContext } from '$lib/contexts/bulkAction';
	import {
		type AnyPayload,
		type Container,
		findDescendants,
		type GoalPayload,
		isGoalContainer,
		isMeasureContainer,
		isResourceDataBudgetContainer,
		isResourceDataContainer,
		type MeasurePayload,
		overlayKey,
		overlayURL,
		payloadTypes,
		predicates,
		type ResourceDataPayload,
		type ResourceV2Payload
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: Container<ResourceDataPayload>;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: Container<AnyPayload>[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	let organization = $derived(container.organization);

	let relatedContainersQuery = resource(
		[() => guid, () => organization],
		async ([guid, organization], _, { signal }) =>
			fetchRelatedContainers(
				guid,
				{
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
				},
				'alpha',
				{ signal }
			)
	);

	setBulkActionContext({
		actions: ['visibility', 'delete'],
		onSuccess: relatedContainersQuery.refetch,
		selected: new SvelteSet<string>()
	});

	let relatedContainers = $derived(relatedContainersQuery.current ?? []);

	let currentResource = $state<Container<ResourceV2Payload> | undefined>(undefined);

	$effect(() => {
		fetchContainerRevisions(container.payload.resource).then((revisions) => {
			currentResource =
				(revisions[revisions.length - 1] as Container<ResourceV2Payload>) ?? undefined;
		});
	});

	const isBudgetContainer = $derived(isResourceDataBudgetContainer(container));

	const resourceUnit = $derived(currentResource?.payload.resourceUnit ?? 'undefined');

	// --- Budget table data fetching ---

	let goalContainers = $state<Container<GoalPayload>[]>([]);
	let measureContainers = $state<Container<MeasurePayload>[]>([]);

	$effect(() => {
		if (!isBudgetContainer) return;

		fetchContainers(
			{
				organization: [organization],
				payloadType: [payloadTypes.enum.goal, payloadTypes.enum.measure]
			},
			'alpha'
		).then((containers) => {
			goalContainers = containers.filter(isGoalContainer);
			measureContainers = containers.filter(isMeasureContainer);
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

	// Fetch all ResourceData containers in the organization to find those related
	// to subordinate goals and measures if the current container is a budget container.
	// Only fetch ResourceData containers which have the same resource as the current container.
	let allResourceDataContainers = $state<Container<ResourceDataPayload>[]>([]);

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
			allResourceDataContainers = containers
				.filter(isResourceDataContainer)
				.filter((c) => c.payload.resource === container.payload.resource);
		});
	});

	let allBudgetContainers = $derived.by(() => {
		const subordinateGoalGuids = new Set(subordinateGoals.map((g) => g.guid));
		return allResourceDataContainers
			.filter(isResourceDataBudgetContainer)
			.filter((c) =>
				c.relation.some(
					(r) => r.predicate === predicates.enum['is-part-of'] && subordinateGoalGuids.has(r.object)
				)
			);
	});

	function getBudgetsForGoal(goal: Container<GoalPayload>): Container<ResourceDataPayload>[] {
		return allBudgetContainers.filter((budget) =>
			budget.relation.some(
				(r) => r.predicate === predicates.enum['is-part-of'] && r.object === goal.guid
			)
		);
	}

	function getResourceDataForMeasure(
		measure: Container<MeasurePayload>
	): Container<ResourceDataPayload>[] {
		return allResourceDataContainers.filter((rd) =>
			rd.relation.some(
				(r) => r.predicate === predicates.enum['is-part-of'] && r.object === measure.guid
			)
		);
	}

	// --- Sections for EditableTable ---

	const sections = $derived.by((): EditableTableSection[] => {
		if (!isBudgetContainer) {
			// Simple data table: single section, single editable row
			return [
				{
					heading: '',
					rows: [
						{
							id: container.guid,
							container,
							label: '',
							editable: true
						}
					]
				}
			];
		}

		// Budget table: multiple sections
		const result: EditableTableSection[] = [];

		// Section 1: Current Budget
		if (parentGoal) {
			result.push({
				heading: $_('resource_table.current_budget'),
				rows: [
					{
						id: container.guid,
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
		const subordinateGoalRows: EditableTableDataRow[] = [];
		for (const goal of subordinateGoals) {
			const budgets = getBudgetsForGoal(goal);
			for (const budget of budgets) {
				subordinateGoalRows.push({
					id: budget.guid,
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
		const subordinateMeasureRows: EditableTableDataRow[] = [];
		for (const measure of subordinateMeasures) {
			const resourceDataContainers = getResourceDataForMeasure(measure);
			for (const resourceData of resourceDataContainers) {
				subordinateMeasureRows.push({
					id: resourceData.guid,
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
		containerToSave: Container<ResourceDataPayload>
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

	function getEntries(containerToRead: Container<ResourceDataPayload>): EditableTableValue[] {
		return containerToRead.payload.entries.map((entry) => ({
			year: entry.year,
			value: entry.amount
		}));
	}

	function setEntry(
		containerToUpdate: Container<ResourceDataPayload>,
		year: number,
		value: number | null
	) {
		if (value === null) {
			containerToUpdate.payload.entries = containerToUpdate.payload.entries.filter(
				(entry) => entry.year !== year
			);
			return;
		}

		const entryIndex = containerToUpdate.payload.entries.findIndex((entry) => entry.year === year);
		if (entryIndex >= 0) {
			containerToUpdate.payload.entries[entryIndex].amount = value;
			return;
		}

		containerToUpdate.payload.entries = [
			...containerToUpdate.payload.entries,
			{ year, amount: value }
		].sort((a, b) => a.year - b.year);
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

			<div class="details-section">
				<EditableTable
					title={isBudgetContainer
						? $_('resource_table.subordinate_goals_budget')
						: $_(container.payload.resourceDataType)}
					titleUnit={$_(resourceUnit)}
					columnLabel={isBudgetContainer ? $_('goal') : ''}
					{sections}
					fillYearGaps={isBudgetContainer}
					getEntries={(containerToRead) =>
						getEntries(containerToRead as Container<ResourceDataPayload>)}
					setEntry={(containerToUpdate, year, value) =>
						setEntry(containerToUpdate as Container<ResourceDataPayload>, year, value)}
					onSave={(containerToSave) =>
						handleSave(containerToSave as Container<ResourceDataPayload>)}
				/>
			</div>

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
