<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import {
		audience,
		computeFacetCount,
		payloadTypes,
		policyFieldBNK,
		predicates,
		resolutionStatus,
		strategyTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { resolutionStatusBackgrounds, resolutionStatusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-duplicate-of']
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
</script>

<Layout>
	<Navigation {facets} search slot="header" />

	<svelte:fragment slot="main">
		<Board>
			{#each resolutionStatus.options as statusOption}
				<BoardColumn
					--background={resolutionStatusBackgrounds.get(statusOption)}
					--hover-border-color={resolutionStatusHoverColors.get(statusOption)}
					addItemUrl={$mayCreateContainer(
						payloadTypes.enum.resolution,
						data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
					)
						? `#create=resolution&resolutionStatus=${statusOption}`
						: undefined}
					title={$_(statusOption)}
				>
					<MaybeDragZone
						containers={data.containers.filter(
							(c) => 'resolutionStatus' in c.payload && c.payload.resolutionStatus === statusOption
						)}
					/>
				</BoardColumn>
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
