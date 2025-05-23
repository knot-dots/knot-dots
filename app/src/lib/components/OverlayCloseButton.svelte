<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { page } from '$app/state';
	import ChevronDoubleRight from '~icons/flowbite/chevron-double-right-outline';

	function closeURL(url: URL) {
		const closeURL = new URL(url);
		closeURL.hash = '';
		return closeURL.toString();
	}
</script>

<a class="action-button action-button--padding-tight" href={closeURL(page.url)} title={$_('close')}>
	<ChevronDoubleRight />
</a>

<style>
	a {
		flex-shrink: 0;
	}
</style>
