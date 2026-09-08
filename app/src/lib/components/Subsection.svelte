<script lang="ts">
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableGoalCollection from '$lib/components/EditableGoalCollection.svelte';
	import EditableObjectiveCollection from '$lib/components/EditableObjectiveCollection.svelte';
	import EditableResourceCollection from '$lib/components/EditableResourceCollection.svelte';
	import {
		type AnyPayload,
		type Container,
		isGoalCollectionContainer,
		isGoalContainer,
		isObjectiveCollectionContainer,
		isResourceCollectionContainer
	} from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: Container<AnyPayload>;
		editable?: boolean;
		parentContainer: Container<AnyPayload>;
		relatedContainers: Container<AnyPayload>[];
		useForm?: boolean;
	}

	let {
		container = $bindable(),
		editable: editableOverride,
		parentContainer = $bindable(),
		relatedContainers = $bindable(),
		useForm = true
	}: Props = $props();

	let editable = $derived(editableOverride ?? $applicationState.containerDetailView.editable);
	const handleSubmit = autoSave(container, 2000);

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}
</script>

{#snippet content()}
	<section class="details-subsection">
		{#if isGoalCollectionContainer(container)}
			<EditableGoalCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				{editable}
				heading="h3"
			/>
		{:else if isObjectiveCollectionContainer(container) && isGoalContainer(parentContainer)}
			<EditableObjectiveCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				{editable}
				heading="h3"
			/>
		{:else if isResourceCollectionContainer(container)}
			<EditableResourceCollection
				bind:container
				bind:parentContainer
				bind:relatedContainers
				{editable}
				heading="h3"
			/>
		{/if}
	</section>
{/snippet}

{#if useForm}
	<form oninput={stopPropagation(requestSubmit)} onsubmit={handleSubmit} novalidate>
		{@render content()}
	</form>
{:else}
	{@render content()}
{/if}

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
