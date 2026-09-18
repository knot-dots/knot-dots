<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import withOptimistic from '$lib/client/withOptimistic';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import BulkActionContextProvider from '$lib/components/BulkActionContextProvider.svelte';
	import Card from '$lib/components/Card.svelte';
	import ContextTabs from '$lib/components/ContextTabs.svelte';
	import FullscreenLayout from '$lib/components/FullscreenLayout.svelte';
	import Header from '$lib/components/Header.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import PageLayout from '$lib/components/PageLayout.svelte';
	import {
		type Container,
		findAncestors,
		findDescendants,
		isCategoryContainer,
		isTermContainer,
		predicates,
		type TermPayload
	} from '$lib/models';
	import { lastCreatedContainers, lastDeletedContainers, lastUpdatedContainers } from '$lib/stores';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let allContainers = $derived(
		withOptimistic(
			data.containers,
			$lastCreatedContainers,
			$lastDeletedContainers,
			$lastUpdatedContainers,
			isCategoryContainer
		)
	);

	setContext('relationOverlay', {
		enabled: true,
		predicates: [predicates.enum['is-equivalent-to'], predicates.enum['implies']]
	});

	let containers = $derived.by(() => {
		let containers = new Set<Container>();

		if (page.url.searchParams.has('related-to')) {
			const selectedContainer = allContainers.find(
				({ guid }) => guid === page.url.searchParams.get('related-to')
			);

			if (selectedContainer) {
				containers = new Set([
					selectedContainer,
					...findAncestors(selectedContainer, allContainers, [
						predicates.enum['is-part-of'],
						predicates.enum['is-part-of-category']
					]),
					...findDescendants(selectedContainer, allContainers, [
						predicates.enum['is-part-of'],
						predicates.enum['is-part-of-category']
					]),
					...allContainers.filter(({ relation }) =>
						relation.some(
							({ object, predicate, subject }) =>
								(predicate === predicates.enum['implies'] ||
									predicate === predicates.enum['is-equivalent-to']) &&
								(object == selectedContainer.guid || subject == selectedContainer.guid)
						)
					)
				]);
			}
		} else {
			containers = new Set(allContainers);
		}

		return containers;
	});

	const categories = $derived(
		allContainers.filter(isCategoryContainer).filter((c) => containers.has(c))
	);

	const { terms, subterms } = $derived(
		allContainers
			.filter(isTermContainer)
			.filter((t) => containers.has(t))
			.reduce(
				(result, term) => {
					const hasParentTerm = term.relation.some(
						({ predicate, subject, object }) =>
							predicate === predicates.enum['is-part-of'] &&
							subject === term.guid &&
							object !== term.guid
					);

					if (hasParentTerm) {
						result.subterms.push(term);
					} else {
						result.terms.push(term);
					}

					return result;
				},
				{ terms: [] as Container<TermPayload>[], subterms: [] as Container<TermPayload>[] }
			)
	);
</script>

<PageLayout>
	<BulkActionContextProvider actions={['visibility', 'delete']}>
		<FullscreenLayout>
			{#snippet header()}
				<Header search />
			{/snippet}

			{#snippet main()}
				<Board>
					<BoardColumn addItemUrl="#create=category" title={$_('categories.columns.root')}>
						<div class="vertical-scroll-wrapper">
							{#each categories.filter((c) => containers.has(c)) as container (container.guid)}
								<Card {container} showRelationFilter />
							{/each}
						</div>
					</BoardColumn>
					<BoardColumn title={$_('category.terms.heading')}>
						<MaybeDragZone containers={terms} />
					</BoardColumn>
					<BoardColumn title={$_('category.subterms.heading')}>
						<MaybeDragZone containers={subterms} />
					</BoardColumn>
				</Board>

				<ContextTabs slug="categories" />
			{/snippet}
		</FullscreenLayout>
	</BulkActionContextProvider>
</PageLayout>
