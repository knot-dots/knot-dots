<script lang="ts">
	import { page } from '$app/state';
	import createColumnBoardPagination from '$lib/client/createColumnBoardPagination.svelte';
	import fetchContainerGroupPage from '$lib/client/fetchContainerGroupPage';
	import AllPage from '$lib/components/AllPage.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import LazyLoadSentinel from '$lib/components/LazyLoadSentinel.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { matchesContainerGroup } from '$lib/containerGroups';
	import {
		type AnyPayload,
		type Container,
		isGoalContainer,
		isMeasureContainer,
		isProgramContainer,
		isTemplateContainer,
		titleForGoalCollection,
		titleForMeasureCollection,
		titleForProgramCollection
	} from '$lib/models';
	import { DEFAULT_PAGE_SIZE } from '$lib/pagination';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import { type AllLevelColumnId, allLevelColumnGroup, createAllLevelQuery } from './query';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const board = createColumnBoardPagination<Container<AnyPayload>, AllLevelColumnId>({
		columnForItem,
		columnIds: () => data.columnIds,
		columns: () => data.columns,
		created: () => $lastCreatedContainers,
		createdFilter: (container) => !isTemplateContainer(container),
		deleted: () => $lastDeletedContainers,
		fetchPage: ({ columnId, offset, signal }) =>
			fetchContainerGroupPage<Container<AnyPayload>>({
				contextGuid: page.params.guid,
				fetch,
				group: allLevelColumnGroup(columnId),
				limit: DEFAULT_PAGE_SIZE,
				offset,
				query: createAllLevelQuery(page.url),
				signal
			}),
		pageSize: DEFAULT_PAGE_SIZE,
		resetKey: () => `${page.url.pathname}?${page.url.searchParams.toString()}`,
		updated: () => $lastUpdatedContainers
	});

	let visibleColumnIds = $derived(
		data.columnIds.filter(
			(columnId) =>
				columnId === 'programs' ||
				columnId === 'goals-1' ||
				columnId === 'implementation-1' ||
				data.columns[columnId].page.total > 0 ||
				board.itemsByColumn(columnId).length > 0
		)
	);

	let visibleGoalColumnCount = $derived(
		visibleColumnIds.filter((columnId) => columnId.startsWith('goals-')).length
	);
	let visibleImplementationColumnCount = $derived(
		visibleColumnIds.filter((columnId) => columnId.startsWith('implementation-')).length
	);

	const columnGroups = $derived(
		data.columnIds.map((columnId) => [columnId, allLevelColumnGroup(columnId)] as const)
	);

	function columnForItem(container: Container<AnyPayload>) {
		return columnGroups.find(([, group]) => matchesContainerGroup(container, group))?.[0];
	}

	function addItemUrl(columnId: AllLevelColumnId) {
		if (columnId === 'programs') {
			return '#create=program&create=report';
		}
		if (columnId.startsWith('goals-')) {
			return `#create=goal&hierarchyLevel=${columnId.substring('goals-'.length)}`;
		}
		const hierarchyLevel = columnId.substring('implementation-'.length);
		return hierarchyLevel === '1'
			? `#create=measure&hierarchyLevel=${hierarchyLevel}&create=simple_measure&create=rule`
			: `#create=measure&hierarchyLevel=${hierarchyLevel}`;
	}

	function title(columnId: AllLevelColumnId, containers: Container<AnyPayload>[]) {
		if (columnId === 'programs') {
			return titleForProgramCollection(containers.filter(isProgramContainer));
		}
		if (columnId.startsWith('goals-')) {
			const hierarchyLevel = Number(columnId.substring('goals-'.length));
			return titleForGoalCollection(
				containers.filter(isGoalContainer),
				visibleGoalColumnCount > 1 ? hierarchyLevel : 0
			);
		}
		const hierarchyLevel = Number(columnId.substring('implementation-'.length));
		return titleForMeasureCollection(
			containers.filter(isMeasureContainer),
			visibleImplementationColumnCount > 1 ? hierarchyLevel : 0
		);
	}
</script>

<AllPage {data}>
	<Board>
		{#each visibleColumnIds as columnId (columnId)}
			{@const containers = board.itemsByColumn(columnId)}
			<BoardColumn addItemUrl={addItemUrl(columnId)} title={title(columnId, containers)}>
				<MaybeDragZone {containers}>
					{#snippet footer()}
						{@const list = board.listByColumn(columnId)}
						{#if list}
							<LazyLoadSentinel
								hasMore={list.hasMore}
								loading={list.loadingMore}
								onLoadMore={list.loadMore}
							/>
						{/if}
					{/snippet}
				</MaybeDragZone>
			</BoardColumn>
		{/each}
	</Board>
	<ContextTabs slug="all-level" />
</AllPage>
