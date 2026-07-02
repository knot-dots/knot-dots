<script lang="ts">
	import { page } from '$app/state';
	import { overlayKey, overlayURL, payloadTypes } from '$lib/models';
	import { overlay } from '$lib/stores';
</script>

{#if $overlay?.container}
	<a
		class={['truncated', $overlay?.key === overlayKey.enum.view ? 'is-active' : '']}
		href={overlayURL(page.url, overlayKey.enum.view, $overlay.container.guid)}
	>
		{#if $overlay.container.payload.type === payloadTypes.enum.organization || $overlay.container.payload.type === payloadTypes.enum.organizational_unit}
			{$overlay.container.payload.name}
		{:else}
			{$overlay.container.payload.title}
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
