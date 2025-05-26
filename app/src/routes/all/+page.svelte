<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		audience,
		computeColumnTitleForGoals,
		computeFacetCount,
		goalsByHierarchyLevel,
		isGoalContainer,
		isStrategyContainer,
		payloadTypes,
		policyFieldBNK,
		predicates,
		strategyTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['contributes-to']
		]
	});

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

	let facets = $derived.by(() => {
		const facets = new Map([
			...((page.url.searchParams.has('related-to')
				? [
						[
							'relationType',
							new Map([
								[predicates.enum['is-part-of'], 0],
								[predicates.enum['is-consistent-with'], 0],
								[predicates.enum['is-equivalent-to'], 0],
								[predicates.enum['is-inconsistent-with'], 0],
								[predicates.enum['contributes-to'], 0]
							])
						]
					]
				: []) as Array<[string, Map<string, number>]>),
			...((!page.data.currentOrganization.payload.default
				? [['included', new Map()]]
				: []) as Array<[string, Map<string, number>]>),
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['strategyType', new Map(strategyTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(
			facets,
			columns.flatMap(({ containers }) => containers)
		);
	});
</script>

<Layout>
	<Header {facets} search slot="header" />

	<svelte:fragment slot="main">
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

			<Help slug="all" />
		</Board>
	</svelte:fragment>
</Layout>
