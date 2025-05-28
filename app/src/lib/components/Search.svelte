<script lang="ts">
	import { getContext } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Search from '~icons/knotdots/search';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let timer: ReturnType<typeof setTimeout>;
	let overlay = getContext('overlay');
	let terms = $state(
		overlay
			? (new URLSearchParams(page.url.hash.substring(1)).get('terms') ?? '')
			: (page.url.searchParams.get('terms') ?? '')
	);

	function debouncedSearch() {
		clearTimeout(timer);
		timer = setTimeout(search, 500);
	}

	function search() {
		if (overlay) {
			const searchParams = new URLSearchParams(page.url.hash.substring(1));
			searchParams.delete('terms');
			if (terms) {
				searchParams.set('terms', terms);
			}
			goto(`#${searchParams.toString()}`, {
				keepFocus: true,
				replaceState: true
			});
		} else {
			const searchParams = new URLSearchParams(page.url.searchParams);
			searchParams.delete('terms');
			if (terms) {
				searchParams.set('terms', terms);
			}
			goto(`?${searchParams.toString()}${page.url.hash}`, { keepFocus: true, replaceState: true });
		}
	}

	function init(element: HTMLInputElement) {
		element.size = element.getAttribute('placeholder')?.length ?? 6;
	}
</script>

<fieldset class="search">
	<button type="submit">
		<Search />
	</button>
	<input
		name="terms"
		oninput={debouncedSearch}
		placeholder={$_('search')}
		type="search"
		bind:value={terms}
		use:init
	/>
</fieldset>

<style>
	.search {
		background-color: var(--color-gray-050);
		border: none;
		display: flex;
		padding: 0;
		position: relative;
	}

	.search:focus-within,
	.search:hover {
		background-color: var(--color-gray-100);
	}

	.search > button {
		background: transparent;
		border: none;
		bottom: 0;
		color: var(--color-gray-500);
		padding: 0.375rem 0.5rem;
		position: absolute;
		top: 0;
	}

	.search > input {
		background-color: transparent;
		border: none;
		display: inline-block;
		flex-grow: 0;
		height: 2rem;
		padding: 0 0.5rem 0 2rem;
	}

	@container (min-width: 768px) {
		.search > input:focus {
			width: 16rem;
		}
	}
</style>
