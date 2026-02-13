<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Catalog from '$lib/components/Catalog.svelte';
	import DeleteButton from '$lib/components/DeleteButton.svelte';
	import Header from '$lib/components/Header.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import Table from '$lib/components/Table.svelte';
	import TaskBoardColumn from '$lib/components/TaskBoardColumn.svelte';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import { page } from '$app/state';
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		audience,
		computeFacetCount,
		computeColumnTitleForGoals,
		goalStatus,
		goalsByHierarchyLevel,
		isGoalContainer,
		isProgramContainer,
		isTaskContainer,
		type Container,
		indicatorCategories,
		indicatorTypes,
		measureTypes,
		paramsFromFragment,
		payloadTypes,
		policyFieldBNK,
		programStatus,
		programTypes,
		ruleStatus,
		status,
		sustainableDevelopmentGoals,
		taskStatus,
		taskCategories,
		titleForProgramCollection,
		topics,
		type WorkspaceContainer
	} from '$lib/models';
	import type { CategoryOptions } from '$lib/client/categoryOptions';

	interface Props {
		container: WorkspaceContainer;
		containers: Container[];
		facets?: Map<string, Map<string, number>>;
		facetLabels?: Map<string, string>;
		categoryOptions?: CategoryOptions | null;
	}

	let {
		container,
		containers = [],
		facets: loaderFacets,
		facetLabels,
		categoryOptions = null
	}: Props = $props();

	const activeParams = $derived.by(() => paramsFromFragment(page.url));

	const activeFilters = $derived.by(() => ({
		audience: activeParams.getAll('audience'),
		category: activeParams.getAll('category'),
		indicatorCategory: activeParams.getAll('indicatorCategory'),
		indicatorType: activeParams.getAll('indicatorType'),
		measureType: activeParams.getAll('measureType'),
		payloadType: activeParams.getAll('payloadType'),
		policyFieldBNK: activeParams.getAll('policyFieldBNK'),
		programType: activeParams.getAll('programType'),
		taskCategory: activeParams.getAll('taskCategory'),
		terms: activeParams.get('terms') ?? '',
		topic: activeParams.getAll('topic'),
		view: activeParams.get('view') ?? '',
		sort: activeParams.get('sort') ?? ''
	}));

	const savedFilters = $derived.by(
		() => (container.payload.filters ?? {}) as Record<string, unknown>
	);

	const selectedView = $derived.by(() => {
		const fromParams = activeFilters.view;
		if (
			fromParams === 'catalog' ||
			fromParams === 'table' ||
			fromParams === 'level' ||
			fromParams === 'status'
		) {
			return fromParams;
		}
		const fromSaved = savedFilters.view;
		if (
			fromSaved === 'catalog' ||
			fromSaved === 'table' ||
			fromSaved === 'level' ||
			fromSaved === 'status'
		) {
			return fromSaved;
		}
		return 'catalog';
	});

	const createFilterParams = $derived.by(() => {
		const rawFilters = savedFilters as Record<string, unknown>;
		const params = new SvelteURLSearchParams();
		const appendAll = (key: string, values: unknown) => {
			if (!Array.isArray(values)) return;
			values.forEach((value) => {
				if (value !== undefined && value !== null && `${value}` !== '') {
					params.append(key, String(value));
				}
			});
		};

		appendAll('audience', rawFilters.audience);
		appendAll('category', rawFilters.category);
		appendAll('indicatorCategory', rawFilters.indicatorCategory);
		appendAll('indicatorType', rawFilters.indicatorType);
		appendAll('measureType', rawFilters.measureType);
		appendAll('policyFieldBNK', rawFilters.policyFieldBNK);
		appendAll('programType', rawFilters.programType);
		appendAll('taskCategory', rawFilters.taskCategory);
		appendAll('topic', rawFilters.topic);

		return params;
	});

	function buildCreateUrl(payloadType: string, extraParams: Record<string, string> = {}) {
		const params = new SvelteURLSearchParams(createFilterParams);
		params.append('create', payloadType);
		for (const [key, value] of Object.entries(extraParams)) {
			params.set(key, value);
		}
		return `#${params.toString()}`;
	}

	const filteredContainers = $derived.by(() => containers);

	const hiddenKeys = $derived.by(() => {
		const keys = new SvelteSet<string>();
		const rawFilters = savedFilters;
		const filters = {
			audience: Array.isArray(rawFilters.audience) ? rawFilters.audience : [],
			category: Array.isArray(rawFilters.category) ? rawFilters.category : [],
			indicatorCategory: Array.isArray(rawFilters.indicatorCategory)
				? rawFilters.indicatorCategory
				: [],
			indicatorType: Array.isArray(rawFilters.indicatorType) ? rawFilters.indicatorType : [],
			measureType: Array.isArray(rawFilters.measureType) ? rawFilters.measureType : [],
			payloadType: Array.isArray(rawFilters.payloadType) ? rawFilters.payloadType : [],
			policyFieldBNK: Array.isArray(rawFilters.policyFieldBNK) ? rawFilters.policyFieldBNK : [],
			programType: Array.isArray(rawFilters.programType) ? rawFilters.programType : [],
			taskCategory: Array.isArray(rawFilters.taskCategory) ? rawFilters.taskCategory : [],
			topic: Array.isArray(rawFilters.topic) ? rawFilters.topic : []
		};

		if (filters.audience.length) keys.add('audience');
		if (filters.category.length) keys.add('category');
		if (filters.indicatorCategory.length) keys.add('indicatorCategory');
		if (filters.indicatorType.length) keys.add('indicatorType');
		if (filters.measureType.length) keys.add('measureType');
		if (filters.payloadType.length) keys.add('payloadType');
		if (filters.policyFieldBNK.length) keys.add('policyFieldBNK');
		if (filters.programType.length) keys.add('programType');
		if (filters.taskCategory.length) keys.add('taskCategory');
		if (filters.topic.length) keys.add('topic');

		return keys;
	});

	const payloadTypeOptions = $derived.by(() =>
		Array.from(new Set(containers.map((item) => item.payload.type))).filter(Boolean)
	);

	const resolvedPayloadTypes = $derived.by(() => {
		if (activeFilters.payloadType.length) return activeFilters.payloadType;
		const raw = savedFilters.payloadType;
		return Array.isArray(raw) ? raw.map((value) => String(value)).filter(Boolean) : [];
	});

	const payloadTypeValues = payloadTypes.options as readonly string[];
	const payloadTypeSet = new Set(payloadTypeValues);

	const catalogPayloadTypes = $derived.by(() => {
		const values = resolvedPayloadTypes.length ? resolvedPayloadTypes : payloadTypeOptions;
		return values.filter((value) =>
			payloadTypeSet.has(value)
		) as (typeof payloadTypes.enum)[keyof typeof payloadTypes.enum][];
	});

	const statusType = $derived.by(() => {
		if (resolvedPayloadTypes.length === 1) return resolvedPayloadTypes[0];
		if (!resolvedPayloadTypes.length) return undefined;
		const allowed = new Set([payloadTypes.enum.measure, payloadTypes.enum.simple_measure]);
		const onlyMeasures = resolvedPayloadTypes.every((value) => allowed.has(value));
		return onlyMeasures ? payloadTypes.enum.measure : undefined;
	});

	const goalsByLevel = $derived.by(() =>
		goalsByHierarchyLevel(filteredContainers.filter(isGoalContainer))
	);

	const programContainers = $derived.by(() => filteredContainers.filter(isProgramContainer));

	const showLevelView = $derived.by(() => {
		if (selectedView !== 'level') return false;
		if (!resolvedPayloadTypes.length) return true;
		return resolvedPayloadTypes.some((value) =>
			[
				payloadTypes.enum.program,
				payloadTypes.enum.goal,
				payloadTypes.enum.measure,
				payloadTypes.enum.rule,
				payloadTypes.enum.simple_measure
			].includes(value)
		);
	});

	const localFacets = $derived.by(() => {
		const base = new Map<string, Map<string, number>>([
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['payloadType', new Map(payloadTypeOptions.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['indicatorCategory', new Map(indicatorCategories.options.map((v) => [v as string, 0]))],
			['indicatorType', new Map(indicatorTypes.options.map((v) => [v as string, 0]))],
			['programType', new Map(programTypes.options.map((v) => [v as string, 0]))],
			['taskCategory', new Map(taskCategories.options.map((v) => [v as string, 0]))],
			['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))]
		]);

		const counts = computeFacetCount(base, filteredContainers);
		for (const key of hiddenKeys) {
			counts.delete(key);
		}
		return counts;
	});

	const facets = $derived.by(() => {
		const source = loaderFacets ?? localFacets;
		if (!hiddenKeys.size) return source;
		const filtered = new Map(source);
		for (const key of hiddenKeys) {
			filtered.delete(key);
		}
		return filtered;
	});
</script>

<Header {facets} {facetLabels} {categoryOptions} search />

<div class="content-details">
	{#if container.payload.description}
		<p class="workspace-description">{container.payload.description}</p>
	{/if}
	{#if selectedView === 'table'}
		<Table
			columns={[
				{ heading: $_('title'), key: 'title' },
				{ heading: $_('object'), key: 'type' },
				{ heading: $_('description'), key: 'description' },
				{ heading: $_('visibility.label'), key: 'visibility' },
				{ heading: $_('status'), key: 'status' },
				{ heading: $_('category'), key: 'category' },
				{ heading: $_('topic'), key: 'topic' },
				{ heading: $_('policy_field_bnk'), key: 'policyFieldBNK' },
				{ heading: $_('audience'), key: 'audience' },
				{ heading: $_('fulfillment_date'), key: 'fulfillmentDate' },
				{ heading: $_('planned_duration'), key: 'duration' },
				{ heading: $_('editorial_state'), key: 'editorialState' },
				{ heading: $_('organizational_unit'), key: 'organizationalUnit' },
				{ heading: $_('goal.hierarchy_level'), key: 'hierarchyLevel' },
				{ heading: $_('type'), key: 'objectType' }
			]}
			rows={filteredContainers}
		/>
	{:else if showLevelView}
		<Board>
			<BoardColumn title={titleForProgramCollection(programContainers)}>
				<MaybeDragZone containers={programContainers} />
			</BoardColumn>
			{#each Array.from(goalsByLevel.entries()).toSorted() as [hierarchyLevel, items] (hierarchyLevel)}
				<BoardColumn title={computeColumnTitleForGoals(items)}>
					<MaybeDragZone containers={items} />
				</BoardColumn>
			{/each}
			<BoardColumn title={$_('payload_group.implementation')}>
				<MaybeDragZone
					containers={filteredContainers.filter(
						(c) =>
							c.payload.type === payloadTypes.enum.measure ||
							c.payload.type === payloadTypes.enum.rule ||
							c.payload.type === payloadTypes.enum.simple_measure
					)}
				/>
			</BoardColumn>
		</Board>
	{:else if selectedView === 'status'}
		{#if statusType === payloadTypes.enum.task}
			<Board>
				{#each taskStatus.options as taskStatusOption (taskStatusOption)}
					<TaskBoardColumn
						addItemUrl={buildCreateUrl(payloadTypes.enum.task, {
							taskStatus: taskStatusOption
						})}
						items={filteredContainers
							.filter(isTaskContainer)
							.filter(({ payload }) => payload.taskStatus === taskStatusOption)}
						status={taskStatusOption}
					>
						{#snippet itemSnippet(container)}
							<TaskCard {container} />
						{/snippet}
					</TaskBoardColumn>
				{/each}
			</Board>
		{:else if statusType === payloadTypes.enum.goal}
			<Board>
				{#each goalStatus.options as statusOption (statusOption)}
					<BoardColumn
						addItemUrl={buildCreateUrl(payloadTypes.enum.goal, { goalStatus: statusOption })}
						title={$_(statusOption)}
					>
						<MaybeDragZone
							containers={filteredContainers.filter(
								(c) => 'goalStatus' in c.payload && c.payload.goalStatus === statusOption
							)}
						/>
					</BoardColumn>
				{/each}
			</Board>
		{:else if statusType === payloadTypes.enum.program}
			<Board>
				{#each programStatus.options as statusOption (statusOption)}
					<BoardColumn
						addItemUrl={buildCreateUrl(payloadTypes.enum.program, {
							programStatus: statusOption
						})}
						title={$_(statusOption)}
					>
						<MaybeDragZone
							containers={filteredContainers.filter(
								(c) => 'programStatus' in c.payload && c.payload.programStatus === statusOption
							)}
						/>
					</BoardColumn>
				{/each}
			</Board>
		{:else if statusType === payloadTypes.enum.rule}
			<Board>
				{#each ruleStatus.options as statusOption (statusOption)}
					<BoardColumn
						addItemUrl={buildCreateUrl(payloadTypes.enum.rule, { ruleStatus: statusOption })}
						title={$_(statusOption)}
					>
						<MaybeDragZone
							containers={filteredContainers.filter(
								(c) => 'ruleStatus' in c.payload && c.payload.ruleStatus === statusOption
							)}
						/>
					</BoardColumn>
				{/each}
			</Board>
		{:else if statusType === payloadTypes.enum.measure || statusType === payloadTypes.enum.simple_measure}
			<Board>
				{#each status.options as statusOption (statusOption)}
					<BoardColumn
						addItemUrl={buildCreateUrl(payloadTypes.enum.measure, { status: statusOption })}
						title={$_(statusOption)}
					>
						<MaybeDragZone
							containers={filteredContainers.filter(
								(c) => 'status' in c.payload && c.payload.status === statusOption
							)}
						/>
					</BoardColumn>
				{/each}
			</Board>
		{/if}
	{:else}
		<Catalog
			containers={filteredContainers}
			payloadType={catalogPayloadTypes}
			createParams={createFilterParams}
		/>
	{/if}
</div>

<footer class="content-footer bottom-actions-bar">
	<div class="content-actions">
		<DeleteButton {container} relatedContainers={[]} />
	</div>
</footer>

<style>
	.workspace-description {
		color: var(--color-gray-700);
		margin: 0.5rem 1.5rem 1rem;
	}

	.content-details {
		padding-top: 1rem;
	}
</style>
