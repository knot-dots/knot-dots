<script lang="ts">
	import { _ } from 'svelte-i18n';

	export let options: string[];
	export let selectedCategory: string[];

</script>


	{#each options as option}
		<li>
			<label>
				<input type="checkbox" name="filters" value={option} bind:group={selectedCategory} />{$_(
					option
				)}
			</label>
		</li>
	{/each}
