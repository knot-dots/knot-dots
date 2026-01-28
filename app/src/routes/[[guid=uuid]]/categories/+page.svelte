<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
	import Card from '$lib/components/Card.svelte';
	import Header from '$lib/components/Header.svelte';
	import Help from '$lib/components/Help.svelte';
	import Layout from '$lib/components/Layout.svelte';
	import MaybeDragZone from '$lib/components/MaybeDragZone.svelte';
	import { predicates, type Container, type Predicate } from '$lib/models';

	type PageProps = {
		data: {
			containers: Container[];
			terms: Container[];
			subterms: Container[];
		};
	};

	let { data }: PageProps = $props();

	const defaultRelationPredicates: Predicate[] = [
		predicates.enum['is-equivalent-to'],
		predicates.enum['implies']
	];

	const hierarchyPredicates: Predicate[] = [
		predicates.enum['is-part-of'],
		predicates.enum['is-part-of-category'],
		predicates.enum['is-part-of-program']
	];

	setContext('relationOverlay', {
		enabled: true,
		predicates: defaultRelationPredicates
	});

	let relationPredicates = $derived.by(() =>
		page.url.searchParams.getAll('relationType').length > 0
			? (page.url.searchParams.getAll('relationType') as Predicate[])
			: defaultRelationPredicates
	);

	let combinedContainers = $derived([...data.containers, ...data.terms, ...data.subterms]);

	let relatedGuids = $derived.by(() => {
		const target = page.url.searchParams.get('related-to');
		if (!target) return null;

		const knownGuids = new Set(combinedContainers.map(({ guid }) => guid));
		if (!knownGuids.has(target)) return null;

		type Edge = { to: string; dir: 'up' | 'down' | 'undirected' };
		const adjacency = new Map<string, Edge[]>();
		// Ensure the selected node exists even if it has no relations.
		adjacency.set(target, []);

		const allowedPredicates = new Set<Predicate>([...relationPredicates, ...hierarchyPredicates]);

		for (const container of combinedContainers) {
			for (const { predicate, subject, object } of container.relation) {
				const predicateType = predicate as Predicate;
				if (!allowedPredicates.has(predicateType)) continue;
				if (!subject || !object) continue;

				if (!adjacency.has(subject)) adjacency.set(subject, []);
				if (!adjacency.has(object)) adjacency.set(object, []);

				if (hierarchyPredicates.includes(predicateType)) {
					// subject = child, object = parent
					adjacency.get(subject)?.push({ to: object, dir: 'up' });
					adjacency.get(object)?.push({ to: subject, dir: 'down' });
				} else {
					adjacency.get(subject)?.push({ to: object, dir: 'undirected' });
					adjacency.get(object)?.push({ to: subject, dir: 'undirected' });
				}
			}
		}

		if (!adjacency.has(target)) return null;

		const visited = new Set<string>([target]);
		const queue: Array<{ node: string; cameFrom?: 'up' | 'down' | 'undirected' }> = [
			{ node: target }
		];

		while (queue.length > 0) {
			const { node, cameFrom } = queue.shift() as {
				node: string;
				cameFrom?: 'up' | 'down' | 'undirected';
			};
			for (const edge of adjacency.get(node) ?? []) {
				// Prevent sibling bleed: if we came from a child (up), do not expand back down to other children.
				if (cameFrom === 'up' && edge.dir === 'down') {
					continue;
				}
				if (!visited.has(edge.to)) {
					visited.add(edge.to);
					queue.push({ node: edge.to, cameFrom: edge.dir });
				}
			}
		}

		return visited;
	});

	let filteredContainers = $derived.by(() =>
		relatedGuids ? data.containers.filter(({ guid }) => relatedGuids.has(guid)) : data.containers
	);

	let filteredTerms = $derived.by(() =>
		relatedGuids ? data.terms.filter(({ guid }) => relatedGuids.has(guid)) : data.terms
	);

	let filteredSubterms = $derived.by(() =>
		relatedGuids ? data.subterms.filter(({ guid }) => relatedGuids.has(guid)) : data.subterms
	);
</script>

<Layout>
	{#snippet header()}
		<Header search />
	{/snippet}

	{#snippet main()}
		{#key page.url.searchParams}
			<Board>
				<BoardColumn addItemUrl="#create=category" title={$_('categories.columns.root')}>
					<div class="vertical-scroll-wrapper">
						{#each filteredContainers as container (container.guid)}
							<Card {container} showRelationFilter />
						{/each}
					</div>
				</BoardColumn>
				<BoardColumn title={$_('category.terms.heading')}>
					<MaybeDragZone containers={filteredTerms} />
				</BoardColumn>
				<BoardColumn title={$_('category.subterms.heading')}>
					<MaybeDragZone containers={filteredSubterms} />
				</BoardColumn>
			</Board>
		{/key}

		<Help slug="categories" />
	{/snippet}
</Layout>
