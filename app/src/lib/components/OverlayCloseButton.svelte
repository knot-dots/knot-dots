<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ChevronDoubleRight from '~icons/flowbite/chevron-double-right-outline';
	import { page } from '$app/state';
	import tooltip from '$lib/attachments/tooltip';

	function closeURL(url: URL) {
		const closeURL = new URL(url);
		closeURL.hash = '';
		return closeURL.toString();
	}
</script>

<a class="action-button" href={closeURL(page.url)} {@attach tooltip($_('close'))}>
	<ChevronDoubleRight />
</a>

<style>
	a {
		flex-shrink: 0;
	}
</style>
