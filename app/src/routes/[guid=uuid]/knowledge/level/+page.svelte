<script lang="ts">
	import { _ } from 'svelte-i18n';
	import withOptimistic from '$lib/client/withOptimistic';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import {
		type AnyPayload,
		type Container,
		findAncestors,
		predicates,
		titleForProgramCollection
	} from '$lib/models';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let containers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers
		)
	);
	let knowledgeByLevel = $derived.by(() => {
		let knowledgeByLevel = new Map<number, Container<AnyPayload>[]>();

		for (const container of containers) {
			const ancestors = findAncestors(container, containers, [predicates.enum['is-part-of']]);
			const level = ancestors.length;

			if (knowledgeByLevel.has(level)) {
				knowledgeByLevel.set(level, [
					...(knowledgeByLevel.get(level) as Container<AnyPayload>[]),
					container
				]);
			} else {
				knowledgeByLevel.set(level, [container]);
			}
		}

		return knowledgeByLevel;
	});

	let facets = $derived(data.facets);
</script>

<PageLayout>
	<FullscreenLayout>
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

			<ContextTabs slug="knowledge-level" />
		{/snippet}
	</FullscreenLayout>
</PageLayout>
