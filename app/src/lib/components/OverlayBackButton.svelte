<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronLeft from '~icons/flowbite/chevron-left-outline';
	import { goto } from '$app/navigation';
	import { overlayHistory } from '$lib/stores';

	async function navigateBack() {
		$overlayHistory = $overlayHistory.slice(0, $overlayHistory.length - 1);
		const newParams = $overlayHistory[$overlayHistory.length - 1] as URLSearchParams;
		await goto(`#${newParams.toString()}`);
	}
</script>

{#if $overlayHistory.length > 1}
	<button
		aria-label={$_('back')}
		class="action-button action-button--padding-tight"
		onclick={navigateBack}
	>
		<ChevronLeft />
	</button>
{/if}

<style>
	button {
		flex-shrink: 0;
	}
</style>
