<script lang="ts">
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import CreateAnotherButton from '$lib/components/CreateAnotherButton.svelte';
	import CreateCopyButton from '$lib/components/CreateCopyButton.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import EditableContainerDetailView from '$lib/components/EditableContainerDetailView.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableTable from '$lib/components/EditableTable.svelte';
	import type {
		EditableTableDataRow,
		EditableTableSection,
		EditableTableValue
	} from '$lib/components/EditableTable.svelte';
	import Header from '$lib/components/Header.svelte';
	import RelationButton from '$lib/components/RelationButton.svelte';
	import Sections from '$lib/components/Sections.svelte';
	import ResourceV2Properties from '$lib/components/ResourceV2Properties.svelte';
	import saveContainer from '$lib/client/saveContainer';
	import {
		type AnyContainer,
		type Container,
		type NewContainer,
		type ResourceDataContainer,
		type ResourceV2Container,
		containerOfType,
		findAncestors,
		isGoalContainer,
		isMeasureContainer,
		isResourceDataBudgetContainer,
		isResourceDataPlannedResourceAllocationContainer,
		isResourceDataActualResourceAllocationContainer,
		isResourceDataTotalBudgetContainer,
		isResourceDataTotalBudgetForecastContainer,
		overlayKey,
		overlayURL,
		paramsFromFragment,
		payloadTypes,
		predicates,
		resourceDataTypes
	} from '$lib/models';
	import {
		fetchContainersRelatedToProgram,
		fetchContainersRelatedToResource
	} from '$lib/remote/data.remote';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: ResourceV2Container;
		layout: Snippet<[Snippet, Snippet]>;
		revisions: AnyContainer[];
	}

	let { container = $bindable(), layout, revisions }: Props = $props();

	let guid = $derived(container.guid);

	// Read program parameter from URL hash to filter related containers
	const programGuid = $derived.by(() => {
		const hashParams = paramsFromFragment(page.url);
		return hashParams.get('program');
	});

	// Fetch resource-related containers
	let relatedContainersQuery = $derived(
		fetchContainersRelatedToResource({
			guid,
			params: {
				organization: [page.data.currentOrganization.guid],
				relationType: [
					predicates.enum['is-consistent-with'],
					predicates.enum['is-equivalent-to'],
					predicates.enum['is-inconsistent-with'],
					predicates.enum['is-measured-by'],
					predicates.enum['is-objective-for'],
					predicates.enum['is-part-of'],
					predicates.enum['is-section-of']
				]
			}
		})
	);

	// Fetch program hierarchy containers if program is specified
	let programContainersQuery = $derived(
		programGuid
			? fetchContainersRelatedToProgram({
					guid: programGuid,
					params: {}
				})
			: null
	);

	const allRelatedContainers = $derived(relatedContainersQuery.current ?? []);
	const programContainers = $derived(programContainersQuery?.current ?? []);

	// Filter related containers by program if program parameter is present
	const relatedContainers = $derived.by(() => {
		if (!programGuid || programContainers.length === 0) return allRelatedContainers;

		// Build a set of all container GUIDs that are part of the program hierarchy
		const programContainerGuids = new Set<string>([
			programGuid,
			...programContainers.map((c) => c.guid)
		]);

		// Filter resource_data to only those that are part of containers in the program
		return allRelatedContainers.filter((c) => {
			if (c.payload.type === payloadTypes.enum.resource_data) {
				// Resource data is included if it's part of a container in the program
				return c.relation.some(
					(r) =>
						r.predicate === predicates.enum['is-part-of'] && programContainerGuids.has(r.object)
				);
			} else {
				// Other containers (goals, measures) are included if they're in the program
				return programContainerGuids.has(c.guid);
			}
		});
	});

	// --- ResourceV2Table logic ---

	let budgetContainers = $derived(relatedContainers.filter(isResourceDataBudgetContainer));
	let plannedContainers = $derived(
		relatedContainers.filter(isResourceDataPlannedResourceAllocationContainer)
	);
	let actualContainers = $derived(
		relatedContainers.filter(isResourceDataActualResourceAllocationContainer)
	);
	let budgetTotalContainer = $derived(relatedContainers.find(isResourceDataTotalBudgetContainer));
	let prognosisContainer = $derived(
		relatedContainers.find(isResourceDataTotalBudgetForecastContainer)
	);

	// Helper to create a stub container for optimistic UI
	function createStub(
		resourceDataType:
			| 'resource_data_type.total_budget'
			| 'resource_data_type.total_budget_forecast',
		title: string,
		temporaryGuid: string
	): ResourceDataContainer {
		let c = containerOfType(
			payloadTypes.enum.resource_data,
			container.organization,
			container.organizational_unit,
			container.managed_by,
			container.realm
		) as ResourceDataContainer;

		c.guid = temporaryGuid;
		c.payload.title = title;
		c.payload.resourceDataType = resourceDataType;
		c.payload.resource = container.guid;
		c.relation = [
			{
				object: container.guid,
				subject: temporaryGuid,
				position: 0,
				predicate: predicates.enum['is-part-of']
			}
		];

		return c;
	}

	let budgetTotalState = $state(
		createStub(
			resourceDataTypes.enum['resource_data_type.total_budget'],
			'Budget Total',
			'TEMPORARY_NEW_BUDGET_TOTAL'
		)
	);
	let prognosisState = $state(
		createStub(
			resourceDataTypes.enum['resource_data_type.total_budget_forecast'],
			'Prognosis',
			'TEMPORARY_NEW_PROGNOSIS'
		)
	);

	$effect(() => {
		if (budgetTotalContainer) budgetTotalState = budgetTotalContainer;
	});

	$effect(() => {
		if (prognosisContainer) prognosisState = prognosisContainer;
	});

	// Note: Permission checks for budgetTotal/prognosis are handled by EditableTable
	// These stubs may need creation permissions which are checked via mayCreateContainer

	function getRelatedMeasureOrGoal(resourceDataContainer: Container) {
		const ancestors = findAncestors(resourceDataContainer, relatedContainers, [
			predicates.enum['is-part-of']
		]);
		return ancestors.find((c) => isMeasureContainer(c) || isGoalContainer(c));
	}

	// Build sections for EditableTable
	const sections = $derived.by((): EditableTableSection[] => {
		const result: EditableTableSection[] = [];

		// Section 1: Total Budget
		result.push({
			heading: $_('resource_table.total_budget'),
			rows: [
				{
					id: budgetTotalState.guid,
					container: budgetTotalState,
					label: $_('resource_table.past_years'),
					editable: true
				},
				{
					id: prognosisState.guid,
					container: prognosisState,
					label: $_('resource_table.total_budget_forecast'),
					editable: true
				}
			]
		});

		// Section 2: Budgets
		const budgetRows: EditableTableDataRow[] = budgetContainers.map((budgetContainer) => {
			const relatedContainer = getRelatedMeasureOrGoal(budgetContainer);
			return {
				id: budgetContainer.guid,
				container: budgetContainer,
				label: relatedContainer?.payload.title ?? budgetContainer.payload.title,
				href: relatedContainer
					? overlayURL(page.url, overlayKey.enum.view, relatedContainer.guid)
					: undefined,
				dotColor: 'var(--color-primary-300)',
				editable: false
			};
		});
		result.push({
			heading: $_('resource_table.budgets'),
			rows: budgetRows,
			showSum: true
		});

		// Section 3: Planned Resource Allocation
		const plannedRows: EditableTableDataRow[] = plannedContainers.map((plannedContainer) => {
			const relatedContainer = getRelatedMeasureOrGoal(plannedContainer);
			return {
				id: plannedContainer.guid,
				container: plannedContainer,
				label: relatedContainer?.payload.title ?? plannedContainer.payload.title,
				href: relatedContainer
					? overlayURL(page.url, overlayKey.enum.view, relatedContainer.guid)
					: undefined,
				dotColor: 'var(--color-orange-300)',
				editable: false
			};
		});
		result.push({
			heading: $_('resource_data_type.planned_resource_allocation'),
			rows: plannedRows,
			showSum: true
		});

		// Section 4: Actual Resource Allocation
		const actualRows: EditableTableDataRow[] = actualContainers.map((actualContainer) => {
			const relatedContainer = getRelatedMeasureOrGoal(actualContainer);
			return {
				id: actualContainer.guid,
				container: actualContainer,
				label: relatedContainer?.payload.title ?? actualContainer.payload.title,
				href: relatedContainer
					? overlayURL(page.url, overlayKey.enum.view, relatedContainer.guid)
					: undefined,
				dotColor: 'var(--color-red-400)',
				editable: false
			};
		});
		result.push({
			heading: $_('resource_data_type.actual_resource_allocation'),
			rows: actualRows,
			showSum: true
		});

		return result;
	});

	// onSave callback – handles both creating new stub containers and updating existing ones
	async function handleSave(
		containerToSave: ResourceDataContainer
	): Promise<{ guid: string; revision: number }> {
		const isNewContainer = containerToSave.guid.startsWith('TEMPORARY_NEW');

		let response: Response;

		if (isNewContainer) {
			const newContainer = containerOfType(
				payloadTypes.enum.resource_data,
				container.organization,
				container.organizational_unit,
				container.managed_by,
				container.realm
			) as NewContainer;

			newContainer.payload = containerToSave.payload;
			newContainer.relation = [
				{
					object: page.data.currentOrganizationalUnit?.guid ?? page.data.currentOrganization.guid,
					position: 0,
					predicate: predicates.enum['is-part-of']
				}
			];

			response = await saveContainer(newContainer);
		} else {
			response = await saveContainer(containerToSave);
		}

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.message);
		}

		const updated = await response.json();
		await invalidate('containers');
		return { guid: updated.guid, revision: updated.revision };
	}

	function getEntries(containerToRead: ResourceDataContainer): EditableTableValue[] {
		return containerToRead.payload.entries.map((entry) => ({
			year: entry.year,
			value: entry.amount
		}));
	}

	function setEntry(containerToUpdate: ResourceDataContainer, year: number, value: number | null) {
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
			<ResourceV2Properties
				bind:container
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
					title={$_('resource_table.resource_requirements')}
					titleUnit={$_(container.payload.resourceUnit)}
					columnLabel={$_('table.data_object')}
					{sections}
					getEntries={(containerToRead) => getEntries(containerToRead as ResourceDataContainer)}
					setEntry={(containerToUpdate, year, value) =>
						setEntry(containerToUpdate as ResourceDataContainer, year, value)}
					onSave={(containerToSave) => handleSave(containerToSave as ResourceDataContainer)}
				/>
			</div>

			<Sections bind:container {relatedContainers} />
		{/snippet}
	</EditableContainerDetailView>

	<footer class="content-footer bottom-actions-bar">
		<div class="content-actions">
			<RelationButton {container} />
			<CreateAnotherButton {container} {relatedContainers} />
			<CreateCopyButton {container} />
			<DeleteButton {container} {relatedContainers} />
		</div>
	</footer>
{/snippet}

{@render layout(header, main)}
