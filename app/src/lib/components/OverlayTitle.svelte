<script lang="ts">
	import { page } from '$app/state';
	import { overlayKey, overlayURL, payloadTypes } from '$lib/models';
	import { overlay } from '$lib/stores';
</script>

{#if $overlay?.container}
	<a
		class:is-active={$overlay?.key === overlayKey.enum.view}
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
		color: var(--color-gray-400);
		display: inline-block;
		flex-shrink: 1;
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
