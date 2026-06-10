<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Close from '~icons/flowbite/close-outline';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';

	function closeURL(url: URL) {
		const closeURL = new URL(url);
		closeURL.hash = '';
		return closeURL.toString();
	}
</script>

<a class="action-button" href={closeURL(page.url)} {@attach tooltip($_('close'))}>
	<Close />
</a>

<style>
	a {
		flex-shrink: 0;
	}
</style>
