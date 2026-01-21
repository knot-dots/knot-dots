<script lang="ts">
	import { setContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import Board from '$lib/components/Board.svelte';
	import BoardColumn from '$lib/components/BoardColumn.svelte';
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
		predicates.enum['is-consistent-with'],
		predicates.enum['is-equivalent-to'],
		predicates.enum['is-inconsistent-with'],
		predicates.enum['contributes-to'],
		predicates.enum['is-part-of-category'],
		predicates.enum['is-part-of']
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

		const adjacency = new Map<string, Set<string>>();
		// Ensure the selected node exists even if it has no relations.
		adjacency.set(target, new Set(adjacency.get(target)));

		for (const container of combinedContainers) {
			for (const { predicate, subject, object } of container.relation) {
				if (!relationPredicates.includes(predicate as Predicate)) continue;
				if (!subject || !object) continue;

				if (!adjacency.has(subject)) adjacency.set(subject, new Set());
				if (!adjacency.has(object)) adjacency.set(object, new Set());

				adjacency.get(subject)?.add(object);
				adjacency.get(object)?.add(subject);
			}
		}

		if (!adjacency.has(target)) return null;

		const visited = new Set<string>([target]);
		const queue = [target];

		while (queue.length > 0) {
			const current = queue.shift() as string;
			for (const next of adjacency.get(current) ?? []) {
				if (!visited.has(next)) {
					visited.add(next);
					queue.push(next);
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
				<BoardColumn addItemUrl="#create=category&level=0" title={$_('categories.columns.root')}>
					<MaybeDragZone containers={filteredContainers} />
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
