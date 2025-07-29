<script lang="ts">
	import { dragHandle, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import DragHandle from '~icons/knotdots/draghandle';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableEffectCollection from '$lib/components/EditableEffectCollection.svelte';
	import EditableGoalCollection from '$lib/components/EditableGoalCollection.svelte';
	import EditableObjectiveCollection from '$lib/components/EditableObjectiveCollection.svelte';
	import EditableResourceCollection from '$lib/components/EditableResourceCollection.svelte';
	import EditableTaskCollection from '$lib/components/EditableTaskCollection.svelte';
	import EditableTextSection from '$lib/components/EditableTextSection.svelte';
	import {
		type AnyContainer,
		isEffectCollectionContainer,
		isGoalCollectionContainer,
		isObjectiveCollectionContainer,
		isResourceCollectionContainer,
		isTaskCollectionContainer,
		isTextContainer
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: AnyContainer & { [SHADOW_ITEM_MARKER_PROPERTY_NAME]?: string };
		relatedContainers: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers = $bindable() }: Props = $props();

	let isShadowItem = $derived(container[SHADOW_ITEM_MARKER_PROPERTY_NAME]);

	const handleSubmit = autoSave(container, 2000);

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}
</script>

<section class="details-section">
	{#if $applicationState.containerDetailView.editable}
		<span class="drag-handle is-visible-on-hover" use:dragHandle>
			<DragHandle />
		</span>
	{/if}

	<form oninput={stopPropagation(requestSubmit)} onsubmit={handleSubmit} novalidate>
		{#if isEffectCollectionContainer(container)}
			<EditableEffectCollection
				bind:container
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
			/>
		{:else if isGoalCollectionContainer(container)}
			<EditableGoalCollection
				bind:container
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
			/>
		{:else if isObjectiveCollectionContainer(container)}
			<EditableObjectiveCollection
				bind:container
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
			/>
		{:else if isResourceCollectionContainer(container)}
			<EditableResourceCollection
				bind:container
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
			/>
		{:else if isTaskCollectionContainer(container)}
			<EditableTaskCollection
				bind:container
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
			/>
		{:else if isTextContainer(container)}
			<EditableTextSection
				bind:container
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable && !isShadowItem}
			/>
		{/if}
	</form>
</section>

<style>
	.drag-handle {
		background-color: white;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-gray-700);
		left: -1.75rem;
		padding: 0.25rem;
		position: absolute;
	}

	.drag-handle > :global(svg) {
		border-radius: 8px;
		height: 2rem;
		padding: 0.375rem;
		width: 2rem;
	}

	.drag-handle:hover > :global(svg) {
		background-color: var(--dropdown-button-hover-background);
	}

	@media (hover: hover) {
		section:hover {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;
		}
	}
</style>
