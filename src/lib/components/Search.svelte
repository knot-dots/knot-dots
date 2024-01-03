<script lang="ts">
	import { Icon, MagnifyingGlass } from 'svelte-hero-icons';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { sidebarToggle } from '$lib/stores';

	let timer: ReturnType<typeof setTimeout>;
	let terms = $page.url.searchParams.get('terms') ?? '';

	function debouncedSearch() {
		clearTimeout(timer);
		timer = setTimeout(search, 500);
	}

	function search() {
		const searchParams = new URLSearchParams($page.url.searchParams);
		searchParams.delete('terms');
		if (terms) {
			searchParams.set('terms', terms);
		}
		goto(`?${searchParams.toString()}${$page.url.hash}`, { keepFocus: true, replaceState: true });
	}
</script>

<li>
	<form class="search" data-sveltekit-keepfocus>
		<button type={$sidebarToggle ? 'submit' : 'button'} on:click>
			<Icon src={MagnifyingGlass} size="20" mini />
		</button>
		<input
			type="search"
			name="terms"
			bind:value={terms}
			on:input={debouncedSearch}
			style:display={$sidebarToggle ? 'block' : 'none'}
		/>
	</form>
</li>

<style>
	.search {
		display: flex;
	}

	.search > button {
		--button-background: var(--color-gray-050);
		color: var(--color-gray-500);
		flex: 0 0 51px;
	}

	.search > input {
		background-color: var(--color-gray-050);
		border-bottom-left-radius: 0;
		border-color: var(--button-border-color);
		border-left: none;
		border-top-left-radius: 0;
		margin: 0 0 0 -8px;
		padding: 13px 14px 13px 0;
		width: 100%;
	}

	.search > button:hover {
		--button-background: var(--color-gray-400);
	}
</style>
