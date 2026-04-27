<script lang="ts">
	import { SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import { invalidate } from '$app/navigation';
	import requestSubmit from '$lib/client/requestSubmit';
	import saveContainer from '$lib/client/saveContainer';
	import AddSectionMenu from '$lib/components/AddSectionMenu.svelte';
	import DemographicDataSection from '$lib/components/DemographicDataSection.svelte';
	import EditableChapterSection from '$lib/components/EditableChapterSection.svelte';
	import EditableCustomCollection from '$lib/components/EditableCustomCollection.svelte';
	import EditableEffectCollection from '$lib/components/EditableEffectCollection.svelte';
	import EditableFileCollection from '$lib/components/EditableFileCollection.svelte';
	import EditableGoalCollection from '$lib/components/EditableGoalCollection.svelte';
	import EditableImageSection from '$lib/components/EditableImageSection.svelte';
	import EditableContentPartnerSection from '$lib/components/EditableContentPartnerSection.svelte';
	import EditableContentPartnerCollection from '$lib/components/EditableContentPartnerCollection.svelte';
	import EditableIndicatorCollection from '$lib/components/EditableIndicatorCollection.svelte';
	import EditableMapSection from '$lib/components/EditableMapSection.svelte';
	import EditableMeasureCollection from '$lib/components/EditableMeasureCollection.svelte';
	import EditableObjectiveCollection from '$lib/components/EditableObjectiveCollection.svelte';
	import EditableProgramCollection from '$lib/components/EditableProgramCollection.svelte';
	import EditableProgressSection from '$lib/components/EditableProgressSection.svelte';
	import EditableResourceCollection from '$lib/components/EditableResourceCollection.svelte';
	import EditableResourceDataCollection from '$lib/components/EditableResourceDataCollection.svelte';
	import EditableTaskCollection from '$lib/components/EditableTaskCollection.svelte';
	import EditableInlineHelpSection from '$lib/components/EditableInlineHelpSection.svelte';
	import EditableTextSection from '$lib/components/EditableTextSection.svelte';
	import ReadonlyAdministrativeAreaBasicDataSection from '$lib/components/ReadonlyAdministrativeAreaBasicDataSection.svelte';
	import EditableTeaserCollection from '$lib/components/EditableTeaserCollection.svelte';
	import EditableTeaserSection from '$lib/components/EditableTeaserSection.svelte';
	import DraggableActionBar from '$lib/components/DraggableActionBar.svelte';
	import {
		type AnyContainer,
		isAdministrativeAreaBasicDataContainer,
		isChapterContainer,
		isContainerWithProgress,
		isContainerWithSummary,
		isContentPartnerCollectionContainer,
		isContentPartnerContainer,
		isCustomCollectionContainer,
		isDemographicDataContainer,
		isEffectCollectionContainer,
		isFileCollectionContainer,
		isGoalCollectionContainer,
		isGoalContainer,
		isImageContainer,
		isInlineHelpTextContainer,
		isIndicatorCollectionContainer,
		isMapContainer,
		isMeasureCollectionContainer,
		isMeasureContainer,
		isObjectiveCollectionContainer,
		isOrganizationalUnitContainer,
		isProgramCollectionContainer,
		isProgressContainer,
		isResourceCollectionContainer,
		isResourceDataCollectionContainer,
		isSummaryContainer,
		isTaskCollectionContainer,
		isTeaserCollectionContainer,
		isTeaserLikeContainer,
		isTextContainer
	} from '$lib/models';
	import { ability, applicationState } from '$lib/stores';
	import { createFeatureDecisions } from '$lib/features';
	import { page } from '$app/state';
	import EditableSummarySection from '$lib/components/EditableSummarySection.svelte';

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

	let isShadowItem = $derived(SHADOW_ITEM_MARKER_PROPERTY_NAME in container);
	let isInlineHelpSection = $derived(isInlineHelpTextContainer(container));

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

<section
	class="details-section"
	class:details-section--inline-help={isInlineHelpSection &&
		$applicationState.containerDetailView.editable}
>
	{#if $applicationState.containerDetailView.editable}
		<DraggableActionBar>
			{#snippet actions()}
				{#if $applicationState.containerDetailView.editable && $ability.can('update', container)}
					<AddSectionMenu bind:relatedContainers bind:parentContainer compact {handleAddSection} />
				{/if}
			{/snippet}
		</DraggableActionBar>
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
		{:else if isDemographicDataContainer(container) && isOrganizationalUnitContainer(parentContainer)}
			<DemographicDataSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isEffectCollectionContainer(container) && (isGoalContainer(parentContainer) || isMeasureContainer(parentContainer))}
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
		{:else if isResourceDataCollectionContainer(container) && createFeatureDecisions(page.data.features).useResourcePlanning()}
			<EditableResourceDataCollection
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
		{:else if isSummaryContainer(container) && isContainerWithSummary(parentContainer)}
			<EditableSummarySection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
			/>
		{:else if isTaskCollectionContainer(container)}
			<EditableTaskCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				{heading}
			/>
		{:else if isInlineHelpTextContainer(container) && $applicationState.containerDetailView.editable}
			<EditableInlineHelpSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={!isShadowItem}
			/>
		{:else if isTextContainer(container) && !isInlineHelpSection}
			<EditableTextSection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable && !isShadowItem}
				{heading}
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
		{:else if isTeaserCollectionContainer(container)}
			<EditableTeaserCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				fetchDisabled={isShadowItem}
				{heading}
			/>
		{/if}
	</form>
</section>

<style>
	.details-section {
		position: relative;
	}

	.details-section--inline-help {
		background: var(--color-yellow-025);
		border: 1px solid var(--color-yellow-200);
	}

	@media (hover: hover) {
		section:hover {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;
		}
	}
</style>
