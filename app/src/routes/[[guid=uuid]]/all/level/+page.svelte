<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import AllPage from '$lib/components/AllPage.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		computeColumnTitleForGoals,
		goalsByHierarchyLevel,
		isGoalContainer,
		isProgramContainer,
		isReportContainer,
		payloadTypes,
		predicates,
		titleForProgramCollection
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let goals = $derived(
		goalsByHierarchyLevel(
			data.containers
				.filter(isGoalContainer)
				.filter(({ relation }) =>
					relation.every(({ predicate }) => predicate !== predicates.enum['is-part-of-measure'])
				)
		)
	);

	$inspect(data.containers);

	const useReport = createFeatureDecisions(page.data.features).useReport();

	let columns = $derived([
		{
			addItemUrl: `#create=program${useReport ? '&create=report' : ''}`,
			containers: data.containers
				.filter((c) => isProgramContainer(c) || isReportContainer(c))
				.slice(0, browser ? undefined : 10),
			key: 'programs',
			title: titleForProgramCollection(data.containers.filter(isProgramContainer))
		},
		...Array.from(goals.entries())
			.toSorted()
			.map(([hierarchyLevel, containers]) => ({
				addItemUrl: `#create=goal&hierarchyLevel=${hierarchyLevel}`,
				containers: containers.slice(0, browser ? undefined : 10),
				key: `goals-${hierarchyLevel}`,
				title: computeColumnTitleForGoals(containers)
			})),
		{
			addItemUrl: '#create=measure&create=rule&create=simple_measure',
			containers: data.containers
				.filter(
					(c) =>
						[
							payloadTypes.enum.measure,
							payloadTypes.enum.rule,
							payloadTypes.enum.simple_measure
						].findIndex((payloadType) => payloadType === c.payload.type) > -1
				)
				.slice(0, browser ? undefined : 10),
			key: 'implementation',
			title: $_('payload_group.implementation')
		}
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
