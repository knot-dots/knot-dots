<script lang="ts">
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import paramsFromURL from '$lib/client/paramsFromURL';
	import { getContext } from 'svelte';

	export let initialValue: string[] = [];
	export let key: string;
	export let label: string | undefined = undefined;
	export let options: string[][];

	let overlay = getContext('overlay');

	const changeKey = `${key}Changed`;

	let selected =
		initialValue.length == 0 || paramsFromURL($page.url).has(changeKey)
			? paramsFromURL($page.url).getAll(key)
			: initialValue;

	function apply() {
		if (overlay) {
			const query = new URLSearchParams($page.url.hash.substring(1));
			query.delete(key);
			if (initialValue.length > 0) {
				query.set(changeKey, '');
			}
			selected.forEach((s) => query.append(key, s));
			goto(`#${query.toString()}`, { keepFocus: true });
		} else {
			const query = new URLSearchParams($page.url.searchParams);
			query.delete(key);
			if (initialValue.length > 0) {
				query.set(changeKey, '');
			}
			selected.forEach((s) => query.append(key, s));
			goto(`?${query.toString()}${$page.url.hash}`, { keepFocus: true });
		}
	}
</script>

<li class="group" class:group-small={options.length <= 4} transition:slide={{ axis: 'y' }}>
	{#if label}
		<p>{label}</p>
	{/if}
	<ul>
		{#each options as [label, value]}
			<li>
				<label>
					<input type="checkbox" {value} bind:group={selected} on:change={apply} />
					{label}
				</label>
			</li>
		{/each}
	</ul>
</li>

<style>
	p {
		margin-bottom: 0.5rem;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group {
		border: solid 1px var(--color-gray-100);
		border-radius: 8px;
		overflow-y: auto;
		padding: 0.25rem;
	}

	.group.group-small {
		flex-shrink: 0;
	}
</style>
