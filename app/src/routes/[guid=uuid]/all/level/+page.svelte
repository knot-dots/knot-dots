<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import AllPage from '$lib/components/AllPage.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		titleForGoalCollection,
		containersByHierarchyLevel,
		isContainerWithPayloadType,
		payloadTypes,
		predicates,
		titleForMeasureCollection,
		titleForProgramCollection
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let goals = $derived(
		containersByHierarchyLevel(
			data.containers
				.filter((container) => isContainerWithPayloadType(payloadTypes.enum.goal, container))
				.filter(({ relation }) =>
					relation.every(({ predicate }) => predicate !== predicates.enum['is-part-of-measure'])
				)
		)
	);

	let measuresAndRules = $derived(
		containersByHierarchyLevel(
			data.containers.filter(
				(c) =>
					isContainerWithPayloadType(payloadTypes.enum.measure, c) ||
					isContainerWithPayloadType(payloadTypes.enum.simple_measure, c) ||
					isContainerWithPayloadType(payloadTypes.enum.rule, c)
			)
		)
	);

	const useReport = createFeatureDecisions(page.data.features).useReport();

	let columns = $derived([
		{
			addItemUrl: `#create=program${useReport ? '&create=report' : ''}`,
			containers: data.containers
				.filter(
					(c) =>
						isContainerWithPayloadType(payloadTypes.enum.program, c) ||
						isContainerWithPayloadType(payloadTypes.enum.report, c)
				)
				.slice(0, browser ? undefined : 10),
			key: 'programs',
			title: titleForProgramCollection(
				data.containers.filter((container) =>
					isContainerWithPayloadType(payloadTypes.enum.program, container)
				)
			)
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
							containers.filter((c) => isContainerWithPayloadType(payloadTypes.enum.measure, c)),
							[...measuresAndRules.keys()].length > 1 ? hierarchyLevel : 0
						)
					};
				} else {
					return {
						addItemUrl: `#create=measure&hierarchyLevel=${hierarchyLevel}`,
						containers: containers.slice(0, browser ? undefined : 10),
						key: `implementation-${hierarchyLevel}`,
						title: titleForMeasureCollection(
							containers.filter((c) => isContainerWithPayloadType(payloadTypes.enum.measure, c)),
							hierarchyLevel
						)
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
