<script lang="ts">
	import { _ } from 'svelte-i18n';

	export let options: string[];
	export let selectedCategory: string[];
	export let label: string | undefined = undefined;
</script>


<li>
	{#if label }
		<p>{label}</p>
	{/if}
	<ul>
		{#each options as option}
			<li>
				<label>
					<input type="checkbox" name="filters" value={option} bind:group={selectedCategory} />{$_(
						option
					)}
				</label>
			</li>
		{/each}
	</ul>
</li>

<style>
	p {
		margin-bottom: 0.5rem;
	}
</style>
