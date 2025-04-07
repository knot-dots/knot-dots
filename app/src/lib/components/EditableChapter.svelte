<script lang="ts">
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableObjectiveCarousel from '$lib/components/EditableObjectiveCarousel.svelte';
	import EditablePartOfMeasureCarousel from '$lib/components/EditablePartOfMeasureCarousel.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import EditableStatus from '$lib/components/EditableStatus.svelte';
	import {
		type Container,
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
		type Relation,
		status,
		type StrategyContainer
	} from '$lib/models';
	import { ability } from '$lib/stores';

	export let container: Container;
	export let editable = false;
	export let headingTag: string;
	export let isPartOf: StrategyContainer;
	export let relatedContainers: Container[];

	let isPartOfRelation: Relation[];

	$: isPartOfRelation = isPartOf.relation.filter(
		({ object, predicate }) =>
			predicate == predicates.enum['is-part-of-strategy'] && object == isPartOf.guid
	);

	$: currentIndex = isPartOfRelation.findIndex(({ subject }) => container.guid == subject);

	function addChapterURL(url: URL, position: number) {
		const params = paramsFromFragment(url);
		params.set('create', payloadTypes.enum.undefined);
		params.set('is-part-of-strategy', String(isPartOf.guid));
		params.set('managed-by', isPartOf.managed_by);
		params.set('position', String(position));
		params.delete('payloadType');
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

	let timer: ReturnType<typeof setTimeout>;

	function debouncedSubmit(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		clearTimeout(timer);
		timer = setTimeout(async () => {
			input.closest('form')?.requestSubmit();
		}, 2000);
	}
</script>

{#if editable}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<svelte:element
		this={headingTag}
		class="chapter-title"
		contenteditable="plaintext-only"
		bind:textContent={container.payload.title}
		on:input={debouncedSubmit}
		on:keydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
	>
		{container.payload.title}
	</svelte:element>
{:else}
	<svelte:element this={headingTag} class="chapter-title" contenteditable="false">
		{container.payload.title}
	</svelte:element>
{/if}

{#if 'status' in container.payload}
	<EditableStatus {editable} bind:value={container.payload.status} />
{/if}

{#if 'body' in container.payload}
	<EditableFormattedText {editable} label={$_('body')} bind:value={container.payload.body} />
{/if}

{#if 'description' in container.payload}
	<EditableFormattedText {editable} bind:value={container.payload.description} />
{/if}

{#if 'progress' in container.payload}
	<div class="progress">
		<h4 class="chapter-subtitle">{$_('progress')}</h4>
		<EditableProgress {editable} bind:value={container.payload.progress} />
	</div>
{/if}

{#if 'annotation' in container.payload && (container.payload.status === status.enum['status.in_planning'] || isSimpleMeasureContainer(container))}
	<div class="annotation">
		<h4 class="chapter-subtitle">{$_('annotation')}</h4>
		<EditableFormattedText
			{editable}
			label={$_('annotation')}
			bind:value={container.payload.annotation}
		/>
	</div>
{:else if 'comment' in container.payload && container.payload.status === status.enum['status.in_implementation']}
	<div class="comment">
		<h4 class="chapter-subtitle">{$_('comment')}</h4>
		<EditableFormattedText
			{editable}
			label={$_('comment')}
			bind:value={container.payload.comment}
		/>
	</div>
{:else if 'result' in container.payload && (container.payload.status === status.enum['status.in_operation'] || container.payload.status === status.enum['status.done'])}
	<div class="result">
		<h4 class="chapter-subtitle">{$_('result')}</h4>
		<EditableFormattedText {editable} label={$_('result')} bind:value={container.payload.result} />
	</div>
{/if}

{#if isContainerWithObjective(container) && relatedContainers
		.filter(isObjectiveContainer)
		.filter(isPartOfFilter(container)).length > 0}
	<div class="objectives">
		<h4 class="chapter-subtitle">{$_('objectives')}</h4>
		<EditableObjectiveCarousel {container} {editable} {relatedContainers} />
	</div>
{/if}

{#if isContainerWithEffect(container)}
	{#if relatedContainers
		.filter(({ payload }) => payload.type === payloadTypes.enum.resource)
		.filter(isPartOfFilter(container)).length > 0}
		<div class="resources">
			<h4 class="chapter-subtitle">{$_('resources')}</h4>
			<EditablePartOfMeasureCarousel
				{container}
				{editable}
				payloadType={payloadTypes.enum.resource}
				{relatedContainers}
			/>
		</div>
	{/if}

	{#if relatedContainers
		.filter(({ payload }) => payload.type === payloadTypes.enum.measure_result)
		.filter(isPartOfFilter(container)).length > 0}
		<div class="measure-results">
			<h4 class="chapter-subtitle">{$_('measure_results')}</h4>
			<EditablePartOfMeasureCarousel
				{container}
				{editable}
				payloadType={payloadTypes.enum.measure_result}
				{relatedContainers}
			/>
		</div>
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

<style>
	.chapter-title {
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		min-height: calc(1.5em + 1.5rem);
		padding: 0.75rem 1rem;
	}

	.chapter-subtitle {
		border-radius: 8px;
		color: var(--color-gray-800);
		font-size: 1rem;
		font-weight: 500;
		min-height: calc(1.5em + 1.5rem);
		padding: 0.75rem 1rem;
	}

	.content-actions {
		margin: 0;
		padding: 0.5rem 0.75rem;
	}
</style>
