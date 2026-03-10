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
		goalStatus,
		containersByHierarchyLevel,
		isGoalContainer,
		isProgramContainer,
		isTaskContainer,
		type Container,
		indicatorCategories,
		indicatorTypes,
		measureTypes,
		paramsFromFragment,
		isPayloadType,
		payloadTypes,
		policyFieldBNK,
		programStatus,
		programTypes,
		ruleStatus,
		status,
		sustainableDevelopmentGoals,
		taskStatus,
		taskCategories,
		titleForGoalCollection,
		titleForProgramCollection,
		topics,
		type WorkspaceContainer,
		type PayloadType
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
		sdg: activeParams.getAll('sdg'),
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

	const customCategoryKeys = $derived.by(() => {
		if (!categoryOptions) return [];
		return Object.keys(categoryOptions).filter((key) => key !== '__categoryLabels__');
	});

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
		const sdgValues = Array.isArray(rawFilters.sdg)
			? rawFilters.sdg
			: Array.isArray(rawFilters.category)
				? rawFilters.category
				: [];
		const customCategories =
			rawFilters.category &&
			typeof rawFilters.category === 'object' &&
			!Array.isArray(rawFilters.category)
				? (rawFilters.category as Record<string, unknown>)
				: {};
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
		appendAll('sdg', sdgValues);
		appendAll('indicatorCategory', rawFilters.indicatorCategory);
		appendAll('indicatorType', rawFilters.indicatorType);
		appendAll('measureType', rawFilters.measureType);
		appendAll('policyFieldBNK', rawFilters.policyFieldBNK);
		appendAll('programType', rawFilters.programType);
		appendAll('taskCategory', rawFilters.taskCategory);
		appendAll('topic', rawFilters.topic);

		for (const [key, value] of Object.entries(customCategories)) {
			appendAll(key, value);
		}

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

	const normalizeValues = (values: unknown): string[] =>
		Array.isArray(values) ? values.map((value) => String(value)).filter(Boolean) : [];

	const categoryValueFor = (payload: Record<string, unknown>, key: string) => {
		const category = payload.category;
		if (!category || typeof category !== 'object' || Array.isArray(category)) return undefined;
		return (category as Record<string, unknown>)[key];
	};

	const matchesFilter = (values: string[], field: unknown) => {
		if (!values.length) return true;
		if (Array.isArray(field)) {
			const fieldValues = field.map((value) => String(value));
			return values.some((value) => fieldValues.includes(String(value)));
		}
		if (field === undefined || field === null) return false;
		return values.includes(String(field));
	};

	const hiddenKeys = $derived.by(() => {
		const keys = new SvelteSet<string>();
		const rawFilters = savedFilters;
		const sdgValues = Array.isArray((rawFilters as { sdg?: unknown }).sdg)
			? (rawFilters as { sdg: unknown[] }).sdg
			: Array.isArray((rawFilters as { category?: unknown }).category)
				? (rawFilters as { category: unknown[] }).category
				: [];
		const customCategories =
			rawFilters.category &&
			typeof rawFilters.category === 'object' &&
			!Array.isArray(rawFilters.category)
				? (rawFilters.category as Record<string, unknown>)
				: {};
		const filters = {
			audience: Array.isArray(rawFilters.audience) ? rawFilters.audience : [],
			sdg: sdgValues,
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
		if (filters.sdg.length) keys.add('sdg');
		if (filters.indicatorCategory.length) keys.add('indicatorCategory');
		if (filters.indicatorType.length) keys.add('indicatorType');
		if (filters.measureType.length) keys.add('measureType');
		if (filters.payloadType.length) keys.add('payloadType');
		if (filters.policyFieldBNK.length) keys.add('policyFieldBNK');
		if (filters.programType.length) keys.add('programType');
		if (filters.taskCategory.length) keys.add('taskCategory');
		if (filters.topic.length) keys.add('topic');
		for (const [key, value] of Object.entries(customCategories)) {
			if (Array.isArray(value) && value.length) {
				keys.add(key);
			}
		}

		return keys;
	});

	const payloadTypeOptions = $derived.by(() =>
		Array.from(new Set(containers.map((item) => item.payload.type)))
			.filter(Boolean)
			.filter((type) => type !== payloadTypes.enum.workspace)
	);

	const resolvedPayloadTypes = $derived.by(() => {
		if (activeFilters.payloadType.length) return activeFilters.payloadType;
		const raw = savedFilters.payloadType;
		return Array.isArray(raw) ? raw.map((value) => String(value)).filter(Boolean) : [];
	});

	const payloadTypeValues = payloadTypes.options as readonly string[];
	const payloadTypeSet = new Set(payloadTypeValues);
	const resolvedPayloadTypeValues = $derived.by(() =>
		resolvedPayloadTypes
			.filter((value) => payloadTypeSet.has(value))
			.filter((value): value is PayloadType => isPayloadType(value))
			.filter((value) => value !== payloadTypes.enum.undefined)
	);

	const resolvedFilters = $derived.by(() => {
		const rawFilters = savedFilters as Record<string, unknown>;
		const sdgValues = Array.isArray(rawFilters.sdg)
			? rawFilters.sdg
			: Array.isArray(rawFilters.category)
				? rawFilters.category
				: [];
		const savedCustomCategories =
			rawFilters.category &&
			typeof rawFilters.category === 'object' &&
			!Array.isArray(rawFilters.category)
				? (rawFilters.category as Record<string, unknown>)
				: {};

		const resolveArray = (active: string[], saved: unknown) =>
			active.length ? active : normalizeValues(saved);

		const customCategories: Record<string, string[]> = {};
		for (const key of customCategoryKeys) {
			const activeValues = activeParams.getAll(key).filter(Boolean);
			const values = activeValues.length
				? activeValues
				: normalizeValues(savedCustomCategories[key]);
			if (values.length) {
				customCategories[key] = values;
			}
		}

		return {
			audience: resolveArray(activeFilters.audience, rawFilters.audience),
			sdg: resolveArray(activeFilters.sdg, sdgValues),
			indicatorCategory: resolveArray(
				activeFilters.indicatorCategory,
				rawFilters.indicatorCategory
			),
			indicatorType: resolveArray(activeFilters.indicatorType, rawFilters.indicatorType),
			measureType: resolveArray(activeFilters.measureType, rawFilters.measureType),
			policyFieldBNK: resolveArray(activeFilters.policyFieldBNK, rawFilters.policyFieldBNK),
			programType: resolveArray(activeFilters.programType, rawFilters.programType),
			taskCategory: resolveArray(activeFilters.taskCategory, rawFilters.taskCategory),
			topic: resolveArray(activeFilters.topic, rawFilters.topic),
			terms: activeFilters.terms || (typeof rawFilters.terms === 'string' ? rawFilters.terms : ''),
			customCategories
		};
	});

	const useCategoryFields = $derived.by(() => new Set(customCategoryKeys));

	const filteredContainers = $derived.by(() =>
		containers.filter((container) => {
			const payload = container.payload as Record<string, unknown>;
			const audienceValues = useCategoryFields.has('audience')
				? categoryValueFor(payload, 'audience')
				: payload.audience;
			const sdgValues = useCategoryFields.has('sdg')
				? categoryValueFor(payload, 'sdg')
				: payload.sdg;
			const topicValues = useCategoryFields.has('topic')
				? categoryValueFor(payload, 'topic')
				: payload.topic;
			const policyFieldValues = useCategoryFields.has('policyFieldBNK')
				? categoryValueFor(payload, 'policyFieldBNK')
				: payload.policyFieldBNK;

			if (!matchesFilter(resolvedFilters.audience, audienceValues)) return false;
			if (!matchesFilter(resolvedFilters.sdg, sdgValues)) return false;
			if (!matchesFilter(resolvedFilters.topic, topicValues)) return false;
			if (!matchesFilter(resolvedFilters.policyFieldBNK, policyFieldValues)) return false;
			if (!matchesFilter(resolvedFilters.indicatorCategory, payload.indicatorCategory))
				return false;
			if (!matchesFilter(resolvedFilters.indicatorType, payload.indicatorType)) return false;
			if (!matchesFilter(resolvedFilters.measureType, payload.measureType)) return false;
			if (!matchesFilter(resolvedFilters.programType, payload.programType)) return false;
			if (!matchesFilter(resolvedFilters.taskCategory, payload.taskCategory)) return false;
			if (resolvedPayloadTypeValues.length) {
				const payloadType = payload.type;
				if (!isPayloadType(payloadType) || payloadType === payloadTypes.enum.undefined) {
					return false;
				}
				if (!resolvedPayloadTypeValues.includes(payloadType)) return false;
			}

			for (const [key, values] of Object.entries(resolvedFilters.customCategories)) {
				if (!matchesFilter(values, categoryValueFor(payload, key))) return false;
			}

			return true;
		})
	);

	type MeasurePayload = typeof payloadTypes.enum.measure | typeof payloadTypes.enum.simple_measure;
	const measurePayloadTypes = new Set<MeasurePayload>([
		payloadTypes.enum.measure,
		payloadTypes.enum.simple_measure
	]);
	const isMeasurePayload = (value: PayloadType): value is MeasurePayload =>
		measurePayloadTypes.has(value as MeasurePayload);

	type LevelPayload =
		| typeof payloadTypes.enum.program
		| typeof payloadTypes.enum.goal
		| typeof payloadTypes.enum.measure
		| typeof payloadTypes.enum.rule
		| typeof payloadTypes.enum.simple_measure;
	const levelPayloadTypes = new Set<LevelPayload>([
		payloadTypes.enum.program,
		payloadTypes.enum.goal,
		payloadTypes.enum.measure,
		payloadTypes.enum.rule,
		payloadTypes.enum.simple_measure
	]);
	const isLevelPayload = (value: PayloadType): value is LevelPayload =>
		levelPayloadTypes.has(value as LevelPayload);

	const catalogPayloadTypes = $derived.by(() => {
		const values = resolvedPayloadTypes.length ? resolvedPayloadTypes : payloadTypeOptions;
		return values.filter((value) =>
			payloadTypeSet.has(value)
		) as (typeof payloadTypes.enum)[keyof typeof payloadTypes.enum][];
	});

	const statusType = $derived.by(() => {
		if (resolvedPayloadTypeValues.length === 1) return resolvedPayloadTypeValues[0];
		if (!resolvedPayloadTypeValues.length) return undefined;
		const onlyMeasures = resolvedPayloadTypeValues.every(isMeasurePayload);
		return onlyMeasures ? payloadTypes.enum.measure : undefined;
	});

	const goalsByLevel = $derived.by(() =>
		containersByHierarchyLevel(filteredContainers.filter(isGoalContainer))
	);

	const programContainers = $derived.by(() => filteredContainers.filter(isProgramContainer));
	const implementationContainers = $derived.by(() =>
		filteredContainers.filter(
			(c) =>
				c.payload.type === payloadTypes.enum.measure ||
				c.payload.type === payloadTypes.enum.rule ||
				c.payload.type === payloadTypes.enum.simple_measure
		)
	);

	const showLevelView = $derived.by(() => {
		if (selectedView !== 'level') return false;
		if (!resolvedPayloadTypes.length) return true;
		return resolvedPayloadTypeValues.some(isLevelPayload);
	});

	const localFacets = $derived.by(() => {
		const base = new Map<string, Map<string, number>>([
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['sdg', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
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

<Header
	{facets}
	{facetLabels}
	{categoryOptions}
	search
	showSaveWorkspace
	savePayloadType={payloadTypeOptions}
/>

<div class="content-details">
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
			{#if programContainers.length}
				<BoardColumn title={titleForProgramCollection(programContainers)}>
					<MaybeDragZone containers={programContainers} />
				</BoardColumn>
			{/if}
			{#each Array.from(goalsByLevel.entries()).toSorted() as [hierarchyLevel, items] (hierarchyLevel)}
				<BoardColumn
					title={titleForGoalCollection(
						items,
						Array.from(goalsByLevel.keys()).length > 1 ? hierarchyLevel : 0
					)}
				>
					<MaybeDragZone containers={items} />
				</BoardColumn>
			{/each}
			{#if implementationContainers.length}
				<BoardColumn title={$_('payload_group.implementation')}>
					<MaybeDragZone containers={implementationContainers} />
				</BoardColumn>
			{/if}
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
	.content-details {
		padding-top: 1rem;
	}
</style>
