<script lang="ts">
	import { getContext } from 'svelte';
	import Search from '~icons/knotdots/search';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let timer: ReturnType<typeof setTimeout>;
	let overlay = getContext('overlay');
	let terms = overlay
		? (new URLSearchParams($page.url.hash.substring(1)).get('terms') ?? '')
		: ($page.url.searchParams.get('terms') ?? '');

	function debouncedSearch() {
		clearTimeout(timer);
		timer = setTimeout(search, 500);
	}

	function search() {
		if (overlay) {
			const searchParams = new URLSearchParams($page.url.hash.substring(1));
			searchParams.delete('terms');
			if (terms) {
				searchParams.set('terms', terms);
			}
			goto(`#${searchParams.toString()}`, {
				keepFocus: true,
				replaceState: true
			});
		} else {
			const searchParams = new URLSearchParams($page.url.searchParams);
			searchParams.delete('terms');
			if (terms) {
				searchParams.set('terms', terms);
			}
			goto(`?${searchParams.toString()}${$page.url.hash}`, { keepFocus: true, replaceState: true });
		}
	}
</script>

<form class="search" data-sveltekit-keepfocus>
	<button type="submit" on:click>
		<Search />
	</button>
	<input type="search" name="terms" bind:value={terms} on:input={debouncedSearch} />
</form>

<style>
	.search {
		display: flex;
	}

	.search > button {
		background: transparent;
		border: none;
		color: var(--color-gray-500);
		padding: 0.625rem;
		position: absolute;
	}

	.search > input {
		background-color: white;
		border: solid 1px var(--color-gray-900);
		padding: 0.5rem 1rem 0.5rem 2.5rem;
		width: 100%;
	}

	.search > button:hover {
		--button-background: var(--color-gray-400);
	}
</style>
