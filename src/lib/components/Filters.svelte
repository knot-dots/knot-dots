<script lang="ts">
	export let options: string[][];
	export let selectedOptions: string[];
	export let label: string | undefined = undefined;
</script>

{#if label}
	<p>{label}</p>
{/if}
<ul>
	{#each options as [label, value]}
		<li>
			<label>
				<input type="checkbox" name="filters" {value} bind:group={selectedOptions} />
				{label}
			</label>
		</li>
	{/each}
</ul>

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
