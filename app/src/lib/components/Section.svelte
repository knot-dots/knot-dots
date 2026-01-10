<script lang="ts">
	import { dragHandle, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import DragHandle from '~icons/knotdots/draghandle';
	import { invalidate } from '$app/navigation';
	import requestSubmit from '$lib/client/requestSubmit';
	import saveContainer from '$lib/client/saveContainer';
	import AddSectionMenu from '$lib/components/AddSectionMenu.svelte';
	import EditableChapterSection from '$lib/components/EditableChapterSection.svelte';
	import EditableCustomCollection from '$lib/components/EditableCustomCollection.svelte';
	import EditableEffectCollection from '$lib/components/EditableEffectCollection.svelte';
	import EditableFileCollection from '$lib/components/EditableFileCollection.svelte';
	import EditableGoalCollection from '$lib/components/EditableGoalCollection.svelte';
	import EditableImageSection from '$lib/components/EditableImageSection.svelte';
	import EditableContentPartnerSection from '$lib/components/EditableContentPartnerSection.svelte';
	import EditableContentPartnerCollection from '$lib/components/EditableContentPartnerCollection.svelte';
	import EditableKnowledgeCollection from '$lib/components/EditableKnowledgeCollection.svelte';
	import EditableIndicatorCollection from '$lib/components/EditableIndicatorCollection.svelte';
	import EditableMapSection from '$lib/components/EditableMapSection.svelte';
	import EditableMeasureCollection from '$lib/components/EditableMeasureCollection.svelte';
	import EditableObjectiveCollection from '$lib/components/EditableObjectiveCollection.svelte';
	import EditableProgramCollection from '$lib/components/EditableProgramCollection.svelte';
	import EditableProgressSection from '$lib/components/EditableProgressSection.svelte';
	import EditableResourceCollection from '$lib/components/EditableResourceCollection.svelte';
	import EditableTaskCollection from '$lib/components/EditableTaskCollection.svelte';
	import EditableTextSection from '$lib/components/EditableTextSection.svelte';
	import ReadonlyAdministrativeAreaBasicDataSection from '$lib/components/ReadonlyAdministrativeAreaBasicDataSection.svelte';
	import EditableTeaserCollection from '$lib/components/EditableTeaserCollection.svelte';
	import EditableTeaserSection from '$lib/components/EditableTeaserSection.svelte';
	import {
		type AnyContainer,
		isAdministrativeAreaBasicDataContainer,
		isChapterContainer,
		isContainerWithProgress,
		isCustomCollectionContainer,
		isEffectCollectionContainer,
		isFileCollectionContainer,
		isGoalCollectionContainer,
		isAccordionCollectionContainer,
		isGoalContainer,
		isImageContainer,
		isContentPartnerContainer,
		isContentPartnerCollectionContainer,
		isIndicatorCollectionContainer,
		isKnowledgeCollectionContainer,
		isMapContainer,
		isMeasureCollectionContainer,
		isObjectiveCollectionContainer,
		isOrganizationalUnitContainer,
		isProgramCollectionContainer,
		isProgressContainer,
		isResourceCollectionContainer,
		isTaskCollectionContainer,
		isTeaserCollectionContainer,
		isTextContainer,
		isTeaserLikeContainer,
		isReportContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';

	interface Props {
		container: AnyContainer & { [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: string };
		handleAddSection: (event: Event) => void;
		heading?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		parentContainer: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let {
		container = $bindable(),
		handleAddSection,
		heading = 'h2',
		parentContainer = $bindable(),
		relatedContainers = $bindable()
	}: Props = $props();

	let isShadowItem = $derived(container[SHADOW_ITEM_MARKER_PROPERTY_NAME]);

	const handleSubmit = autoSave(2000);

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}

	function autoSave(delay: number) {
		let timer: ReturnType<typeof setTimeout>;

		return (container: AnyContainer) => (event: SubmitEvent) => {
			event.preventDefault();
			clearTimeout(timer);
			timer = setTimeout(async () => {
				const response = await saveContainer(container);
				if (response.ok) {
					const updatedContainer = await response.json();
					container.revision = updatedContainer.revision;
					await invalidate('containers');
				} else {
					const error = await response.json();
					alert(error.message);
				}
			}, delay);
		};
	}
</script>

<section class="details-section">
	{#if $applicationState.containerDetailView.editable}
		<div class="actions is-visible-on-hover">
			{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
				<AddSectionMenu bind:relatedContainers bind:parentContainer compact {handleAddSection} />
			{/if}
			<span class="drag-handle" use:dragHandle>
				<DragHandle />
			</span>
		</div>
	{/if}

	<form oninput={stopPropagation(requestSubmit)} onsubmit={handleSubmit(container)} novalidate>
		{#if isAdministrativeAreaBasicDataContainer(container) && isOrganizationalUnitContainer(parentContainer)}
			<ReadonlyAdministrativeAreaBasicDataSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isChapterContainer(container)}
			<EditableChapterSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
			/>
		{:else if isCustomCollectionContainer(container)}
			<EditableCustomCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isEffectCollectionContainer(container) && isGoalContainer(parentContainer)}
			<EditableEffectCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isFileCollectionContainer(container)}
			<EditableFileCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isGoalCollectionContainer(container)}
			<EditableGoalCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isImageContainer(container)}
			<EditableImageSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isContentPartnerCollectionContainer(container)}
			<EditableContentPartnerCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isContentPartnerContainer(container)}
			<EditableContentPartnerSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isIndicatorCollectionContainer(container)}
			<EditableIndicatorCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isKnowledgeCollectionContainer(container)}
			<EditableKnowledgeCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isMapContainer(container) && isOrganizationalUnitContainer(parentContainer)}
			<EditableMapSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isMeasureCollectionContainer(container)}
			<EditableMeasureCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isObjectiveCollectionContainer(container) && isGoalContainer(parentContainer)}
			<EditableObjectiveCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isProgramCollectionContainer(container)}
			<EditableProgramCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isProgressContainer(container) && isContainerWithProgress(parentContainer)}
			<EditableProgressSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isResourceCollectionContainer(container)}
			<EditableResourceCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isTaskCollectionContainer(container)}
			<EditableTaskCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isTextContainer(container)}
			<EditableTextSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable && !isShadowItem}
				{heading}
				hideTitle={isReportContainer(parentContainer)}
			/>
		{:else if isTeaserLikeContainer(container)}
			<EditableTeaserSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isImageContainer(container)}
			<EditableImageSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isTeaserCollectionContainer(container) || isAccordionCollectionContainer(container)}
			<EditableTeaserCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{/if}
	</form>
</section>

<style>
	.details-section {
		position: relative;
	}

	.actions {
		--dropdown-button-icon-default-color: var(--color-gray-700);
		--dropdown-button-icon-size: 1rem;

		align-items: center;
		background-color: white;
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		display: flex;
		gap: 0.25rem;
		left: -3.25rem;
		padding: 0.25rem;
		position: absolute;
		top: 1.25rem;
		z-index: 1;
	}

	.drag-handle {
		padding: 0.25rem;
	}

	.drag-handle :global(svg) {
		color: var(--dropdown-button-icon-default-color);
		height: 1rem;
		width: 1rem;
	}

	@media (hover: hover) {
		section:hover {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;
		}
	}
</style>
