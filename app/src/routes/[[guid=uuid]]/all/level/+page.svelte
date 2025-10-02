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
		titleForProgramCollection,
		goalsByHierarchyLevel,
		isGoalContainer,
		isProgramContainer,
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
			addItemUrl: $mayCreateContainer(
				payloadTypes.enum.program,
				data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
			)
				? '#create=program'
				: undefined,
			containers: data.containers.filter(isProgramContainer).slice(0, browser ? undefined : 10),
			key: 'programs',
			title: titleForProgramCollection(data.containers.filter(isProgramContainer))
		},
		...Array.from(goals.entries())
			.toSorted()
			.map(([hierarchyLevel, containers]) => ({
				addItemUrl: $mayCreateContainer(
					payloadTypes.enum.goal,
					data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
				)
					? `#create=goal&hierarchyLevel=${hierarchyLevel}`
					: undefined,
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
