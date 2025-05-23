<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Maximize from '~icons/flowbite/expand-outline';
	import Minimize from '~icons/flowbite/minimize-outline';

	let fullScreen = getContext<{ enabled: boolean }>('overlayFullScreen');
</script>

<button
	class="action-button action-button--padding-tight"
	onclick={() => (fullScreen.enabled = !fullScreen.enabled)}
	aria-label={$_('full_screen')}
>
	{#if fullScreen.enabled}<Minimize />{:else}<Maximize />{/if}
</button>

<style>
	button {
		flex-shrink: 0;
		margin-right: 0.5rem;
	}
</style>
