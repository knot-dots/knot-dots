<script lang="ts">
	import { dragHandle, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import DragHandle from '~icons/knotdots/draghandle';
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import ContainerSettingsDropdown from '$lib/components/ContainerSettingsDropdown.svelte';
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

<section>
	{#if $applicationState.containerDetailView.editable}
		<span class="drag-handle" use:dragHandle>
			<DragHandle />
		</span>
	{/if}

	<form oninput={stopPropagation(requestSubmit)} onsubmit={handleSubmit} novalidate>
		{#if isEffectCollectionContainer(container)}
			<EditableEffectCollection
				bind:container
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
			/>
		{:else if isGoalCollectionContainer(container)}
			<EditableGoalCollection
				bind:container
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
			/>
		{:else if isObjectiveCollectionContainer(container)}
			<EditableObjectiveCollection
				bind:container
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
			/>
		{:else if isResourceCollectionContainer(container)}
			<EditableResourceCollection
				bind:container
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
			/>
		{:else if isTaskCollectionContainer(container)}
			<EditableTaskCollection
				bind:container
				editable={$applicationState.containerDetailView.editable}
				{relatedContainers}
			/>
		{:else if isTextContainer(container)}
			<EditableTextSection
				bind:container
				editable={$applicationState.containerDetailView.editable && !isShadowItem}
			/>
		{/if}
	</form>

	{#if $applicationState.containerDetailView.editable}
		<ContainerSettingsDropdown bind:container bind:relatedContainers />
	{/if}
</section>

<style>
	section {
		border-radius: 24px;
		margin: 0 -1.5rem;
		padding: 1.5rem;
	}

	section :global(.dropdown) {
		position: absolute;
		right: -3.25rem;
		top: 1.375rem;
	}

	.drag-handle {
		background-color: white;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		color: var(--color-gray-700);
		left: -3.25rem;
		padding: 0.75rem;
		position: absolute;
		top: 1.375rem;
	}

	@media (hover: hover) {
		section :global(.dropdown),
		section .drag-handle {
			visibility: hidden;
		}

		section:hover :global(.dropdown),
		section :global(:has(.dropdown-panel)),
		section:hover .drag-handle {
			visibility: visible;
		}
	}
</style>
