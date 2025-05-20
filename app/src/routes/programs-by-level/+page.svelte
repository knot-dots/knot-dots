<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		audience,
		computeFacetCount,
		levels,
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
			predicates.enum['is-superordinate-of']
		]
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			['audience', new Map(audience.options.map((v) => [v as string, 0]))],
			['category', new Map(sustainableDevelopmentGoals.options.map((v) => [v as string, 0]))],
			['topic', new Map(topics.options.map((v) => [v as string, 0]))],
			['policyFieldBNK', new Map(policyFieldBNK.options.map((v) => [v as string, 0]))],
			['strategyType', new Map(strategyTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, data.containers);
	});

	setContext('facets', () => facets);
</script>

<Layout>
	<svelte:fragment slot="main">
		<Board>
			{#each levels.options.filter((l) => l !== levels.enum['level.regional']) as levelOption}
				<BoardColumn
					addItemUrl={$mayCreateContainer(
						payloadTypes.enum.strategy,
						data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
					)
						? `#create=strategy&level=${levelOption}`
						: undefined}
					title={$_(levelOption)}
				>
					<MaybeDragZone
						containers={data.containers.filter(
							(c) => 'level' in c.payload && c.payload.level === levelOption
						)}
					/>
				</BoardColumn>
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
