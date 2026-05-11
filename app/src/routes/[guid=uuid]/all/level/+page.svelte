<script lang="ts">
	import { browser } from '$app/environment';
	import AllPage from '$lib/components/AllPage.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		containersByHierarchyLevel,
		isGoalContainer,
		isMeasureContainer,
		isProgramContainer,
		isReportContainer,
		isRuleContainer,
		isSimpleMeasureContainer,
		predicates,
		titleForGoalCollection,
		titleForMeasureCollection,
		titleForProgramCollection
	} from '$lib/models';
	import withOptimistic from '$lib/client/withOptimistic';
	import { lastCreatedContainer, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let containers = $derived(
		withOptimistic(data.containers, $lastCreatedContainer, $lastUpdatedContainers)
	);

	let goals = $derived(
		containersByHierarchyLevel(
			containers
				.filter(isGoalContainer)
				.filter(({ relation }) =>
					relation.every(({ predicate }) => predicate !== predicates.enum['is-part-of-measure'])
				)
		)
	);

	let measuresAndRules = $derived(
		containersByHierarchyLevel(
			containers.filter(
				(c) => isMeasureContainer(c) || isSimpleMeasureContainer(c) || isRuleContainer(c)
			)
		)
	);

	let columns = $derived([
		{
			addItemUrl: '#create=program&create=report',
			containers: containers
				.filter((c) => isProgramContainer(c) || isReportContainer(c))
				.slice(0, browser ? undefined : 10),
			key: 'programs',
			title: titleForProgramCollection(containers.filter(isProgramContainer))
		},
		...Array.from(goals.entries())
			.toSorted()
			.map(([hierarchyLevel, containers]) => ({
				addItemUrl: `#create=goal&hierarchyLevel=${hierarchyLevel}`,
				containers: containers.slice(0, browser ? undefined : 10),
				key: `goals-${hierarchyLevel}`,
				title: titleForGoalCollection(containers, [...goals.keys()].length > 1 ? hierarchyLevel : 0)
			})),
		...Array.from(measuresAndRules.entries())
			.toSorted()
			.map(([hierarchyLevel, containers]) => {
				if (hierarchyLevel === 1) {
					return {
						addItemUrl: `#create=measure&hierarchyLevel=${hierarchyLevel}&create=simple_measure&create=rule`,
						containers: containers.slice(0, browser ? undefined : 10),
						key: `implementation-${hierarchyLevel}`,
						title: titleForMeasureCollection(
							containers.filter(isMeasureContainer),
							[...measuresAndRules.keys()].length > 1 ? hierarchyLevel : 0
						)
					};
				} else {
					return {
						addItemUrl: `#create=measure&hierarchyLevel=${hierarchyLevel}`,
						containers: containers.slice(0, browser ? undefined : 10),
						key: `implementation-${hierarchyLevel}`,
						title: titleForMeasureCollection(containers.filter(isMeasureContainer), hierarchyLevel)
					};
				}
			})
	]);
</script>

<AllPage {data}>
	<Board>
		{#each columns as column (column.key)}
			<BoardColumn addItemUrl={column.addItemUrl} title={column.title}>
				<MaybeDragZone containers={column.containers} />
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="all-level" />
</AllPage>
