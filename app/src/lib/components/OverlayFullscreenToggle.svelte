<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Maximize from '~icons/flowbite/expand-outline';
	import Minimize from '~icons/flowbite/minimize-outline';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';
	import { overlay } from '$lib/stores';

	let fullScreen = getContext<{ enabled: boolean }>('overlayFullScreen');
</script>

{#if $overlay && $overlay.container}
	<a
		href={resolve('/[guid=uuid]/[contentGuid=uuid]', {
			guid: page.data.currentOrganizationalUnit
				? page.data.currentOrganizationalUnit.guid
				: page.data.currentOrganization.guid,
			contentGuid: $overlay.container.guid
		})}
		class="action-button"
		{@attach tooltip($_('full_screen'))}
	>
		<Maximize />
	</a>
{:else}
	<button
		class="action-button"
		onclick={() => (fullScreen.enabled = !fullScreen.enabled)}
		{@attach tooltip($_('full_screen'))}
	>
		{#if fullScreen.enabled}<Minimize />{:else}<Maximize />{/if}
	</button>
{/if}

<style>
	.action-button {
		flex-shrink: 0;
		margin-right: 0.5rem;
	}
</style>
