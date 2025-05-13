<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import AskAI from '~icons/knotdots/ask-ai';
	import { page } from '$app/stores';
	import { env } from '$env/dynamic/public';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableObjectiveCarousel from '$lib/components/EditableObjectiveCarousel.svelte';
	import EditablePartOfMeasureCarousel from '$lib/components/EditablePartOfMeasureCarousel.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import { createFeatureDecisions } from '$lib/features';
	import {
		type Container,
		containerOfType,
		isContainerWithEffect,
		isContainerWithObjective,
		isContainerWithProgress,
		isContainerWithStatus,
		isObjectiveContainer,
		isPartOf as isPartOfFilter,
		isResolutionContainer,
		isSimpleMeasureContainer,
		isSuggestedByAI,
		isTaskContainer,
		type NewContainer,
		overlayKey,
		paramsFromFragment,
		type PayloadType,
		payloadTypes,
		predicates,
		type Relation,
		status,
		type StrategyContainer
	} from '$lib/models';
	import { ability, newContainer } from '$lib/stores';
	import {
		resolutionStatusColors,
		resolutionStatusIcons,
		statusColors,
		statusIcons,
		taskStatusColors,
		taskStatusIcons
	} from '$lib/theme/models';

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

	const createContainerDialog = getContext<{ getElement: () => HTMLDialogElement }>(
		'createContainerDialog'
	);

	function createContainerAt(position: number) {
		return (event: Event) => {
			if (!(event as CustomEvent).detail.selected) {
				return;
			}

			const chapter = containerOfType(
				(event as CustomEvent).detail.selected as PayloadType,
				isPartOf.organization,
				isPartOf.organizational_unit,
				isPartOf.managed_by,
				env.PUBLIC_KC_REALM as string
			) as NewContainer;

			chapter.relation = [
				{ object: isPartOf.guid, predicate: predicates.enum['is-part-of-strategy'], position }
			];

			$newContainer = chapter;

			createContainerDialog.getElement().showModal();
		};
	}

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
</script>

{#if editable}
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<svelte:element
		this={headingTag}
		class="chapter-title"
		contenteditable="plaintext-only"
		bind:textContent={container.payload.title}
		on:keydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
	>
		{container.payload.title}
	</svelte:element>
{:else}
	<svelte:element this={headingTag} class="chapter-title" contenteditable="false">
		{container.payload.title}
	</svelte:element>
{/if}

<ul class="badges">
	<li class="badge badge--purple">{$_(container.payload.type)}</li>
	{#if isSuggestedByAI(container)}
		<li class="badge badge--yellow"><AskAI />{$_('ai_suggestion')}</li>
	{/if}
	{#if isContainerWithStatus(container)}
		{@const StatusIcon = statusIcons.get(container.payload.status)}
		{#key container.payload.status}
			<li class="badge badge--{statusColors.get(container.payload.status)}">
				<StatusIcon />
				{$_(container.payload.status)}
			</li>
		{/key}
	{:else if isTaskContainer(container)}
		{@const TaskStatusIcon = taskStatusIcons.get(container.payload.taskStatus)}
		{#key container.payload.taskStatus}
			<li class="badge badge--{taskStatusColors.get(container.payload.taskStatus)}">
				<TaskStatusIcon />
				{$_(container.payload.taskStatus)}
			</li>
		{/key}
	{:else if isResolutionContainer(container)}
		{@const ResolutionStatusIcon = resolutionStatusIcons.get(container.payload.resolutionStatus)}
		{#key container.payload.resolutionStatus}
			<li class="badge badge--{resolutionStatusColors.get(container.payload.resolutionStatus)}">
				<ResolutionStatusIcon />
				{$_(container.payload.resolutionStatus)}
			</li>
		{/key}
	{/if}
</ul>

{#if isContainerWithProgress(container)}
	<EditableProgress {editable} bind:value={container.payload.progress} compact />
{/if}

{#if 'body' in container.payload}
	<EditableFormattedText {editable} bind:value={container.payload.body} />
{/if}

{#if 'description' in container.payload}
	<EditableFormattedText {editable} bind:value={container.payload.description} />
{/if}

{#if 'annotation' in container.payload && (container.payload.status === status.enum['status.in_planning'] || isSimpleMeasureContainer(container))}
	<div class="annotation">
		<h4 class="chapter-subtitle">{$_('annotation')}</h4>
		<EditableFormattedText {editable} bind:value={container.payload.annotation} />
	</div>
{:else if 'comment' in container.payload && container.payload.status === status.enum['status.in_implementation']}
	<div class="comment">
		<h4 class="chapter-subtitle">{$_('comment')}</h4>
		<EditableFormattedText {editable} bind:value={container.payload.comment} />
	</div>
{:else if 'result' in container.payload && (container.payload.status === status.enum['status.in_operation'] || container.payload.status === status.enum['status.done'])}
	<div class="result">
		<h4 class="chapter-subtitle">{$_('result')}</h4>
		<EditableFormattedText {editable} bind:value={container.payload.result} />
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
		.filter(({ payload }) => payload.type === payloadTypes.enum.goal)
		.filter(isPartOfFilter(container)).length > 0}
		<div class="measure-results">
			<h4 class="chapter-subtitle">{$_('goals')}</h4>
			<EditablePartOfMeasureCarousel
				{container}
				{editable}
				payloadType={payloadTypes.enum.goal}
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
		{#if createFeatureDecisions($page.data.features).useEditableDetailView()}
			<DropDownMenu
				handleChange={createContainerAt(currentIndex + 1)}
				label={$_('chapter')}
				options={isPartOf.payload.chapterType.map((t) => ({ label: $_(t), value: t }))}
			>
				{#snippet icon()}<PlusSmall />{/snippet}
			</DropDownMenu>
		{:else}
			<a class="button" href={addChapterURL($page.url, currentIndex + 1)}>
				<PlusSmall />
				{$_('chapter')}
			</a>
		{/if}
	{/if}
</footer>

<style>
	.badges {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		padding: 0.375rem 0 0.75rem;
	}

	.chapter-title {
		color: var(--color-gray-800);
		font-size: 1.875rem;
		font-weight: 600;
		margin-bottom: 0;
		min-height: 1em;
	}

	.chapter-subtitle {
		color: var(--color-gray-700);
		font-size: 1.5rem;
		font-weight: 600;
		line-height: 1.25;
		margin-bottom: 0.5rem;
		margin-top: 2rem;
	}

	.content-actions {
		margin: 0;
	}
</style>
