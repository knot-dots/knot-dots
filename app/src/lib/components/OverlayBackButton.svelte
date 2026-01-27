<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronLeft from '~icons/flowbite/chevron-left-outline';
	import { goto } from '$app/navigation';
	import { overlayHistory } from '$lib/stores';
	import tooltip from '$lib/attachments/tooltip';

	async function navigateBack() {
		$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
		const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
		await goto(`#${newParams.toString()}`);
	}
</script>

{#if $overlayHistory.length > 1}
	<button class="action-button" onclick={navigateBack} {@attach tooltip($_('back'))}>
		<ChevronLeft />
	</button>
{/if}

<style>
	button {
		flex-shrink: 0;
	}
</style>
