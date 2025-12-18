<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import {
		audience,
		titleForProgramCollection,
		computeFacetCount,
		type Container,
		findAncestors,
		fromCounts,
		payloadTypes,
		policyFieldBNK,
		predicates,
		programTypes,
		sustainableDevelopmentGoals,
		topics
	} from '$lib/models';
	import { mayCreateContainer } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let knowledgeByLevel = $derived.by(() => {
		let knowledgeByLevel = new Map<number, Container[]>();

		for (const container of data.containers) {
			const ancestors = findAncestors(container, data.containers, [predicates.enum['is-part-of']]);
			const level = ancestors.length;

			if (knowledgeByLevel.has(level)) {
				knowledgeByLevel.set(level, [...(knowledgeByLevel.get(level) as Container[]), container]);
			} else {
				knowledgeByLevel.set(level, [container]);
			}
		}

		return knowledgeByLevel;
	});

	let facets = $derived.by(() => {
		const facets = new Map([
			['audience', fromCounts(audience.options, data.facets.audience)],
			['category', fromCounts(sustainableDevelopmentGoals.options, data.facets.category)],
			['topic', fromCounts(topics.options, data.facets.topic)],
			['policyFieldBNK', fromCounts(policyFieldBNK.options, data.facets.policyFieldBNK)],
			['programType', fromCounts(programTypes.options, data.facets.programType)]
		]);

		if (Object.keys(data.facets).length === 0) {
			return computeFacetCount(facets, [...data.containers, ...data.programs]);
		}

		return facets;
	});
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		<Board>
			<BoardColumn title={titleForProgramCollection(data.programs)}>
				<div class="vertical-scroll-wrapper masked-overflow">
					{#each data.programs as container (container.guid)}
						<Card {container} showRelationFilter />
					{/each}
				</div>
			</BoardColumn>

			{#each [...knowledgeByLevel.entries()].toSorted() as [key, value] (key)}
				<BoardColumn
					addItemUrl={$mayCreateContainer(
						payloadTypes.enum.knowledge,
						data.currentOrganizationalUnit?.guid ?? data.currentOrganization.guid
					)
						? '#create=knowledge'
						: undefined}
					title={$_('knowledge.level', { values: { level: key + 1 } })}
				>
					<MaybeDragZone containers={value}>
						{#snippet itemSnippet(container)}
							<Card {container} showRelationFilter />
						{/snippet}
					</MaybeDragZone>
				</BoardColumn>
			{/each}
		</Board>

		<Help slug="knowledge-level" />
	{/snippet}
</Layout>
