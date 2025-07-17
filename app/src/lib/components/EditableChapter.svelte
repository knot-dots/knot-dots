<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import PlusSmall from '~icons/heroicons/plus-small-solid';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import Badges from '$lib/components/Badges.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EditableFormattedText from '$lib/components/EditableFormattedText.svelte';
	import EditableObjectiveCarousel from '$lib/components/EditableObjectiveCarousel.svelte';
	import EditablePartOfMeasureCarousel from '$lib/components/EditablePartOfMeasureCarousel.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import {
		type Container,
		containerOfType,
		isContainerWithEffect,
		isContainerWithObjective,
		isContainerWithProgress,
		isObjectiveContainer,
		isPartOf as isPartOfFilter,
		isSimpleMeasureContainer,
		type NewContainer,
		overlayKey,
		paramsFromFragment,
		type PayloadType,
		payloadTypes,
		predicates,
		type ProgramContainer,
		status
	} from '$lib/models';
	import { ability, newContainer } from '$lib/stores';

	interface Props {
		container: Container;
		editable?: boolean;
		headingTag: string;
		isPartOf: ProgramContainer;
		relatedContainers: Container[];
	}

	let {
		container = $bindable(),
		editable = false,
		headingTag,
		isPartOf,
		relatedContainers
	}: Props = $props();

	let isPartOfRelation = $derived(
		isPartOf.relation.filter(
			({ object, predicate }) =>
				predicate == predicates.enum['is-part-of-program'] && object == isPartOf.guid
		)
	);

	let currentIndex = $derived(
		isPartOfRelation.findIndex(({ subject }) => container.guid == subject)
	);

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
				{ object: isPartOf.guid, predicate: predicates.enum['is-part-of-program'], position }
			];

			$newContainer = chapter;

			createContainerDialog.getElement().showModal();
		};
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
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<svelte:element
		this={headingTag}
		class="chapter-title"
		contenteditable="plaintext-only"
		bind:textContent={container.payload.title}
		onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
	>
		{container.payload.title}
	</svelte:element>
{:else}
	<svelte:element this={headingTag} class="chapter-title" contenteditable="false">
		{container.payload.title}
	</svelte:element>
{/if}

<Badges bind:container {editable} />

{#if isContainerWithProgress(container)}
	<EditableProgress {editable} bind:value={container.payload.progress} compact />
{/if}

{#if 'body' in container.payload}
	<EditableFormattedText {editable} bind:value={container.payload.body} />
{/if}

{#if 'description' in container.payload}
	<EditableFormattedText {editable} bind:value={container.payload.description} />
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
	<a class="button" href={viewInOverlayURL(page.url)}>
		{$_('read_more')}
	</a>

	{#if $ability.can('create', containerOfType(payloadTypes.enum.undefined, page.data.currentOrganization.guid, page.data.currentOrganizationalUnit?.guid ?? null, isPartOf.managed_by, env.PUBLIC_KC_REALM))}
		<DropDownMenu
			handleChange={createContainerAt(currentIndex + 1)}
			label={$_('chapter')}
			options={isPartOf.payload.chapterType.map((t) => ({ label: $_(t), value: t }))}
		>
			{#snippet icon()}<PlusSmall />{/snippet}
		</DropDownMenu>
	{/if}
</footer>

<style>
	.button {
		padding: 0.375rem 0.75rem;
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
