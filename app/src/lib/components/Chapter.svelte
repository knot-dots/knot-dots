<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronDoubleDown from '~icons/heroicons/chevron-double-down-20-solid';
	import ChevronDoubleUp from '~icons/heroicons/chevron-double-up-20-solid';
	import ChevronDown from '~icons/heroicons/chevron-down-20-solid';
	import ChevronUp from '~icons/heroicons/chevron-up-20-solid';
	import LightBulb from '~icons/heroicons/light-bulb-16-solid';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import ObjectiveCarousel from '$lib/components/ObjectiveCarousel.svelte';
	import PartOfMeasureCarousel from '$lib/components/PartOfMeasureCarousel.svelte';
	import Progress from '$lib/components/Progress.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		containerOfType,
		isContainerWithEffect,
		isContainerWithObjective,
		isObjectiveContainer,
		isPartOf as isPartOfFilter,
		isSimpleMeasureContainer,
		overlayKey,
		paramsFromFragment,
		payloadTypes,
		predicates,
		status
	} from '$lib/models';
	import type { Container, Relation, StrategyContainer } from '$lib/models';
	import { ability } from '$lib/stores';
	import { statusColors, statusIcons } from '$lib/theme/models';

	export let headingTag: string;
	export let container: Container;
	export let isPartOf: StrategyContainer;
	export let relatedContainers: Container[];

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
		const params = paramsFromFragment(url);
		params.set('create', payloadTypes.enum.undefined);
		params.set('is-part-of-strategy', String(isPartOf.revision));
		params.set('position', String(position));
		for (const payloadType of isPartOf.payload.chapterType) {
			params.append('payloadType', payloadType);
		}
		return `#${params.toString()}`;
	}

	function viewInOverlayURL(url: URL) {
		const params = paramsFromFragment(url);
		if (params.get(overlayKey.enum.view) === container.guid) {
			return '#';
		} else {
			return `#view=${container.guid}`;
		}
	}
</script>

<div class="chapter">
	<svelte:element this={headingTag} class="chapter-title">
		{container.payload.title}
		{#if $ability.can('update', isPartOf)}
			{#if currentIndex < isPartOfRelation.length - 1}
				<button class="icons-element" type="button" on:click={moveDown}>
					<ChevronDown />
				</button>
			{/if}
			{#if currentIndex < isPartOfRelation.length - 9}
				<button class="icons-element" type="button" on:click={moveDown10}>
					<ChevronDoubleDown />
				</button>
			{/if}
			{#if currentIndex > 8}
				<button class="icons-element" type="button" on:click={moveUp10}>
					<ChevronDoubleUp />
				</button>
			{/if}
			{#if currentIndex > 0}
				<button class="icons-element" type="button" on:click={moveUp}>
					<ChevronUp />
				</button>
			{/if}
		{/if}
	</svelte:element>

	{#if 'status' in container.payload}
		<p>
			<span class="badge badge--{statusColors.get(container.payload.status)}">
				<svelte:component this={statusIcons.get(container.payload.status) ?? LightBulb} />
				{$_(container.payload.status)}
			</span>
		</p>
	{/if}

	{#if 'body' in container.payload}
		<Viewer value={container.payload.body} />
	{/if}

	{#if 'description' in container.payload}
		<Viewer value={container.payload.description} />
	{/if}

	{#if 'progress' in container.payload}
		<div class="progress">
			<h4>{$_('progress')}</h4>
			<Progress value={container.payload.progress} />
		</div>
	{/if}

	{#if 'annotation' in container.payload && (container.payload.status === status.enum['status.in_planning'] || isSimpleMeasureContainer(container))}
		<h4>{$_('annotation')}</h4>
		<Viewer value={container.payload.annotation} />
	{:else if 'comment' in container.payload && container.payload.status === status.enum['status.in_implementation']}
		<h4>{$_('comment')}</h4>
		<Viewer value={container.payload.comment} />
	{:else if 'result' in container.payload && (container.payload.status === status.enum['status.in_operation'] || container.payload.status === status.enum['status.done'])}
		<h4>{$_('result')}</h4>
		<Viewer value={container.payload.result} />
	{/if}

	{#if isContainerWithObjective(container) && relatedContainers
			.filter(isObjectiveContainer)
			.filter(isPartOfFilter(container)).length > 0}
		<h4>{$_('objectives')}</h4>
		<ObjectiveCarousel {container} {relatedContainers} />
	{/if}

	{#if isContainerWithEffect(container)}
		{#if relatedContainers
			.filter(({ payload }) => payload.type == payloadTypes.enum.resource)
			.filter(isPartOfFilter(container)).length > 0}
			<h4>{$_('resources')}</h4>
			<PartOfMeasureCarousel
				{container}
				payloadType={payloadTypes.enum.resource}
				{relatedContainers}
			/>
		{/if}

		{#if relatedContainers
			.filter(({ payload }) => payload.type == payloadTypes.enum.effect)
			.filter(isPartOfFilter(container)).length > 0}
			<h4>{$_('effects')}</h4>
			<PartOfMeasureCarousel
				{container}
				payloadType={payloadTypes.enum.effect}
				{relatedContainers}
			/>
		{/if}
	{/if}

	<footer class="content-actions">
		<a class="button" href={viewInOverlayURL($page.url)}>
			{$_('read_more')}
		</a>

		{#if $ability.can('create', containerOfType(payloadTypes.enum.undefined, $page.data.currentOrganization.guid, $page.data.currentOrganizationalUnit?.guid ?? null, isPartOf.managed_by, env.PUBLIC_KC_REALM))}
			<a class="button" href={addChapterURL($page.url, currentIndex + 1)}>
				<PlusSmall />
				{$_('chapter')}
			</a>
		{/if}
	</footer>
</div>

<style>
	h4,
	p {
		margin: 0.875rem 0;
	}

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
