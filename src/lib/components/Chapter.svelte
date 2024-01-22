<script lang="ts">
	import {
		ChevronDoubleDown,
		ChevronDoubleUp,
		ChevronDown,
		ChevronUp,
		Icon,
		PlusSmall
	} from 'svelte-hero-icons';
	import { _ } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import Viewer from '$lib/components/Viewer.svelte';
	import { payloadTypes, predicates } from '$lib/models';
	import type { Container, Relation, StrategyContainer } from '$lib/models';
	import { ability } from '$lib/stores';

	export let headingTag: string;
	export let container: Container;
	export let isPartOf: StrategyContainer;

	let isPartOfRelation: Relation[];

	$: isPartOfRelation = isPartOf.relation.filter(
		({ object, predicate }) =>
			predicate == predicates.enum['is-part-of-strategy'] && object == isPartOf.revision
	);

	$: currentIndex = isPartOfRelation.findIndex(({ subject }) => container.revision == subject);

	function swap(x: number, y: number) {
		return ([...xs]) => (xs.length > 1 ? (([xs[x], xs[y]] = [xs[y], xs[x]]), xs) : xs);
	}

	function moveUp() {
		const swapCurrentPrevious = swap(currentIndex, currentIndex - 1);
		updateRelation(swapCurrentPrevious(isPartOfRelation));
	}

	function moveUp10() {
		updateRelation([
			...isPartOfRelation.slice(0, currentIndex - 10),
			isPartOfRelation[currentIndex],
			...isPartOfRelation.slice(currentIndex - 9, currentIndex),
			...isPartOfRelation.slice(currentIndex + 1)
		]);
	}

	function moveDown() {
		const swapCurrentNext = swap(currentIndex, currentIndex + 1);
		updateRelation(swapCurrentNext(isPartOfRelation));
	}

	function moveDown10() {
		updateRelation([
			...isPartOfRelation.slice(0, currentIndex),
			...isPartOfRelation.slice(currentIndex + 1, currentIndex + 10),
			isPartOfRelation[currentIndex],
			...isPartOfRelation.slice(currentIndex + 11)
		]);
	}

	async function updateRelation(relation: Relation[]) {
		const url = `/container/${isPartOf.guid}/relation`;

		const response = await fetch(url, {
			method: 'POST',
			body: JSON.stringify(relation),
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			await invalidateAll();
		}
	}

	function addChapterURL(url: URL, position: number) {
		const params = paramsFromURL(url);
		params.set('create', payloadTypes.enum.undefined);
		params.set('is-part-of-strategy', String(isPartOf.revision));
		params.set('position', String(position));
		return `#${params.toString()}`;
	}
</script>

<div class="chapter">
	<svelte:element this={headingTag} class="chapter-title">
		{container.payload.title}
		{#if $ability.can('update', $page.data.container)}
			{#if currentIndex < isPartOfRelation.length - 1}
				<button class="icons-element" type="button" on:click={moveDown}>
					<Icon src={ChevronDown} size="20" />
				</button>
			{/if}
			{#if currentIndex < isPartOfRelation.length - 9}
				<button class="icons-element" type="button" on:click={moveDown10}>
					<Icon src={ChevronDoubleDown} size="20" />
				</button>
			{/if}
			{#if currentIndex > 8}
				<button class="icons-element" type="button" on:click={moveUp10}>
					<Icon src={ChevronDoubleUp} size="20" />
				</button>
			{/if}
			{#if currentIndex > 0}
				<button class="icons-element" type="button" on:click={moveUp}>
					<Icon src={ChevronUp} size="20" />
				</button>
			{/if}
		{/if}
	</svelte:element>
	{#if 'summary' in container.payload}
		<p>
			{container.payload.summary ?? ''}
		</p>
	{/if}
	{#if 'body' in container.payload}
		<Viewer value={container.payload.body} />
	{/if}
	{#if 'description' in container.payload}
		<Viewer value={container.payload.description} />
	{/if}
	<footer class="content-actions">
		<a class="button" href="#view={container.guid}">
			{$_('read_more')}
		</a>

		<a class="button" href={addChapterURL($page.url, currentIndex + 1)}>
			<Icon src={PlusSmall} size="24" mini />
			{$_('chapter')}
		</a>
	</footer>
</div>

<style>
	.chapter {
		margin-bottom: 1.5rem;
		max-width: 50rem;
	}

	.chapter-title {
		display: flex;
		font-size: 1.25rem;
		font-weight: 800;
		justify-content: space-between;
		margin-bottom: 0.875rem;
	}

	.chapter-title button {
		flex-shrink: 0;
	}

	.chapter-title button:first-of-type {
		margin-left: auto;
	}

	.content-actions {
		margin-top: 0.875rem;
	}
</style>
