<script lang="ts">
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let initialValue: string[] = [];
	export let key: string;
	export let label: string | undefined = undefined;
	export let options: string[][];

	const changeKey = `${key}Changed`;

	let selected = $page.url.searchParams.has(changeKey)
		? $page.url.searchParams.getAll(key)
		: initialValue;

	function apply() {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete(key);
		if (initialValue.length > 0) {
			query.set(changeKey, '');
		}
		selected.forEach((s) => query.append(key, s));
		goto(`?${query.toString()}${$page.url.hash}`, { keepFocus: true });
	}
</script>

<li class="group" transition:slide={{ axis: 'y' }}>
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
</style>
