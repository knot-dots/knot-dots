<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Header from '$lib/components/Header.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		audience,
		computeFacetCount,
		measureTypes,
		payloadTypes,
		policyFieldBNK,
		predicates,
		status,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import { statusBackgrounds, statusHoverColors } from '$lib/theme/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	setContext('relationOverlay', {
		enabled: true,
		predicates: [
			predicates.enum['is-consistent-with'],
			predicates.enum['is-equivalent-to'],
			predicates.enum['is-inconsistent-with'],
			predicates.enum['is-prerequisite-for']
		]
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			...((page.url.searchParams.has('related-to')
				? [
						[
							'relationType',
							new Map([
								[predicates.enum['is-consistent-with'], 0],
								[predicates.enum['is-equivalent-to'], 0],
								[predicates.enum['is-inconsistent-with'], 0],
								[predicates.enum['is-prerequisite-for'], 0]
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
			['measureType', new Map(measureTypes.options.map((v) => [v as string, 0]))]
		]);

		return computeFacetCount(facets, data.containers);
	});
</script>

<Layout>
	<Header {facets} search slot="header" />

	<svelte:fragment slot="main">
		<Board>
			{#each status.options as statusOption}
				<BoardColumn
					--background={statusBackgrounds.get(statusOption)}
					--hover-border-color={statusHoverColors.get(statusOption)}
					addItemUrl={$mayCreateContainer(
						payloadTypes.enum.measure,
						data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
					)
						? `#create=measure&status=${statusOption}`
						: undefined}
					title={$_(statusOption)}
				>
					<MaybeDragZone
						containers={data.containers.filter(
							(c) => 'status' in c.payload && c.payload.status === statusOption
						)}
					/>
				</BoardColumn>
			{/each}
		</Board>
	</svelte:fragment>
</Layout>
