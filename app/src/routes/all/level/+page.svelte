<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import AllPage from '$lib/components/AllPage.svelte';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Help from '$lib/components/Help.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		computeColumnTitleForGoals,
		goalsByHierarchyLevel,
		isGoalContainer,
		isStrategyContainer,
		payloadTypes,
		predicates
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
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

	let columns = $derived([
		{
			addItemUrl: '#create=strategy',
			containers: data.containers.filter(isStrategyContainer).slice(0, browser ? undefined : 10),
			key: 'programs',
			title: $_('programs')
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
			addItemUrl: undefined,
			containers: data.containers
				.filter(
					(c) =>
						[
							payloadTypes.enum.measure,
							payloadTypes.enum.resolution,
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
			<BoardColumn
				addItemUrl={column.addItemUrl &&
				$mayCreateContainer(
					payloadTypes.enum.strategy,
					data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
				)
					? column.addItemUrl
					: undefined}
				title={column.title}
			>
				<MaybeDragZone containers={column.containers} />
			</BoardColumn>
		{/each}
	</Board>
	<Help slug="all" />
</AllPage>
