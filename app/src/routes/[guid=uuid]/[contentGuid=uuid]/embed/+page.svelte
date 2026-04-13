<script lang="ts">
	import { onMount } from 'svelte';
	import EditableDetailView from '$lib/components/EditableDetailView.svelte';
	import { applicationState } from '$lib/stores';

	let { data } = $props();

	onMount(() => {
		applicationState.update((state) => ({
			...state,
			containerDetailView: {
				...state.containerDetailView,
				editable: false
			}
		}));
	});

	function disableNavigation(event: MouseEvent) {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (target.closest('a, button, .card')) {
			event.preventDefault();
			event.stopPropagation();
		}
	}
</script>

<div
	class="embed-main"
	data-payload-type={data.container.payload.type}
	onclickcapture={disableNavigation}
>
	<EditableDetailView container={data.container} revisions={data.revisions}>
		{#snippet layout(header, main)}
			{#if false}
				{@render header()}
			{/if}
			{@render main()}
		{/snippet}
	</EditableDetailView>
</div>

<style>
	.embed-main {
		background-color: white;
		min-height: 100vh;
	}

	.embed-main :global(.bottom-actions-bar),
	.embed-main :global(.stage--buttons),
	.embed-main :global(.action-button),
	.embed-main :global(.help-widget) {
		display: none;
	}

	.embed-main :global(a) {
		color: inherit;
		cursor: default;
		text-decoration: none;
	}

	/* Hide properties in embed mode while keeping main content visible. */
	.embed-main :global(#properties-label),
	.embed-main :global(#properties-label + .data-grid),
	.embed-main :global(#properties-label ~ button) {
		display: none;
	}

	.embed-main[data-payload-type='organization'] :global(.details-section),
	.embed-main[data-payload-type='organizational_unit'] :global(.details-section) {
		display: none;
	}
</style>
