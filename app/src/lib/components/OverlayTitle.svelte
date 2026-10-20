<script lang="ts">
	import { page } from '$app/state';
	import { getOverlayContext } from '$lib/contexts/overlay.svelte';
	import { overlayKey, overlayURL, payloadTypes } from '$lib/models';

	const overlay = getOverlayContext();
</script>

{#if overlay.data?.container}
	<a
		class={['truncated', overlay.data?.key === overlayKey.enum.view ? 'is-active' : '']}
		href={overlayURL(page.url, overlayKey.enum.view, overlay.data.container.guid)}
	>
		{#if overlay.data.container.payload.type === payloadTypes.enum.organization || overlay.data.container.payload.type === payloadTypes.enum.organizational_unit}
			{overlay.data.container.payload.name}
		{:else}
			{overlay.data.container.payload.title}
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
