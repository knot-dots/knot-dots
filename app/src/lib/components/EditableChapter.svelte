<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Plus from '~icons/knotdots/plus';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import Badges from '$lib/components/Badges.svelte';
	import DropDownMenu from '$lib/components/DropDownMenu.svelte';
	import EditableProgress from '$lib/components/EditableProgress.svelte';
	import Editor from '$lib/components/Editor.svelte';
	import Subsection from '$lib/components/Subsection.svelte';
	import Viewer from '$lib/components/Viewer.svelte';
	import {
		type Container,
		containerOfType,
		isContainerWithProgress,
		isGoalCollectionContainer,
		isObjectiveCollectionContainer,
		isResourceCollectionContainer,
		type NewContainer,
		overlayKey,
		paramsFromFragment,
		type PayloadType,
		payloadTypes,
		predicates,
		type ProgramContainer
	} from '$lib/models';
	import { hasSection } from '$lib/relations';
	import { ability, newContainer } from '$lib/stores';

	interface Props {
		container: Container;
		editable?: boolean;
		isPartOf: ProgramContainer;
		relatedContainers: Container[];
	}

	let { container = $bindable(), editable = false, isPartOf, relatedContainers }: Props = $props();

	let subsections = $derived(
		hasSection(container, relatedContainers).filter(
			(s) =>
				isGoalCollectionContainer(s) ||
				isObjectiveCollectionContainer(s) ||
				isResourceCollectionContainer(s)
		)
	);

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
	<h2
		class="details-heading"
		contenteditable="plaintext-only"
		bind:textContent={container.payload.title}
		onkeydown={(e) => (e.key === 'Enter' ? e.preventDefault() : null)}
	>
		{container.payload.title}
	</h2>
{:else}
	<h2 class="details-heading" contenteditable="false">{container.payload.title}</h2>
{/if}

<Badges bind:container {editable} />

{#if isContainerWithProgress(container)}
	<EditableProgress {editable} bind:value={container.payload.progress} />
{/if}

{#if 'body' in container.payload}
	{#if editable}
		<Editor bind:value={container.payload.body} />
	{:else}
		<Viewer value={container.payload.body} />
	{/if}
{/if}

{#if 'description' in container.payload}
	{#if editable}
		<Editor bind:value={container.payload.description} />
	{:else}
		<Viewer value={container.payload.description} />
	{/if}
{/if}

{#each subsections as subsectionContainer, i (subsectionContainer.guid)}
	<Subsection bind:relatedContainers container={subsectionContainer} />
{/each}

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
			{#snippet icon()}<Plus />{/snippet}
		</DropDownMenu>
	{/if}
</footer>

<style>
	.button {
		padding: 0.375rem 0.75rem;
	}

	.content-actions {
		margin: 0.5rem 0 0;
	}

	.details-heading {
		color: var(--color-gray-800);
		font-size: 1.875rem;
	}
</style>
