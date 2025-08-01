<script lang="ts">
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableGoalCollection from '$lib/components/EditableGoalCollection.svelte';
	import EditableObjectiveCollection from '$lib/components/EditableObjectiveCollection.svelte';
	import EditableResourceCollection from '$lib/components/EditableResourceCollection.svelte';
	import {
		type AnyContainer,
		isGoalCollectionContainer,
		isObjectiveCollectionContainer,
		isResourceCollectionContainer
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let { container: originalContainer, relatedContainers = $bindable() }: Props = $props();

	let container = $state(originalContainer);

	/* svelte-ignore state_referenced_locally */
	const handleSubmit = autoSave(container, 2000);

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}
</script>

<section class="details-subsection">
	<form oninput={stopPropagation(requestSubmit)} onsubmit={handleSubmit} novalidate>
		{#if isGoalCollectionContainer(container)}
			<EditableGoalCollection
				bind:container
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				subsection
			/>
		{:else if isObjectiveCollectionContainer(container)}
			<EditableObjectiveCollection
				bind:container
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				subsection
			/>
		{:else if isResourceCollectionContainer(container)}
			<EditableResourceCollection
				bind:container
				bind:relatedContainers
				editable={$applicationState.containerDetailView.editable}
				subsection
			/>
		{/if}
	</form>
</section>

<style>
	@media (hover: hover) {
		section:hover {
			--is-visible-on-hover-transition: visibility 0s 0.3s linear;
			--is-visible-on-hover-visibility: visible;
		}
	}

	.details-subsection {
		padding: 1.5rem 0 0.5rem;
	}
</style>
