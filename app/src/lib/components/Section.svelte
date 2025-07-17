<script lang="ts">
	import autoSave from '$lib/client/autoSave';
	import requestSubmit from '$lib/client/requestSubmit';
	import EditableTextSection from '$lib/components/EditableTextSection.svelte';
	import { type AnyContainer, isTextContainer } from '$lib/models';
	import { applicationState } from '$lib/stores';

	interface Props {
		container: AnyContainer;
		relatedContainers: AnyContainer[];
	}

	let { container = $bindable(), relatedContainers = $bindable() }: Props = $props();

	const handleSubmit = autoSave(container, 2000);

	function stopPropagation(fn: (event: Event) => void) {
		return function (this: Event, event: Event) {
			event.stopPropagation();
			fn.call(this, event);
		};
	}
</script>

<section>
	<form oninput={stopPropagation(requestSubmit)} onsubmit={handleSubmit} novalidate>
		{#if isTextContainer(container)}
			<EditableTextSection
				bind:container
				editable={$applicationState.containerDetailView.editable}
			/>
		{/if}
	</form>
</section>

<style>
	section {
		border-radius: 24px;
		margin: 0 -1.5rem;
		padding: 1.5rem;
	}
</style>
