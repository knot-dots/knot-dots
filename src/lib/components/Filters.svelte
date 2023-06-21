<script lang="ts">
	import { _ } from 'svelte-i18n';

	export let options: string[];
	export let selectedOptions: string[];
	export let label: string | undefined = undefined;
</script>

{#if label}
	<p>{label}</p>
{/if}
<ul>
	{#each options as option}
		<li>
			<label>
				<input type="checkbox" name="filters" value={option} bind:group={selectedOptions} />{$_(
					option
				)}
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
