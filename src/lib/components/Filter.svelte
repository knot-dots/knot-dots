<script lang="ts">
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let key: string;
	export let options: string[][];
	export let label: string | undefined = undefined;

	let selected = $page.url.searchParams.getAll(key);

	function apply() {
		const query = new URLSearchParams($page.url.searchParams);
		query.delete(key);
		selected.forEach((s) => query.append(key, s));
		goto(`?${query.toString()}${$page.url.hash}`, { keepFocus: true });
	}
</script>

<li transition:slide={{ axis: 'y' }}>
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
</style>
