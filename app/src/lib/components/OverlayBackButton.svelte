<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronLeft from '~icons/flowbite/chevron-left-outline';
	import { goto } from '$app/navigation';
	import tooltip from '$lib/attachments/tooltip';
	import { getOverlayContext } from '$lib/contexts/overlay.svelte';

	const loadedOverlay = getOverlayContext();

	async function navigateBack() {
		loadedOverlay.history = loadedOverlay.history.slice(0, loadedOverlay.history.length - 1);
		const newParams = loadedOverlay.history[loadedOverlay.history.length - 1] as URLSearchParams;
		await goto(`#${newParams.toString()}`);
	}
</script>

{#if loadedOverlay.history.length > 1}
	<button class="action-button" onclick={navigateBack} {@attach tooltip($_('back'))}>
		<ChevronLeft />
	</button>
{/if}

<style>
	button {
		flex-shrink: 0;
	}
</style>
