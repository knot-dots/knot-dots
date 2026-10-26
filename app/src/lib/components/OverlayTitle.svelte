<script lang="ts">
	import { page } from '$app/state';
	import { getOverlayContext } from '$lib/contexts/overlay.svelte';
	import { overlayKey, overlayURL, payloadTypes } from '$lib/models';

	const loadedOverlay = getOverlayContext();
</script>

{#if loadedOverlay.data?.container}
	<a
		class={['truncated', loadedOverlay.data?.key === overlayKey.enum.view ? 'is-active' : '']}
		href={overlayURL(page.url, overlayKey.enum.view, loadedOverlay.data.container.guid)}
	>
		{#if loadedOverlay.data.container.payload.type === payloadTypes.enum.organization || loadedOverlay.data.container.payload.type === payloadTypes.enum.organizational_unit}
			{loadedOverlay.data.container.payload.name}
		{:else}
			{loadedOverlay.data.container.payload.title}
		{/if}
	</a>
{/if}

<style>
	a {
		color: var(--color-text-strong);
		display: inline-block;
		flex-shrink: 1;
		font-size: 0.875rem;
		padding: 0 0.5rem;
	}
</style>
