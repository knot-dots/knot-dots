<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import {
		titleForProgramCollection,
		type Container,
		findAncestors,
		predicates
	} from '$lib/models';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let knowledgeByLevel = $derived.by(() => {
		let knowledgeByLevel = new SvelteMap<number, Container[]>();

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

	let facets = $derived(data.facets);
</script>

<Layout>
	{#snippet header()}
		<Header {facets} search />
	{/snippet}

	{#snippet main()}
		<Board>
			<BoardColumn title={titleForProgramCollection(data.programs)}>
				<div class="vertical-scroll-wrapper">
					{#each data.programs as container (container.guid)}
						<Card {container} showRelationFilter />
					{/each}
				</div>
			</BoardColumn>

			{#each [...knowledgeByLevel.entries()].toSorted() as [key, value] (key)}
				<BoardColumn
					addItemUrl="#create=knowledge"
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
